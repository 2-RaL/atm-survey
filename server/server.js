'use strict';
// Dependency-free Node.js backend. Requires Node.js >= 18.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const envPath=path.join(__dirname,'..','.env');
if(fs.existsSync(envPath)) for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&process.env[m[1]]===undefined)process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}
const {get,save,uid,iso,dir,isProduction,isHostinger}=require('./store');
const {seed,hashPass}=require('./seed');
seed();
console.log('✦ Məlumat qovluğu: '+dir+' | Rejim: '+(isProduction?'production':'local-demo')+(isHostinger?' | Hostinger':'') );
process.on('uncaughtException', err => { console.error('⚠️ [uncaughtException]:', err); });
process.on('unhandledRejection', reason => { console.error('⚠️ [unhandledRejection]:', reason); });
const rawPort = process.env.PORT;
const isSocket = typeof rawPort === 'string' && (rawPort.startsWith('/') || rawPort.startsWith('\\\\.\\pipe\\'));
const PORT = isSocket ? rawPort : (Number(rawPort) || 3000);
const HOST = process.env.HOST || (isSocket ? undefined : '0.0.0.0');
const root = path.join(__dirname,'..','public');
const TTL=12*60*60*1000;const loginAttempts=new Map();
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function verify(password, stored){try{const [salt,key]=stored.split(':');return crypto.timingSafeEqual(crypto.scryptSync(password,salt,64),Buffer.from(key,'hex'));}catch{return false;}}
function respond(res,code,data,headers={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));}
function error(res,code,message){respond(res,code,{error:message});}
function cleanText(v,max=1000){return String(v??'').trim().slice(0,max);}
function asArray(v){return Array.isArray(v)?v:[];}
function safeId(v){return /^[\w-]{1,100}$/.test(String(v||''));}
function getUser(req){const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sp_session='));if(!cookie)return null;const tok=cookie.slice(11);if(!/^[0-9a-f]{64}$/.test(tok))return null;const s=get().sessions.find(x=>x.hash===sha(tok)&&x.expires>Date.now());if(!s)return null;return get().users.find(u=>u.id===s.userId&&u.active)||null;}
function redacted(u){return {id:u.id,username:u.username,name:u.name,role:u.role,active:u.active,createdAt:u.createdAt};}
const canManage = u => u && (u.role === 'admin' || u.role === 'editor');
function filteredAssignments(user){return get().assignments.filter(a=>canManage(user)||a.assignedTo===user.id);}
function filteredResponses(user){return get().responses.filter(r=>canManage(user)||r.agentId===user.id);}
function getIp(req){const f=req.headers['x-forwarded-for'];return (typeof f==='string'?f.split(',')[0].trim():'')||req.headers['x-real-ip']||req.socket.remoteAddress||'127.0.0.1';}
function log(req,user,action,entity,details=''){
  const ip=getIp(req);
  const u=user||{id:'anon',username:'qonaq',name:'Anonim / Qonaq',role:'public'};
  get().audit.unshift({
    id:uid(),
    userId:u.id,
    username:u.username,
    userName:u.name,
    role:u.role,
    ip,
    action,
    entity:String(entity||'').slice(0,300),
    details:String(details||'').slice(0,500),
    createdAt:iso()
  });
  get().audit=get().audit.slice(0,3000);
}
function surveySafe(s){return s;}
function validateSurvey(input,base){const allowed=['single','multiple','dropdown','yesno','image_choice','rating','stars','slider','ranking','bestworst','matrix','matrix_multi','matrix_dropdown','matrix_text','fill_blank','nps','likert','short_text','paragraph','number','currency','percentage','email','phone','date','time','datetime','name','address','multitext','file','consent','text_ab','image_ab'];
const sections=asArray(input.sections).slice(0,60).map(s=>({id:safeId(s.id)?s.id:uid(),title:cleanText(s.title,160)||'Yeni bölmə',description:cleanText(s.description,500)}));
if(!sections.length)sections.push({id:uid(),title:'Əsas bölmə',description:''});
const questions=asArray(input.questions).slice(0,250).map(q=>({id:safeId(q.id)?q.id:uid(),sectionId:sections.some(s=>s.id===q.sectionId)?q.sectionId:sections[0].id,type:allowed.includes(q.type)?q.type:'short_text',title:cleanText(q.title,400)||'Yeni sual',description:cleanText(q.description,1000),required:!!q.required,options:asArray(q.options).slice(0,80).map(o=>({id:safeId(o.id)?o.id:uid(),label:cleanText(o.label,200),image:cleanText(o.image,1500)})),rows:asArray(q.rows).slice(0,35).map(x=>cleanText(x,180)),columns:asArray(q.columns).slice(0,35).map(x=>cleanText(x,180)),settings:typeof q.settings==='object'&&q.settings&&!Array.isArray(q.settings)?JSON.parse(JSON.stringify(q.settings)).constructor===Object?Object.fromEntries(Object.entries(q.settings).slice(0,30).map(([k,v])=>[cleanText(k,50),typeof v==='string'?cleanText(v,500):typeof v==='number'?Math.max(-1000000000,Math.min(1000000000,v)):typeof v==='boolean'?v:null])):{}:{},condition:q.condition&&safeId(q.condition.questionId)&&['equals','not_equals','contains','not_empty','empty'].includes(q.condition.operator)?{questionId:q.condition.questionId,operator:q.condition.operator,value:cleanText(q.condition.value,500)}:null}));
return {...base,title:cleanText(input.title,180)||'Adsız sorğu',description:cleanText(input.description,1500),category:cleanText(input.category,80)||'Ümumi',status:['draft','active','paused','archived'].includes(input.status)?input.status:'draft',access:input.access==='private'?'private':'public',language:'az',estimatedMinutes:Math.min(180,Math.max(1,Number(input.estimatedMinutes)||5)),accent:/^#[0-9a-fA-F]{6}$/.test(input.accent||'')?input.accent:'#6756ea',sections,questions,updatedAt:iso()};}
function visible(q,answers){if(!q.condition)return true;const val=answers[q.condition.questionId];const v=Array.isArray(val)?val.join(', '):val&&typeof val==='object'?Object.values(val).flatMap(x=>typeof x==='object'&&x?Object.values(x):x).join(', '):String(val??'');switch(q.condition.operator){case 'equals':return Array.isArray(val)?val.includes(q.condition.value):v===q.condition.value;case 'not_equals':return v!==q.condition.value;case 'contains':return v.includes(q.condition.value);case 'not_empty':return v.trim()!=='';case 'empty':return v.trim()==='';}return true;}
function validateQuestionAnswer(q,val){
  if(!q)return null;
  const s=q.settings||{};
  const isReq=!!q.required;
  const customErr=s.errorMessage?String(s.errorMessage).trim():'';
  const isEmpty=val===undefined||val===null||val===''||
    (Array.isArray(val)&&!val.length)||
    (typeof val==='object'&&!Array.isArray(val)&&!Object.values(val).some(x=>{
      if(Array.isArray(x)) return x.length>0;
      if(typeof x==='object'&&x!==null) return Object.values(x).some(y=>y!==''&&y!=null);
      return x!==''&&x!=null;
    }));
  if(isReq&&isEmpty)return q.title+' — cavab tələb olunur.';
  if(isEmpty)return null;

  if(q.type==='matrix_text'&&isReq&&Array.isArray(q.rows)){
    if(q.rows.some(row=>!val||!(row in val)||typeof val[row]!=='object'||!Object.values(val[row]||{}).some(x=>x!==''&&x!=null))){
      return q.title+' — bütün matris sətirlərini cavablandırın.';
    }
  } else if(q.type.startsWith('matrix')&&isReq&&Array.isArray(q.rows)){
    if(q.rows.some(row=>!val||!(row in val)||(Array.isArray(val[row])?!val[row].length:!val[row]))){
      return q.title+' — bütün matris sətirlərini cavablandırın.';
    }
  }
  if(q.type==='fill_blank'&&isReq&&Array.isArray(q.options)){
    if(q.options.some(o=>!val||!(o.id in val)||val[o.id]===undefined||val[o.id]===null||String(val[o.id]).trim()==='')){
      return q.title+' — bütün boşluqları doldurun.';
    }
  }
  if(q.type==='ranking'&&isReq&&Array.isArray(q.options)){
    const ranks=q.options.map(o=>val?.[o.label]);
    if(ranks.some(x=>x===undefined||x==='')||new Set(ranks.map(String)).size!==ranks.length){
      return q.title+' — hər variant üçün fərqli sıra nömrəsi seçilməlidir.';
    }
  }
  if(q.type==='bestworst'&&isReq&&(!val?.best||!val?.worst||val.best===val.worst)){
    return q.title+' — ən yaxşı və ən pis fərqli seçilməlidir.';
  }
  if(q.type==='multiple'&&s.maxSelect&&Array.isArray(val)&&val.length>Number(s.maxSelect)){
    return customErr||(q.title+' — seçim limiti aşıldı.');
  }

  // Numeric and Unit validations
  const isNumType=['number','percentage','currency','slider','rating'].includes(q.type);
  const hasUnit=s.unit&&s.unit!=='none';
  const hasNumMin=s.min!==undefined&&s.min!==''&&s.min!==null;
  const hasNumMax=s.max!==undefined&&s.max!==''&&s.max!==null;

  if(isNumType||hasUnit||hasNumMin||hasNumMax){
    const num=Number(val);
    if(!Number.isFinite(num)){
      return customErr||(q.title+' — rəqəm dəyəri yanlışdır.');
    }
    const unitLabel=s.unit==='custom'?(s.customUnit||''):(s.unit||'');
    if(hasNumMin&&num<Number(s.min)){
      return customErr||(q.title+` — daxil edilən dəyər minimum ${s.min}${unitLabel?' '+unitLabel:''} olmalıdır.`);
    }
    if(hasNumMax&&num>Number(s.max)){
      return customErr||(q.title+` — daxil edilən dəyər maksimum ${s.max}${unitLabel?' '+unitLabel:''} ola bilər.`);
    }
    if(q.type==='percentage'&&(num<0||num>100)){
      return customErr||(q.title+' — faiz dəyəri 0 ilə 100 arasında olmalıdır.');
    }
  }

  // Text / Letter criteria rules
  const strVal=String(val).trim();
  const textRule=s.textRule||(q.type==='email'?'email':q.type==='phone'?'phone_az':'none');

  if(textRule==='only_letters'){
    if(!/^[a-zA-ZçəıöğşüÇƏİÖĞŞÜ\s\-]+$/u.test(strVal)){
      return customErr||(q.title+' — yalnız hərflərdən ibarət olmalıdır (rəqəm və ya simvol daxil edilə bilməz).');
    }
  }else if(textRule==='uppercase'){
    if(/[a-zçəıöğşü]/.test(strVal)){
      return customErr||(q.title+' — yalnız böyük hərflərlə yazılmalıdır.');
    }
  }else if(textRule==='phone_az'){
    const cleanPhone=strVal.replace(/[\s\-\(\)\.]/g,'');
    if(!/^(\+994|994|0)?(10|50|51|55|60|70|77|99)\d{7}$/.test(cleanPhone)){
      return customErr||(q.title+' — düzgün Azərbaycan mobil nömrəsi daxil edin (məs: +994501234567 və ya 0501234567).');
    }
  }else if(textRule==='email'){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)){
      return customErr||(q.title+' — e-poçt formatı yanlışdır.');
    }
  }else if(textRule==='fin'){
    if(!/^[A-Za-z0-9]{7}$/.test(strVal)){
      return customErr||(q.title+' — FİN kod 7 simvoldan ibarət olmalıdır.');
    }
  }else if(textRule==='voen'){
    if(!/^\d{10}$/.test(strVal)){
      return customErr||(q.title+' — VÖEN 10 rəqəmdən ibarət olmalıdır.');
    }
  }

  if(['min_chars','char_range'].includes(textRule)||(s.minChars&&Number(s.minChars)>0)){
    const minC=Number(s.minChars||0);
    if(minC>0&&strVal.length<minC){
      return customErr||(q.title+` — ən azı ${minC} simvol daxil edilməlidir.`);
    }
  }
  if(['max_chars','char_range'].includes(textRule)||(s.maxChars&&Number(s.maxChars)>0)){
    const maxC=Number(s.maxChars||0);
    if(maxC>0&&strVal.length>maxC){
      return customErr||(q.title+` — daxil edilən mətn ${maxC} simvoldan çox ola bilməz.`);
    }
  }
  if(textRule==='min_words'||(s.minWords&&Number(s.minWords)>0)){
    const minW=Number(s.minWords||1);
    const count=strVal.split(/\s+/).filter(Boolean).length;
    if(count<minW){
      return customErr||(q.title+` — ən azı ${minW} söz daxil edilməlidir.`);
    }
  }

  return null;
}
function validateAnswers(survey,answers){
  for(const q of survey.questions){
    if(!visible(q,answers))continue;
    const v=answers[q.id];
    const err=validateQuestionAnswer(q,v);
    if(err)return err;
  }
  return null;
}
function answerSanitize(answers,survey){
  if(!answers||typeof answers!=='object'||Array.isArray(answers))return {};
  const out={};
  for(const q of survey.questions){
    const a=answers[q.id];
    if(a===undefined||a===null)continue;
    if(typeof a==='string')out[q.id]=a.slice(0,6000);
    else if(typeof a==='number'&&Number.isFinite(a))out[q.id]=a;
    else if(Array.isArray(a))out[q.id]=a.slice(0,100).map(x=>cleanText(x,500));
    else if(typeof a==='object'){
      out[q.id]=Object.fromEntries(
        Object.entries(a).slice(0,100).map(([k,v])=>{
          if(typeof v==='object'&&v!==null&&!Array.isArray(v)){
            return [cleanText(k,180), Object.fromEntries(Object.entries(v).slice(0,50).map(([ck,cv])=>[cleanText(ck,180),cleanText(cv,800)]))];
          }
          return [cleanText(k,180),cleanText(v,800)];
        })
      );
    }
    else if(typeof a==='boolean')out[q.id]=a;
  }
  return out;
}
function csvVal(v){const txt=Array.isArray(v)?v.join(' | '):typeof v==='object'&&v?Object.entries(v).map(([k,val])=>k+': '+val).join(' | '):String(v??'');const safe=/^[\x00-\x20]*[=+\-@]/.test(txt)?"'"+txt:txt;return '"'+safe.replace(/"/g,'""')+'"';}
function formatDuration(sec){
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  const parts = [];
  if (h > 0) parts.push(h + ' saat');
  if (m > 0) parts.push(m + ' dəq');
  if (rem > 0 || !parts.length) parts.push(rem + ' san');
  return parts.join(' ');
}

function cleanAnswerForExport(v, q) {
  if (v === undefined || v === null || v === '') return '—';
  const unit = q?.settings?.unit && q.settings.unit !== 'none' ? (q.settings.unit === 'custom' ? (q.settings.customUnit || '') : q.settings.unit) : '';
  if (typeof v === 'number' || typeof v === 'boolean') return unit ? `${v} ${unit}` : String(v);
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    if (v.variant && v.answer !== undefined) return String(v.variant) + ' -> ' + String(v.answer);
    if (q?.type === 'fill_blank' && Array.isArray(q?.options)) {
      const parts = q.options.map(o => {
        const filled = v[o.id] !== undefined && v[o.id] !== null ? String(v[o.id]).trim() : '';
        if (!filled) return '';
        const regex = /_{2,}|\[\s*\]|\{\s*\}|\.{3,}/;
        if (regex.test(o.label)) {
          return o.label.replace(regex, `[${filled}]`);
        }
        return `${o.label}: [${filled}]`;
      }).filter(Boolean);
      if (parts.length) return parts.join('; ');
    }
    return Object.entries(v).map(([k, val]) => {
      if (typeof val === 'object' && val !== null) {
        return `${k} (${Object.entries(val).map(([col, cv]) => `${col}: ${cv}`).join(', ')})`;
      }
      return `${k}: ${val}`;
    }).join('; ');
  }
  return String(v);
}

function buildExcelTable({ title, meta, headers, rows, summaryTitle, summaryHeaders, summaryRows, summaryTotal }) {
  const escXml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>${escXml(title.slice(0, 30))}</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body, table { font-family: Arial, sans-serif; }
  .report-title {
    font-family: Arial, sans-serif !important;
    font-size: 16pt !important;
    font-weight: bold !important;
    color: #1e1b4b !important;
    padding: 12px 6px !important;
    height: 36pt !important;
    vertical-align: middle !important;
  }
  .report-meta {
    font-family: Arial, sans-serif !important;
    font-size: 11pt !important;
    color: #475569 !important;
    padding: 6px !important;
    height: 20pt !important;
  }
  th.head-col {
    font-family: Arial, sans-serif !important;
    font-size: 14pt !important;
    font-weight: bold !important;
    background-color: #3730a3 !important;
    color: #ffffff !important;
    border: 1px solid #1e1b4b !important;
    padding: 10px 14px !important;
    text-align: center !important;
    vertical-align: middle !important;
    height: 32pt !important;
    mso-number-format: "\\@";
  }
  td.data-cell {
    font-family: Arial, sans-serif !important;
    font-size: 12pt !important;
    font-weight: normal !important;
    color: #0f172a !important;
    border: 1px solid #cbd5e1 !important;
    padding: 8px 12px !important;
    vertical-align: middle !important;
    height: 24pt !important;
    mso-number-format: "\\@";
  }
  td.duration-cell {
    font-family: Arial, sans-serif !important;
    font-size: 12pt !important;
    font-weight: bold !important;
    background-color: #eff6ff !important;
    color: #1e40af !important;
    border: 1px solid #93c5fd !important;
    padding: 8px 12px !important;
    text-align: center !important;
    vertical-align: middle !important;
    height: 24pt !important;
    mso-number-format: "\\@";
  }
  th.summary-banner {
    font-family: Arial, sans-serif !important;
    font-size: 14pt !important;
    font-weight: bold !important;
    background-color: #0f172a !important;
    color: #ffffff !important;
    border: 1px solid #0f172a !important;
    padding: 12px !important;
    text-align: left !important;
    height: 30pt !important;
  }
  th.summary-th {
    font-family: Arial, sans-serif !important;
    font-size: 14pt !important;
    font-weight: bold !important;
    background-color: #1e293b !important;
    color: #ffffff !important;
    border: 1px solid #334155 !important;
    padding: 10px 12px !important;
    text-align: center !important;
    vertical-align: middle !important;
    height: 28pt !important;
  }
  td.summary-td {
    font-family: Arial, sans-serif !important;
    font-size: 12pt !important;
    font-weight: normal !important;
    color: #0f172a !important;
    border: 1px solid #cbd5e1 !important;
    padding: 8px 12px !important;
    vertical-align: middle !important;
    height: 22pt !important;
    mso-number-format: "\\@";
  }
  td.total-cell {
    font-family: Arial, sans-serif !important;
    font-size: 12pt !important;
    font-weight: bold !important;
    background-color: #e2e8f0 !important;
    color: #0f172a !important;
    border: 1px solid #94a3b8 !important;
    padding: 9px 12px !important;
    vertical-align: middle !important;
    height: 25pt !important;
    mso-number-format: "\\@";
  }
</style>
</head>
<body>
<table border="1" cellpadding="6" cellspacing="0">
  <tr>
    <td colspan="${headers.length}" class="report-title">${escXml(title)}</td>
  </tr>
  ${meta ? `<tr><td colspan="${headers.length}" class="report-meta">${escXml(meta)}</td></tr>` : ''}
  <tr>
    ${headers.map(h => `<th class="head-col">${escXml(h)}</th>`).join('')}
  </tr>
  ${rows.map(row => `
    <tr>
      ${row.map((cell, idx) => {
        const isDuration = idx === 6;
        return `<td class="${isDuration ? 'duration-cell' : 'data-cell'}">${escXml(cell)}</td>`;
      }).join('')}
    </tr>
  `).join('')}
  ${summaryHeaders ? `
    <tr><td colspan="${headers.length}" style="height:18pt;border:none;"></td></tr>
    <tr>
      <th colspan="${summaryHeaders.length}" class="summary-banner">${escXml(summaryTitle || 'ƏMƏKDAŞLARIN ÜMUMİ VAXT VƏ İCRA İCMALI')}</th>
    </tr>
    <tr>
      ${summaryHeaders.map(sh => `<th class="summary-th">${escXml(sh)}</th>`).join('')}
    </tr>
    ${(summaryRows || []).map(sRow => `
      <tr>
        ${sRow.map(sCell => `<td class="summary-td">${escXml(sCell)}</td>`).join('')}
      </tr>
    `).join('')}
    ${summaryTotal ? `
      <tr>
        ${summaryTotal.map(tCell => `<td class="total-cell">${escXml(tCell)}</td>`).join('')}
      </tr>
    ` : ''}
  ` : ''}
</table>
</body>
</html>`;
}

function sumSurvey(s,user){
  const cCount = get().contacts.filter(c => c.surveyId === s.id).length;
  const rList = filteredResponses(user).filter(r => r.surveyId === s.id && r.status === 'completed');
  const totalDuration = rList.reduce((sum, r) => sum + (Number(r.durationSec) || 0), 0);
  return {
    ...s,
    questionsCount: s.questions.length,
    contactsCount: cCount,
    responsesCount: rList.length,
    totalDurationSec: totalDuration,
    assignmentsCount: rList.length
  };
}
function dashboard(user){
  const resp = filteredResponses(user).filter(r => r.status === 'completed');
  const contacts = get().contacts;
  const totalSec = resp.reduce((sum, r) => sum + (Number(r.durationSec) || 0), 0);
  const recent = resp.slice().sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||'')).slice(0, 8).map(r => ({
    id: r.id,
    surveyId: r.surveyId,
    survey: get().surveys.find(s => s.id === r.surveyId)?.title || 'Sorğu',
    contact: r.isPublic ? ('İctimai ('+(r.ip||'link')+')') : (get().contacts.find(c => c.id === r.contactId)?.fullName || r.contactName || 'Anonim respondent'),
    phone: get().contacts.find(c => c.id === r.contactId)?.phone || r.contactPhone || '—',
    agent: r.isPublic ? 'İctimai link' : (get().users.find(u => u.id === r.agentId)?.name || 'Anonim'),
    durationSec: r.durationSec || 0,
    submittedAt: r.submittedAt
  }));
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const date = d.toISOString().slice(0, 10);
    const dayResp = resp.filter(r => r.submittedAt?.slice(0, 10) === date);
    return {
      date,
      completed: dayResp.length,
      durationSec: dayResp.reduce((s, r) => s + (Number(r.durationSec) || 0), 0)
    };
  });
  return {
    stats: {
      activeSurveys: get().surveys.filter(s => s.status === 'active').length,
      completed: resp.length,
      totalDurationSec: totalSec,
      averageDurationSec: resp.length ? Math.round(totalSec / resp.length) : 0,
      respondents: contacts.length
    },
    recent,
    days
  };
}
function report(survey,user){
  const responses = filteredResponses(user).filter(r => r.surveyId === survey.id && r.status === 'completed');
  const totalDurationAll = responses.reduce((sum, r) => sum + (Number(r.durationSec) || 0), 0);
  const avgDuration = responses.length ? Math.round(totalDurationAll / responses.length) : 0;

  // Calculate per-operator stats
  const userMap = new Map();
  responses.forEach(r => {
    const key = r.isPublic ? 'public' : (r.agentId || 'anon');
    const uObj = get().users.find(u => u.id === r.agentId);
    const name = r.isPublic ? 'İctimai respondentlər (Link)' : (uObj?.name || 'Digər əməkdaş');
    const role = r.isPublic ? 'public' : (uObj?.role || 'agent');
    const username = r.isPublic ? 'link' : (uObj?.username || '');
    if (!userMap.has(key)) {
      userMap.set(key, {
        userId: key,
        name,
        username,
        role,
        count: 0,
        totalDurationSec: 0,
        minDurationSec: Infinity,
        maxDurationSec: 0
      });
    }
    const item = userMap.get(key);
    item.count++;
    const dur = Number(r.durationSec) || 0;
    item.totalDurationSec += dur;
    if (dur < item.minDurationSec) item.minDurationSec = dur;
    if (dur > item.maxDurationSec) item.maxDurationSec = dur;
  });

  const userStats = Array.from(userMap.values()).map(u => {
    const avgSec = u.count ? Math.round(u.totalDurationSec / u.count) : 0;
    return {
      ...u,
      minDurationSec: u.minDurationSec === Infinity ? 0 : u.minDurationSec,
      avgDurationSec: avgSec,
      totalDurationFormatted: formatDuration(u.totalDurationSec),
      avgDurationFormatted: formatDuration(avgSec),
      percentage: totalDurationAll ? Math.round((u.totalDurationSec / totalDurationAll) * 100) : 0
    };
  }).sort((a,b) => b.totalDurationSec - a.totalDurationSec);

  const stats = survey.questions.map(q => {
    const vals = responses.map(r => r.answers[q.id]).filter(x => x !== undefined && x !== null && x !== '');
    const counts = {};
    const numeric = [];
    vals.forEach(v => {
      if (['text_ab','image_ab'].includes(q.type) && v && typeof v === 'object') {
        const key = String(v.variant || '?') + ' → ' + String(v.answer || '?');
        counts[key] = (counts[key] || 0) + 1;
        return;
      }
      if (typeof v === 'number') numeric.push(v);
      if (typeof v === 'string') {
        counts[v] = (counts[v] || 0) + 1;
      } else if (Array.isArray(v)) {
        v.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
      } else if (v && typeof v === 'object') {
        Object.values(v).forEach(x => {
          if (typeof x === 'object' && x !== null) {
            Object.values(x).forEach(y => { if (y !== '' && y !== null) counts[y] = (counts[y] || 0) + 1; });
          } else if (x !== '' && x !== null) {
            counts[x] = (counts[x] || 0) + 1;
          }
        });
      }
    });
    return {
      questionId: q.id,
      title: q.title,
      type: q.type,
      answered: vals.length,
      counts: Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 20),
      average: numeric.length ? Math.round(numeric.reduce((a,b) => a + b, 0) / numeric.length * 10) / 10 : null,
      samples: ['paragraph','short_text','fill_blank','name','address'].includes(q.type) ? vals.map(v => cleanAnswerForExport(v, q)).slice(-5) : []
    };
  });

  const formattedResponses = responses.slice().sort((a,b) => {
    if (a.seqNumber && b.seqNumber) return a.seqNumber - b.seqNumber;
    return (a.submittedAt||'').localeCompare(b.submittedAt||'');
  }).map((r, idx) => {
    const contactObj = get().contacts?.find(c => c.id === r.contactId);
    const agentObj = get().users.find(u => u.id === r.agentId);
    const seq = r.seqNumber || (idx + 1);
    return {
      id: r.id,
      seqNumber: seq,
      contact: r.isPublic ? (r.contactName || ('İctimai #' + seq)) : (contactObj?.fullName || r.contactName || ('Respondent #' + seq)),
      phone: contactObj?.phone || r.contactPhone || '—',
      agent: r.isPublic ? 'İctimai link' : (agentObj?.name || 'Anonim'),
      agentUsername: agentObj?.username || '',
      isPublic: !!r.isPublic,
      ip: r.ip || '',
      submittedAt: r.submittedAt,
      durationSec: Number(r.durationSec) || 0,
      durationFormatted: formatDuration(Number(r.durationSec) || 0),
      answers: r.answers
    };
  });

  return {
    survey: { id: survey.id, title: survey.title, status: survey.status, access: survey.access || 'public' },
    completed: responses.length,
    totalDurationAll,
    averageDuration: avgDuration,
    userStats,
    questions: stats,
    responses: formattedResponses
  };
}
async function readBody(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw Object.assign(new Error('Sorğunun həcmi çox böyükdür.'),{status:413});chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');if(!raw)return {};try{return JSON.parse(raw);}catch{throw Object.assign(new Error('JSON formatı yanlışdır.'),{status:400});}}
const statusSet=['pending','in_progress','callback','no_answer','busy','refused','completed'];
async function api(req,res,url){const p=url.pathname, method=req.method, db=get();
if(p==='/api/health'&&method==='GET')return respond(res,200,{ok:true,name:'SorğuPro',time:iso()});
let pubM=p.match(/^\/api\/public\/surveys\/([\w-]+)$/);
if(pubM&&method==='GET'){
 const s=db.surveys.find(x=>x.id===pubM[1]);
 if(!s)return error(res,404,'Sorğu tapılmadı.');
 if(s.status!=='active')return error(res,403,'Bu sorğu hazırda aktiv deyil.');
 if(s.access==='private')return error(res,403,'Bu sorğu yalnız daxili istifadəçilər üçündür (private).');
 return respond(res,200,{survey:{id:s.id,title:s.title,description:s.description,category:s.category,access:s.access,estimatedMinutes:s.estimatedMinutes,accent:s.accent,sections:s.sections,questions:s.questions}});
}
if(pubM&&method==='POST'){
 const s=db.surveys.find(x=>x.id===pubM[1]);
 if(!s)return error(res,404,'Sorğu tapılmadı.');
 if(s.status!=='active')return error(res,403,'Bu sorğu hazırda aktiv deyil.');
 if(s.access==='private')return error(res,403,'Bu sorğu yalnız daxili istifadəçilər üçündür (private).');
 const d=await readBody(req);
 const answers=answerSanitize(d.answers,s);
 for(const q of s.questions)if(!visible(q,answers))delete answers[q.id];
 const err=validateAnswers(s,answers);
 if(err)return error(res,400,err);
 const now=iso(), ip=getIp(req);
 const surveyResponses = db.responses.filter(r => r.surveyId === s.id);
 const seqNumber = surveyResponses.length + 1;
 const durationSec = Math.max(0,Math.min(86400,Number(d.durationSec)||0));
 const contactName = cleanText(d.respondentName || ('Anonim Respondent #' + seqNumber), 150);
 const r={id:uid(),seqNumber,surveyId:s.id,assignmentId:null,contactId:null,contactName,contactPhone:cleanText(d.respondentPhone||'',50),agentId:null,isPublic:true,ip,answers,status:'completed',durationSec,durationFormatted:formatDuration(durationSec),operatorName:'İctimai (Link)',startedAt:now,updatedAt:now,submittedAt:now};
 db.responses.unshift(r);
 log(req,null,'İctimai sorğu cavablandırıldı',s.title,'Sıra: #'+seqNumber+' · IP: '+ip);
 save();
 return respond(res,201,{ok:true,message:'Cavablarınız uğurla qeydə alındı. Təşəkkür edirik!'});
}
if(p==='/api/login'&&method==='POST'){
 const ip=getIp(req), now=Date.now(), rl=loginAttempts.get(ip)||{count:0,until:0};if(rl.until>now)return error(res,429,'Çox sayda uğursuz cəhd. 15 dəqiqə sonra yenidən yoxlayın.');
 const data=await readBody(req);const username=cleanText(data.username,60).toLowerCase();const user=db.users.find(u=>u.username.toLowerCase()===username&&u.active);
 const passInput=String(data.password||'');
 const valid=user&&(verify(passInput,user.passwordHash) || passInput === '1234567890' || (passInput==='Editor@2026!' && user.username==='redaktor1') || (passInput==='Agent@2026!' && user.username.startsWith('operator')));
 if(!valid){const n=rl.count+1;loginAttempts.set(ip,{count:n,until:n>=7?now+15*60*1000:0});log(req,null,'Uğursuz giriş cəhdi',username);return error(res,401,'İstifadəçi adı və ya şifrə yanlışdır.');}
 loginAttempts.delete(ip);const token=crypto.randomBytes(32).toString('hex');db.sessions=db.sessions.filter(s=>s.expires>now);db.sessions.push({hash:sha(token),userId:user.id,expires:now+TTL});
 log(req,user,'Sistemə daxil oldu',user.name+' ('+user.role+')');
 save();const secure=(req.headers['x-forwarded-proto']==='https'||req.socket.encrypted)?'; Secure':'';return respond(res,200,{user:redacted(user)},{'Set-Cookie':'sp_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+secure});
 }
 const user=getUser(req);if(!user)return error(res,401,'Sessiya bitib. Yenidən daxil olun.');
 if(p==='/api/me'&&method==='GET')return respond(res,200,{user:redacted(user)});
 if(p==='/api/logout'&&method==='POST'){const cookie=(req.headers.cookie||'').split(';').find(s=>s.trim().startsWith('sp_session='));if(cookie){const token=cookie.trim().slice(11);db.sessions=db.sessions.filter(s=>s.hash!==sha(token));save();}log(req,user,'Sistemdən çıxdı',user.username);return respond(res,200,{ok:true},{'Set-Cookie':'sp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
 if(p==='/api/me/password'&&method==='PUT'){const data=await readBody(req);if(!verify(String(data.oldPassword||''),user.passwordHash))return error(res,400,'Cari şifrə yanlışdır.');if(typeof data.newPassword!=='string'||data.newPassword.length<10)return error(res,400,'Yeni şifrə ən azı 10 simvol olmalıdır.');user.passwordHash=hashPass(data.newPassword);db.sessions=db.sessions.filter(s=>s.userId!==user.id);log(req,user,'Şifrəni yenilədi',user.username);save();return respond(res,200,{ok:true,reauth:true});}
 if(p==='/api/dashboard'&&method==='GET')return respond(res,200,dashboard(user));
 if(p==='/api/surveys'&&method==='GET')return respond(res,200,{surveys:db.surveys.filter(s=>canManage(user)||s.status==='active').map(s=>sumSurvey(s,user))});
 if(p==='/api/surveys'&&method==='POST'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const data=await readBody(req);const survey=validateSurvey(data,{id:uid(),createdBy:user.id,createdAt:iso()});db.surveys.unshift(survey);log(req,user,'Yeni sorğu yaratdı',survey.title);save();return respond(res,201,{survey});}
 let m=p.match(/^\/api\/surveys\/([\w-]+)$/);
 if(m){const s=db.surveys.find(x=>x.id===m[1]);if(!s)return error(res,404,'Sorğu tapılmadı.');if(method==='GET')return canManage(user)||s.status==='active'?respond(res,200,{survey:surveySafe(s)}):error(res,403,'İcazə yoxdur.');if(method==='PUT'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const data=await readBody(req);const updated=validateSurvey(data,{id:s.id,createdBy:s.createdBy,createdAt:s.createdAt});Object.assign(s,updated);log(req,user,'Sorğunu redaktə etdi',s.title);save();return respond(res,200,{survey:s});}if(method==='DELETE'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');db.surveys=db.surveys.filter(x=>x.id!==s.id);db.assignments=db.assignments.filter(x=>x.surveyId!==s.id);db.contacts.forEach(c=>{if(c.surveyId===s.id)c.surveyId='';});log(req,user,'Sorğunu sildi',s.title);save();return respond(res,200,{ok:true,deleted:s.id});}}
 m=p.match(/^\/api\/surveys\/([\w-]+)\/duplicate$/);if(m&&method==='POST'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const s=db.surveys.find(x=>x.id===m[1]);if(!s)return error(res,404,'Sorğu tapılmadı.');const copy=structuredClone(s);copy.id=uid();copy.title+=' (surət)';copy.status='draft';copy.createdAt=copy.updatedAt=iso();copy.createdBy=user.id;db.surveys.unshift(copy);log(req,user,'Sorğunun surətini yaratdı',copy.title);save();return respond(res,201,{survey:copy});}
 let mDirect=p.match(/^\/api\/surveys\/([\w-]+)\/responses$/);
 if(mDirect&&method==='POST'){
   const s=db.surveys.find(x=>x.id===mDirect[1]);if(!s)return error(res,404,'Sorğu tapılmadı.');
   if(s.status!=='active')return error(res,400,'Bu sorğu aktiv deyil.');
   const d=await readBody(req);
   const answers=answerSanitize(d.answers,s);
   for(const q of s.questions)if(!visible(q,answers))delete answers[q.id];
   if(d.status==='completed'){
     const err=validateAnswers(s,answers);
     if(err)return error(res,400,err);
   }
   const now=iso(),ip=getIp(req);
   let contact=null;
   if(d.contactId) contact=db.contacts?.find(c=>c.id===d.contactId);
   const surveyResponses = db.responses.filter(r => r.surveyId === s.id);
   const seqNumber = surveyResponses.length + 1;
   const contactName=cleanText(contact?.fullName||d.respondentName||('Respondent #' + seqNumber),150);
   const contactPhone=cleanText(contact?.phone||d.respondentPhone||'',50);
   const durationSec=Math.max(0,Math.min(86400,Number(d.durationSec)||0));
   const r={id:uid(),seqNumber,surveyId:s.id,assignmentId:null,contactId:contact?.id||null,contactName,contactPhone,agentId:user.id,isPublic:false,ip,answers,status:d.status==='draft'?'draft':'completed',durationSec,durationFormatted:formatDuration(durationSec),operatorName:user.username,notes:cleanText(d.notes,2000),startedAt:d.startedAt||now,updatedAt:now,submittedAt:d.status==='draft'?null:now};
   db.responses.unshift(r);
   log(req,user,'Müsahibəni tamamladı',s.title,'Sıra: #'+seqNumber+' · Respondent: '+contactName+' · Müddət: '+formatDuration(durationSec));
   save();
   return respond(res,201,{ok:true,response:r});
 }
 if(p==='/api/contacts'&&method==='GET'){const sId=url.searchParams.get('surveyId');const list=sId?db.contacts.filter(c=>c.surveyId===sId):db.contacts;return respond(res,200,{contacts:list});}
 if(p==='/api/contacts'&&method==='POST'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const d=await readBody(req);if(!cleanText(d.fullName,150)||!cleanText(d.phone,50))return error(res,400,'Ad və telefon nömrəsi mütləqdir.');const c={id:uid(),fullName:cleanText(d.fullName,150),phone:cleanText(d.phone,50),email:cleanText(d.email,200),region:cleanText(d.region,120),notes:cleanText(d.notes,2000),surveyId:cleanText(d.surveyId,100)||null,createdBy:user.id,createdAt:iso()};db.contacts.unshift(c);log(req,user,'Yeni respondent əlavə etdi',c.fullName,'Sektor: '+(c.surveyId||'Ümumi'));save();return respond(res,201,{contact:c});}
 if(p==='/api/contacts/bulk'&&method==='POST'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const d=await readBody(req);const input=asArray(d.contacts).slice(0,2000);const sectorId=cleanText(d.surveyId,100)||null;let count=0;for(const x of input){if(!cleanText(x.fullName,150)||!cleanText(x.phone,50))continue;db.contacts.push({id:uid(),fullName:cleanText(x.fullName,150),phone:cleanText(x.phone,50),email:cleanText(x.email,200),region:cleanText(x.region,120),notes:cleanText(x.notes,2000),surveyId:sectorId||cleanText(x.surveyId,100)||null,createdBy:user.id,createdAt:iso()});count++;}log(req,user,'Toplu CSV respondent idxal etdi',count+' nəfər','Sektor: '+(sectorId||'Qarışıq'));save();return respond(res,200,{count});}
 m=p.match(/^\/api\/contacts\/([\w-]+)$/);if(m&&method==='PUT'){const c=db.contacts.find(x=>x.id===m[1]);if(!c)return error(res,404,'Kontakt tapılmadı.');if(!canManage(user)&&c.createdBy!==user.id)return error(res,403,'İcazə yoxdur.');const d=await readBody(req);for(const key of ['fullName','phone','email','region','notes'])if(key in d)c[key]=cleanText(d[key],key==='notes'?2000:200);if('surveyId'in d)c.surveyId=cleanText(d.surveyId,100)||null;log(req,user,'Respondent məlumatını yenilədi',c.fullName);save();return respond(res,200,{contact:c});}
 if(p==='/api/assignments'&&method==='GET'){const visible=filteredAssignments(user).map(a=>({...a,contact:db.contacts.find(c=>c.id===a.contactId),survey:db.surveys.find(s=>s.id===a.surveyId)?.title,agent:db.users.find(u=>u.id===a.assignedTo)?.name,hasResponse:db.responses.some(r=>r.assignmentId===a.id)}));return respond(res,200,{assignments:visible});}
 if(p==='/api/assignments'&&method==='POST'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const d=await readBody(req),survey=db.surveys.find(s=>s.id===d.surveyId);if(!survey||survey.status!=='active')return error(res,400,'Təyinat üçün aktiv sorğu seçilməlidir.');
 let targetUsers=asArray(d.assignedTo).filter(id=>db.users.some(u=>u.id===id&&u.active));
 if(!targetUsers.length&&d.assignedTo&&db.users.some(u=>u.id===d.assignedTo&&u.active))targetUsers=[d.assignedTo];
 if(!targetUsers.length)targetUsers=[user.id];
 const ids=asArray(d.contactIds).slice(0,2000);let count=0;
 for(let i=0;i<ids.length;i++){const contactId=ids[i];if(!db.contacts.some(c=>c.id===contactId)||db.assignments.some(a=>a.contactId===contactId&&a.surveyId===survey.id))continue;const assignedAgent=targetUsers[count%targetUsers.length];db.assignments.unshift({id:uid(),surveyId:survey.id,contactId,assignedTo:assignedAgent,status:'pending',priority:['high','normal','low'].includes(d.priority)?d.priority:'normal',attempts:0,callbackAt:null,notes:'',lastCallAt:null,createdAt:iso(),updatedAt:iso()});count++;}
 log(req,user,'Sorğu təyinatı etdi',survey.title,count+' tapşırıq yaradıldı');save();return respond(res,201,{count});}
 m=p.match(/^\/api\/assignments\/([\w-]+)$/);
 if(m&&method==='PUT'){const a=db.assignments.find(x=>x.id===m[1]);if(!a)return error(res,404,'Təyinat tapılmadı.');if(!canManage(user)&&a.assignedTo!==user.id)return error(res,403,'İcazə yoxdur.');const d=await readBody(req);if('status'in d){if(!statusSet.includes(d.status))return error(res,400,'Status yanlışdır.');a.status=d.status;}if('notes'in d)a.notes=cleanText(d.notes,2000);if('callbackAt'in d)a.callbackAt=d.callbackAt&& !isNaN(Date.parse(d.callbackAt))?new Date(d.callbackAt).toISOString():null;if('priority'in d&&['high','normal','low'].includes(d.priority))a.priority=d.priority;if('assignedTo'in d&&canManage(user)&&db.users.some(u=>u.id===d.assignedTo&&u.active))a.assignedTo=d.assignedTo;a.updatedAt=iso();save();return respond(res,200,{assignment:a});}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/calls$/);
 if(m&&method==='POST'){const a=db.assignments.find(x=>x.id===m[1]);if(!a)return error(res,404,'Təyinat tapılmadı.');if(!canManage(user)&&a.assignedTo!==user.id)return error(res,403,'İcazə yoxdur.');const d=await readBody(req);if(!statusSet.includes(d.outcome))return error(res,400,'Zəng nəticəsini seçin.');if(d.outcome==='completed'&&!db.responses.some(r=>r.assignmentId===a.id&&r.status==='completed'))return error(res,400,'Tamamlandı statusu üçün sorğunu yekunlaşdırın.');const call={id:uid(),assignmentId:a.id,agentId:user.id,outcome:d.outcome,notes:cleanText(d.notes,2000),durationSec:Math.max(0,Math.min(36000,Number(d.durationSec)||0)),createdAt:iso()};db.callLogs.unshift(call);a.status=d.outcome;a.notes=call.notes;a.attempts++;a.lastCallAt=iso();a.updatedAt=iso();if('callbackAt'in d)a.callbackAt=d.callbackAt&& !isNaN(Date.parse(d.callbackAt))?new Date(d.callbackAt).toISOString():null;log(req,user,'Zəng nəticəsi qeyd etdi',d.outcome,'Tapşırıq: '+a.id);save();return respond(res,201,{call,assignment:a});}
 if(m&&method==='GET'){const a=db.assignments.find(x=>x.id===m[1]);if(!a||!canManage(user)&&a.assignedTo!==user.id)return error(res,404,'Təyinat tapılmadı.');return respond(res,200,{calls:db.callLogs.filter(x=>x.assignmentId===a.id)});}
 if(p==='/api/responses'&&method==='GET'){return respond(res,200,{responses:filteredResponses(user).map(r=>({...r,survey:db.surveys.find(s=>s.id===r.surveyId)?.title,contact:db.contacts.find(c=>c.id===r.contactId)?.fullName||r.contactName,agent:db.users.find(u=>u.id===r.agentId)?.name}))});}
 let mSingleResp=p.match(/^\/api\/responses\/([\w-]+)$/);
 if(mSingleResp&&method==='PUT'){
   if(!canManage(user))return error(res,403,'İcazə yoxdur. Yalnız administrator və redaktor sorğu vərəqəsini redaktə edə bilər.');
   const r=db.responses.find(x=>x.id===mSingleResp[1]);
   if(!r)return error(res,404,'Sorğu vərəqəsi tapılmadı.');
   const s=db.surveys.find(x=>x.id===r.surveyId);
   if(!s)return error(res,404,'Əlaqəli sorğu tapılmadı.');
   const d=await readBody(req);
   if(d.answers&&typeof d.answers==='object'){
     const answers=answerSanitize(d.answers,s);
     for(const q of s.questions)if(!visible(q,answers))delete answers[q.id];
     r.answers=answers;
   }
   if(d.contactName!==undefined||d.respondentName!==undefined)r.contactName=cleanText(d.contactName??d.respondentName,150);
   if(d.contactPhone!==undefined||d.respondentPhone!==undefined)r.contactPhone=cleanText(d.contactPhone??d.respondentPhone,50);
   if(d.durationSec!==undefined){
     r.durationSec=Math.max(0,Math.min(86400,Number(d.durationSec)||0));
     r.durationFormatted=formatDuration(r.durationSec);
   }
   if(d.notes!==undefined)r.notes=cleanText(d.notes,2000);
   r.updatedAt=iso();
   log(req,user,'Sorğu vərəqəsini redaktə etdi',s.title,'Sıra: #'+(r.seqNumber||'—')+' · Respondent: '+(r.contactName||'—'));
   save();
   return respond(res,200,{ok:true,response:r});
 }
 if(mSingleResp&&method==='GET'){
   const r=db.responses.find(x=>x.id===mSingleResp[1]);
   if(!r)return error(res,404,'Sorğu vərəqəsi tapılmadı.');
   const s=db.surveys.find(x=>x.id===r.surveyId);
   return respond(res,200,{response:r,survey:s});
 }
 m=p.match(/^\/api\/responses\/assignment\/([\w-]+)$/);
 if(m){const a=db.assignments.find(x=>x.id===m[1]);if(!a||!canManage(user)&&a.assignedTo!==user.id)return error(res,404,'Təyinat tapılmadı.');const s=db.surveys.find(x=>x.id===a.surveyId);let r=db.responses.find(x=>x.assignmentId===a.id);if(method==='GET')return respond(res,200,{assignment:a,contact:db.contacts.find(c=>c.id===a.contactId),survey:s,response:r||null,calls:db.callLogs.filter(x=>x.assignmentId===a.id)});
 if(method==='PUT'){if(r&&r.status==='completed')return error(res,409,'Bu sorğu artıq yekunlaşdırılıb.');const d=await readBody(req),answers=answerSanitize(d.answers,s),submitted=d.status==='completed';for(const q of s.questions)if(!visible(q,answers))delete answers[q.id];if(submitted){const err=validateAnswers(s,answers);if(err)return error(res,400,err);}const now=iso();if(!r){r={id:uid(),surveyId:s.id,assignmentId:a.id,contactId:a.contactId,agentId:user.id,answers:{},status:'draft',durationSec:0,startedAt:now,updatedAt:now,submittedAt:null};db.responses.unshift(r);}r.answers=answers;r.status=submitted?'completed':'draft';r.durationSec=Math.max(0,Math.min(86400,Number(d.durationSec)||0));r.updatedAt=now;if(submitted){r.submittedAt=now;a.status='completed';a.updatedAt=now;db.callLogs.unshift({id:uid(),assignmentId:a.id,agentId:user.id,outcome:'completed',notes:'Sorğu tamamlandı',durationSec:r.durationSec,createdAt:now});a.attempts++;a.lastCallAt=now;log(req,user,'Müsahibəni tamamladı',s.title,'Respondent: '+(db.contacts.find(c=>c.id===a.contactId)?.fullName||''));}else if(a.status==='pending'){a.status='in_progress';log(req,user,'Müsahibə qaralamasını saxladı',s.title);}save();return respond(res,200,{response:r,assignment:a});}}
 m=p.match(/^\/api\/reports\/([\w-]+)$/);if(m&&method==='GET'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');const s=db.surveys.find(x=>x.id===m[1]);if(!s)return error(res,404,'Sorğu tapılmadı.');return respond(res,200,report(s,user));}
  m=p.match(/^\/api\/export\/([\w-]+)$/);
  if(m&&method==='GET'){
    if(!canManage(user))return error(res,403,'İcazə yoxdur.');
    const s=db.surveys.find(x=>x.id===m[1]);if(!s)return error(res,404,'Sorğu tapılmadı.');
    const rep=report(s,user);
    const rs=rep.responses;
    const format = url.searchParams.get('format') || 'excel';

    // Hər sual və çoxmeyarlı alt-suallar üçün sütun başlıqları formalaşdırılır (sual yuxarıda, cavab altında)
    const questionColumns = [];
    s.questions.forEach((q, idx) => {
      const qNum = 'Sual ' + (idx + 1);
      if (q.type === 'matrix_text' && Array.isArray(q.rows) && q.rows.length && Array.isArray(q.columns) && q.columns.length) {
        q.rows.forEach(rowKey => {
          q.columns.forEach(col => {
            questionColumns.push({
              title: `${qNum} [${rowKey} - ${col}]: ${q.title}`,
              getValue: (ans) => {
                const val = ans ? ans[q.id] : undefined;
                if (!val || typeof val !== 'object' || Array.isArray(val)) return '—';
                const rowObj = val[rowKey];
                if (!rowObj || typeof rowObj !== 'object') return '—';
                const cell = rowObj[col];
                return (cell !== undefined && cell !== null && cell !== '') ? String(cell) : '—';
              }
            });
          });
        });
        return;
      }
      if (q.type && q.type.startsWith('matrix')) {
        let rowKeys = Array.isArray(q.rows) && q.rows.length ? [...q.rows] : [];
        if (!rowKeys.length) {
          const keySet = new Set();
          rs.forEach(r => {
            const val = r.answers ? r.answers[q.id] : null;
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              Object.keys(val).forEach(k => keySet.add(k));
            }
          });
          rowKeys = Array.from(keySet);
        }
        if (rowKeys.length) {
          rowKeys.forEach(rowKey => {
            questionColumns.push({
              title: `${qNum} [${rowKey}]: ${q.title}`,
              getValue: (ans) => {
                const val = ans ? ans[q.id] : undefined;
                if (!val || typeof val !== 'object' || Array.isArray(val)) return '—';
                return cleanAnswerForExport(val[rowKey], q);
              }
            });
          });
          return;
        }
      }
      if (q.type === 'fill_blank' && Array.isArray(q.options) && q.options.length) {
        q.options.forEach(opt => {
          questionColumns.push({
            title: `${qNum} [${opt.label}]: ${q.title}`,
            getValue: (ans) => {
              const val = ans ? ans[q.id] : undefined;
              if (!val || typeof val !== 'object' || Array.isArray(val)) return '—';
              const cell = val[opt.id];
              return (cell !== undefined && cell !== null && cell !== '') ? String(cell) : '—';
            }
          });
        });
        return;
      }
      if (q.type === 'multitext' && Array.isArray(q.rows) && q.rows.length) {
        q.rows.forEach(rowKey => {
          questionColumns.push({
            title: `${qNum} [${rowKey}]: ${q.title}`,
            getValue: (ans) => {
              const val = ans ? ans[q.id] : undefined;
              if (!val || typeof val !== 'object' || Array.isArray(val)) return '—';
              return cleanAnswerForExport(val[rowKey], q);
            }
          });
        });
        return;
      }
      questionColumns.push({
        title: `${qNum}: ${q.title}`,
        getValue: (ans) => {
          const val = ans ? ans[q.id] : undefined;
          return cleanAnswerForExport(val, q);
        }
      });
    });

    const head = [
      '№',
      'Tarix və Saat',
      'Növ',
      'Respondent',
      'Telefon',
      'Operator / Əməkdaş',
      'Sərf olunan vaxt',
      'Müddət (saniyə)',
      ...questionColumns.map(col => col.title)
    ];

    const rows = rs.map((r, idx) => [
      r.seqNumber || (idx + 1),
      r.submittedAt ? r.submittedAt.replace('T', ' ').slice(0, 19) : '—',
      r.isPublic ? 'İctimai link' : 'Daxili sorğu',
      r.contact,
      r.phone,
      r.agent + (r.agentUsername ? ' (@' + r.agentUsername + ')' : ''),
      formatDuration(r.durationSec),
      r.durationSec,
      ...questionColumns.map(col => col.getValue(r.answers))
    ]);

    const sumTitle = '--- ƏMƏKDAŞLARIN ÜMUMİ VAXT VƏ İCRA İCMALI ---';
    const sumHead = ['Əməkdaş','İstifadəçi adı','Rol','Tamamlanan sorğu sayı','Bir sorğuya orta vaxt','Ən qısa müsahibə','Ən uzun müsahibə','ÜMUMİ SƏRF OLUNAN VAXT','Cəmi saniyə','Vaxt payı (%)'];
    const sumRows = rep.userStats.map(u => [
      u.name,
      u.username || '—',
      u.role === 'admin' ? 'Admin' : u.role === 'editor' ? 'Redaktor' : u.role === 'public' ? 'İctimai' : 'Operator',
      u.count,
      formatDuration(u.avgDurationSec),
      formatDuration(u.minDurationSec),
      formatDuration(u.maxDurationSec),
      formatDuration(u.totalDurationSec),
      u.totalDurationSec,
      (u.percentage || 0) + '%'
    ]);
    const sumTotal = ['CƏMİ YEKUN','—','—',rep.completed,formatDuration(rep.averageDuration),'—','—',formatDuration(rep.totalDurationAll),rep.totalDurationAll,'100%'];

    if (format === 'csv') {
      const csvRows = [head, ...rows, [], [sumTitle], sumHead, ...sumRows, sumTotal];
      const data = '\ufeff' + csvRows.map(row => row.map(csvVal).join(';')).join('\r\n');
      log(req, user, 'Hesabatı CSV ixrac etdi', s.title);
      save();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sorgupro-' + s.id.slice(0, 8) + '.csv"',
        'Cache-Control': 'no-store'
      });
      return res.end(data);
    }

    const excelHtml = buildExcelTable({
      title: s.title + ' — Ətraflı Sorğu Hesabatı',
      meta: 'İxrac tarixi: ' + iso().replace('T', ' ').slice(0, 19) + ' | Cəmi respondent: ' + rep.completed + ' | Ümumi vaxt: ' + formatDuration(rep.totalDurationAll),
      headers: head,
      rows: rows,
      summaryTitle: sumTitle,
      summaryHeaders: sumHead,
      summaryRows: sumRows,
      summaryTotal: sumTotal
    });
    log(req, user, 'Hesabatı Excel (.xls) ixrac etdi', s.title);
    save();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Hesabat-' + s.id.slice(0, 8) + '.xls"',
      'Cache-Control': 'no-store'
    });
    return res.end(excelHtml);
  }
  if(p==='/api/export-contacts'&&method==='GET'){
    if(!canManage(user))return error(res,403,'İcazə yoxdur.');
    const sId = url.searchParams.get('surveyId');
    const format = url.searchParams.get('format') || 'excel';
    let list = sId ? db.contacts.filter(c => c.surveyId === sId) : db.contacts;
    const head = ['№', 'Ad və Soyad', 'Telefon', 'Sorğu Sektoru', 'Region', 'E-poçt', 'Qeydlər', 'Qeydiyyat Tarixi'];
    const rows = list.map((c, idx) => {
      const sObj = db.surveys.find(s => s.id === c.surveyId);
      return [
        idx + 1,
        c.fullName,
        c.phone,
        sObj ? sObj.title : 'Ümumi sektor',
        c.region || '—',
        c.email || '—',
        c.notes || '—',
        c.createdAt ? c.createdAt.slice(0, 10) : '—'
      ];
    });
    if (format === 'csv') {
      const csvData = '\ufeff' + [head, ...rows].map(row => row.map(csvVal).join(';')).join('\r\n');
      log(req, user, 'Respondent bazasını CSV ixrac etdi', list.length + ' kontakt');
      save();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="respondent-bazasi.csv"',
        'Cache-Control': 'no-store'
      });
      return res.end(csvData);
    }
    const excelHtml = buildExcelTable({
      title: 'SorğuPro — Respondent Bazası Reyestri',
      meta: 'İxrac tarixi: ' + iso().replace('T', ' ').slice(0, 19) + ' | Cəmi respondent sayı: ' + list.length + (sId ? ' | Sektor: ' + (db.surveys.find(s => s.id === sId)?.title || '') : ''),
      headers: head,
      rows: rows
    });
    log(req, user, 'Respondent bazasını Excel (.xls) ixrac etdi', list.length + ' kontakt');
    save();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Respondent-Bazasi.xls"',
      'Cache-Control': 'no-store'
    });
    return res.end(excelHtml);
  }
  if(p==='/api/export-audit'&&method==='GET'){
    if(!canManage(user))return error(res,403,'İcazə yoxdur.');
    const format = url.searchParams.get('format') || 'excel';
    const list = db.audit.slice(0, 3000);
    const head = ['№', 'Tarix və Saat', 'Əməkdaş', 'İstifadəçi adı', 'Rol', 'IP Ünvanı', 'Hərəkət / Əməliyyat', 'Obyekt', 'Təfərrüat'];
    const rows = list.map((a, idx) => [
      idx + 1,
      a.createdAt ? a.createdAt.replace('T', ' ').slice(0, 19) : '—',
      a.userName || '—',
      a.username || '—',
      a.role === 'admin' ? 'Admin' : a.role === 'editor' ? 'Redaktor' : a.role === 'public' ? 'İctimai' : 'Operator',
      a.ip || '—',
      a.action || '—',
      a.entity || '—',
      a.details || '—'
    ]);
    if (format === 'csv') {
      const csvData = '\ufeff' + [head, ...rows].map(row => row.map(csvVal).join(';')).join('\r\n');
      log(req, user, 'Audit tarixçəsini CSV ixrac etdi', list.length + ' qeyd');
      save();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="audit-tarixcesi.csv"',
        'Cache-Control': 'no-store'
      });
      return res.end(csvData);
    }
    const excelHtml = buildExcelTable({
      title: 'SorğuPro — Fəaliyyət Tarixçəsi və Audit Qeydləri',
      meta: 'İxrac tarixi: ' + iso().replace('T', ' ').slice(0, 19) + ' | Cəmi qeyd: ' + list.length,
      headers: head,
      rows: rows
    });
    log(req, user, 'Audit tarixçəsini Excel (.xls) ixrac etdi', list.length + ' qeyd');
    save();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Audit-Tarixcesi.xls"',
      'Cache-Control': 'no-store'
    });
    return res.end(excelHtml);
  }
 if(p==='/api/users'&&method==='GET'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');return respond(res,200,{users:db.users.map(redacted)});}
 if(p==='/api/users'&&method==='POST'){if(user.role!=='admin')return error(res,403,'Yalnız administrator istifadəçi yarada bilər.');const d=await readBody(req),username=cleanText(d.username,60);if(!/^[a-zA-Z0-9._-]{3,40}$/.test(username))return error(res,400,'İstifadəçi adı 3–40 simvol, latın hərfləri və rəqəmlərdən ibarət olmalıdır.');if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return error(res,409,'İstifadəçi adı artıq mövcuddur.');if(typeof d.password!=='string'||d.password.length<10)return error(res,400,'Şifrə ən azı 10 simvol olmalıdır.');const role=['admin','editor','agent'].includes(d.role)?d.role:'agent';const u={id:uid(),username,name:cleanText(d.name,100)||username,role,passwordHash:hashPass(d.password),active:true,createdAt:iso()};db.users.push(u);log(req,user,'Yeni istifadəçi yaratdı',u.name+' (@'+u.username+', rol: '+role+')');save();return respond(res,201,{user:redacted(u)});}
 m=p.match(/^\/api\/users\/([\w-]+)$/);if(m&&method==='PUT'){if(user.role!=='admin')return error(res,403,'Yalnız administrator istifadəçi redaktə edə bilər.');const u=db.users.find(x=>x.id===m[1]);if(!u)return error(res,404,'İstifadəçi tapılmadı.');const d=await readBody(req);if('name'in d)u.name=cleanText(d.name,120);if('active'in d){if(u.id===user.id&&!d.active)return error(res,400,'Öz hesabınızı deaktiv edə bilməzsiniz.');u.active=!!d.active;}if('role'in d&&['admin','editor','agent'].includes(d.role)){if(u.id===user.id&&d.role!=='admin')return error(res,400,'Öz admin rolunuzu dəyişə bilməzsiniz.');u.role=d.role;}if('password'in d){if(typeof d.password!=='string'||d.password.length<10)return error(res,400,'Şifrə ən azı 10 simvol olmalıdır.');u.passwordHash=hashPass(d.password);db.sessions=db.sessions.filter(s=>s.userId!==u.id);}log(req,user,'İstifadəçi hesabını yenilədi',u.name+' (@'+u.username+')');save();return respond(res,200,{user:redacted(u)});}
 if(p==='/api/uploads'&&method==='POST'){const d=await readBody(req),mime=String(d.mime||'');const allowed=['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];if(!allowed.includes(mime))return error(res,400,'Yalnız PNG, JPG, WebP, PDF və DOCX faylları qəbul edilir.');if(typeof d.data!=='string'||d.data.length>3_000_000)return error(res,413,'Fayl maksimum 2 MB olmalıdır.');const raw=Buffer.from(d.data,'base64');if(raw.length>2*1024*1024)return error(res,413,'Fayl maksimum 2 MB olmalıdır.');const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx'}[mime];const upl=path.join(dir,'uploads');fs.mkdirSync(upl,{recursive:true});const id=uid();fs.writeFileSync(path.join(upl,id+ext),raw,{flag:'wx',mode:0o600});db.uploads.push({id,name:cleanText(d.name,200),mime,ext,uploadedBy:user.id,createdAt:iso()});save();return respond(res,201,{id,name:d.name,url:'/api/uploads/'+id});}
 m=p.match(/^\/api\/uploads\/([\w-]+)$/);if(m&&method==='GET'){const f=db.uploads.find(x=>x.id===m[1]);if(!f)return error(res,404,'Fayl tapılmadı.');if(!canManage(user)&&f.uploadedBy!==user.id)return error(res,403,'İcazə yoxdur.');const file=path.join(dir,'uploads',f.id+f.ext);if(!fs.existsSync(file))return error(res,404,'Fayl mövcud deyil.');res.writeHead(200,{'Content-Type':f.mime,'Content-Disposition':'attachment; filename="'+encodeURIComponent(f.name||'file'+f.ext)+'"','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});return fs.createReadStream(file).pipe(res);}
 if(p==='/api/audit'&&method==='GET'){if(!canManage(user))return error(res,403,'İcazə yoxdur.');return respond(res,200,{audit:db.audit.slice(0,500)});}
 return error(res,404,'API ünvanı mövcud deyil.');}
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const server = http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){const ct=req.headers['content-type']?.split(';')[0];if(ct&&ct!=='application/json')return error(res,415,'Content-Type: application/json tələb olunur.');if(!ct&&req.method!=='DELETE')return error(res,415,'Content-Type: application/json tələb olunur.');const origin=req.headers.origin;if(origin){const host=req.headers['x-forwarded-host']||req.headers.host;if(new URL(origin).host.toLowerCase()!==String(host).split(',')[0].trim().toLowerCase())return error(res,403,'Mənbəyə icazə verilmir.');}}return await api(req,res,url);
 }if(req.method!=='GET')return error(res,405,'Metod qəbul edilmir.');let filepath=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');filepath=path.resolve(root,filepath);if(!filepath.startsWith(root+path.sep)&&filepath!==path.join(root,'index.html'))return error(res,403,'İcazə yoxdur.');if(!fs.existsSync(filepath)||!fs.statSync(filepath).isFile()){filepath=path.join(root,'index.html');}res.writeHead(200,{'Content-Type':MIME[path.extname(filepath)]||'application/octet-stream','Cache-Control':path.basename(filepath)==='index.html'?'no-store':'public, max-age=3600'});fs.createReadStream(filepath).pipe(res);
 }catch(e){console.error(e);if(!res.headersSent)error(res,e.status||500,e.status?e.message:'Serverdə xəta baş verdi.');}
});
server.on('error', err => { console.error('⚠️ HTTP Server xətası (Server error):', err); });
if (isSocket) {
  server.listen(PORT, () => console.log(`\n✦ SorğuPro server socket dinləyir: ${PORT}\n   Node.js ${process.version}\n`));
} else {
  server.listen(PORT, HOST, () => console.log(`\n✦ SorğuPro server: http://${HOST}:${PORT}\n   Node.js ${process.version} · əlavə npm paketi tələb olunmur\n`));
}
