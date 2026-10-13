'use strict';
const $=(sel,root=document)=>root.querySelector(sel),$$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=(v,short=false)=>v?new Date(v).toLocaleDateString('az-AZ',short?{day:'2-digit',month:'short'}:{day:'2-digit',month:'short',year:'numeric'}):'—';
const fmtTime=v=>v?new Date(v).toLocaleString('az-AZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const datetimeLocal=value=>{if(!value)return '';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const pl=n=>new Intl.NumberFormat('az-AZ').format(Number(n)||0);
const delay=ms=>new Promise(r=>setTimeout(r,ms));

function formatTimeSpent(totalSeconds){
  const s=Math.max(0,Math.round(Number(totalSeconds)||0));
  const hours=Math.floor(s/3600);
  const minutes=Math.floor((s%3600)/60);
  const seconds=s%60;
  const parts=[];
  if(hours>0)parts.push(`${hours} saat`);
  if(minutes>0)parts.push(`${minutes} dəq`);
  if(seconds>0||!parts.length)parts.push(`${seconds} san`);
  return parts.join(' ');
}

function formatDurationClock(sec){
  const s=Math.max(0,Math.round(Number(sec)||0));
  const h=Math.floor(s/3600);
  const m=Math.floor((s%3600)/60);
  const rem=s%60;
  if(h>0)return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(rem).padStart(2,'0');
  return String(m).padStart(2,'0')+':'+String(rem).padStart(2,'0');
}

const icons={
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  surveys:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  contacts:'<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c0-2 6-2 6 0M15 10h3M15 14h3"/>',
  reports:'<path d="M4 20V10M10 20V4M16 20v-8M22 20V7"/>',
  team:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-5 12-5 12 0v2M16 7a3 3 0 0 1 0 6M17 16c3 0 5 1 5 4"/>',
  settings:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M18.4 5.6l-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="m15 18-6-6 6-6"/>',chevron:'<path d="m9 18 6-6-6-6"/>',down:'<path d="m6 9 6 6 6-6"/>',
  search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',logout:'<path d="M10 17l5-5-5-5m5 5H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
  phone:'<path d="M8 3H5a2 2 0 0 0-2 2c0 9 7 16 16 16a2 2 0 0 0 2-2v-3l-5-2-2 3a15 15 0 0 1-7-7l3-2z"/>',check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-5 12-5 12 0v2M17 8h4M19 6v4"/>',chart:'<path d="M3 20h18M5 16l5-6 4 3 6-8"/>',
  star:'<path d="m12 2 3.1 6.2 6.9 1-5 4.8 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5-4.8 6.9-1z"/>',layers:'<rect x="3" y="3" width="18" height="5" rx="1"/><rect x="3" y="10" width="18" height="5" rx="1"/><rect x="3" y="17" width="18" height="5" rx="1"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h1M4 12h1M4 18h1"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  edit:'<path d="M4 20h5L20 9l-5-5L4 15v5zM13 6l5 5"/>',trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  save:'<path d="M4 3h14l3 3v15H3V3zM7 3v7h10V3M7 21v-8h10v8"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',upload:'<path d="M12 21V8m-5 5 5-5 5 5M4 6V3h16v3"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',
  filter:'<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',shield:'<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/><path d="m8 12 3 3 5-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/>',refresh:'<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>',
  grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',sort:'<path d="M7 4v16m-4-4 4 4 4-4M17 20V4m-4 4 4-4 4 4"/>',
  file:'<path d="M5 2h10l5 5v15H5zM15 2v5h5"/>',lock:'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2.3c-2 1.7-2 2-2 3M12 18h.01"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
};
const ico=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.grid}</svg>`;

const TYPES=[
 ['Seçim','single','Tək seçim','list'],['Seçim','multiple','Çoxlu seçim','check'],['Seçim','dropdown','Açılan siyahı','down'],['Seçim','yesno','Bəli / Xeyr','check'],['Seçim','image_choice','Şəkillə seçim','grid'],
 ['Qiymətləndirmə','rating','Reytinq şkalası','chart'],['Qiymətləndirmə','stars','Ulduz reytinqi','star'],['Qiymətləndirmə','slider','Sürüşdürmə','sort'],['Qiymətləndirmə','ranking','Sıralama','sort'],['Qiymətləndirmə','bestworst','Ən yaxşı / ən pis','layers'],['Qiymətləndirmə','matrix','Matris / reytinq cədvəli','grid'],['Qiymətləndirmə','matrix_multi','Çoxseçimli matris','grid'],['Qiymətləndirmə','matrix_dropdown','Matris / açılan menyu','grid'],['Qiymətləndirmə','matrix_text','Mətnli matris cədvəli','grid'],['Qiymətləndirmə','nps','Net Promoter Score','chart'],['Qiymətləndirmə','likert','Likert şkalası','chart'],
 ['Mətn və rəqəm','short_text','Qısa mətn','edit'],['Mətn və rəqəm','paragraph','Şərh / geniş mətn','edit'],['Mətn və rəqəm','fill_blank','Boşluq doldurma','edit'],['Mətn və rəqəm','number','Rəqəm','sort'],['Mətn və rəqəm','currency','Məbləğ (AZN)','sort'],['Mətn və rəqəm','percentage','Faiz','chart'],['Mətn və rəqəm','multitext','Çoxlu mətn sahəsi','layers'],
 ['Şəxsi məlumat','name','Ad və soyad','users'],['Şəxsi məlumat','email','E-poçt','mail'],['Şəxsi məlumat','phone','Telefon','phone'],['Şəxsi məlumat','address','Ünvan','contacts'],['Şəxsi məlumat','date','Tarix','calendar'],['Şəxsi məlumat','time','Saat','clock'],['Şəxsi məlumat','datetime','Tarix və saat','calendar'],['Şəxsi məlumat','file','Fayl yükləmə','upload'],
 ['Digər','consent','Razılıq','shield'],['Digər','text_ab','Mətn A/B testi','layers'],['Digər','image_ab','Şəkil A/B testi','grid']
];
const typeLabel=t=>TYPES.find(x=>x[1]===t)?.[2]||t;
const groups=[...new Set(TYPES.map(x=>x[0]))];
const OUTCOME={completed:'Tamamlandı',active:'Aktiv',draft:'Qaralama',paused:'Dayandırılıb',archived:'Arxiv',pending:'Gözləyir'};
const outcomeBadge=(v)=>`<span class="badge ${esc(v)}">${esc(OUTCOME[v]||v)}</span>`;
const initials=n=>String(n||'S').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
const mkId=()=>globalThis.crypto?.randomUUID?.()||'id'+Math.random().toString(36).slice(2);

const isAdmin=()=>state.user?.role==='admin';
const isLeader=()=>state.user?.role==='admin'||state.user?.role==='editor';
const roleTitle=r=>r==='admin'?'Sistem administratoru':r==='editor'?'Redaktor':'Sorğu operatoru';
const roleBadge=r=>`<span class="role-badge ${esc(r||'agent')}">${esc(r==='admin'?'Administrator':r==='editor'?'Redaktor':r==='agent'?'Operator':'Qonaq')}</span>`;

const MEASURE_UNITS=[
  {group:'Ümumi',id:'none',label:'Təyin edilməyib (Ölçü vahidsiz)',short:''},
  {group:'Çəki və Kütlə',id:'kq',label:'kq (Kiloqram)',short:'kq'},
  {group:'Çəki və Kütlə',id:'ton',label:'ton (Ton)',short:'ton'},
  {group:'Çəki və Kütlə',id:'q',label:'q (Qram)',short:'q'},
  {group:'Çəki və Kütlə',id:'mq',label:'mq (Milliqram)',short:'mq'},
  {group:'Həcm və Maye',id:'litr',label:'litr (Litr)',short:'litr'},
  {group:'Həcm və Maye',id:'ml',label:'ml (Millilitr)',short:'ml'},
  {group:'Həcm və Maye',id:'m3',label:'m³ (Kub metr)',short:'m³'},
  {group:'Uzunluq və Sahə',id:'metr',label:'metr (Metr)',short:'m'},
  {group:'Uzunluq və Sahə',id:'sm',label:'sm (Santimetr)',short:'sm'},
  {group:'Uzunluq və Sahə',id:'km',label:'km (Kilometr)',short:'km'},
  {group:'Uzunluq və Sahə',id:'mm',label:'mm (Millimetr)',short:'mm'},
  {group:'Uzunluq və Sahə',id:'m2',label:'m² (Kvadrat metr)',short:'m²'},
  {group:'Uzunluq və Sahə',id:'ha',label:'ha (Hektar)',short:'ha'},
  {group:'Miqdar və Say',id:'eded',label:'ədəd (Ədəd)',short:'ədəd'},
  {group:'Miqdar və Say',id:'nefer',label:'nəfər (Nəfər)',short:'nəfər'},
  {group:'Miqdar və Say',id:'qutu',label:'qutu (Qutu / Paket)',short:'qutu'},
  {group:'Miqdar və Say',id:'dest',label:'dəst (Dəst)',short:'dəst'},
  {group:'Miqdar və Say',id:'kise',label:'kisə (Kisə)',short:'kisə'},
  {group:'Maliyyə və Valyuta',id:'azn',label:'AZN (Manat ₼)',short:'AZN'},
  {group:'Maliyyə və Valyuta',id:'usd',label:'USD (Dollar $)',short:'USD'},
  {group:'Maliyyə və Valyuta',id:'eur',label:'EUR (Avro €)',short:'EUR'},
  {group:'Faiz',id:'faiz',label:'% (Faiz)',short:'%'},
  {group:'Zaman',id:'deqiqe',label:'dəqiqə (Dəqiqə)',short:'dəq.'},
  {group:'Zaman',id:'saat',label:'saat (Saat)',short:'saat'},
  {group:'Zaman',id:'gun',label:'gün (Gün)',short:'gün'},
  {group:'Zaman',id:'ay',label:'ay (Ay)',short:'ay'},
  {group:'Zaman',id:'il',label:'il (İl)',short:'il'},
  {group:'Digər',id:'custom',label:'Digər / Xüsusi fərdi ölçü vahidi...',short:''}
];

const TEXT_RULES=[
  {id:'none',label:'Standart sərbəst mətn (Məhdudiyyətsiz)'},
  {id:'only_letters',label:'Yalnız hərflər (Ad, soyad, şəhər — rəqəm və simvol olmaz)'},
  {id:'uppercase',label:'Böyük hərflərlə məcburi (CAPITAL / BÖYÜK HƏRFLƏR)'},
  {id:'phone_az',label:'Azərbaycan mobil nömrəsi (+994 / 050, 051, 055, 070, 077, 099, 010)'},
  {id:'email',label:'Düzgün e-poçt formatı (ad@domain.com)'},
  {id:'fin',label:'FİN kod (Şəxsiyyət vəsiqəsi — 7 simvol)'},
  {id:'voen',label:'VÖEN (Vergi nömrəsi — 10 rəqəm)'},
  {id:'min_chars',label:'Minimum simvol sayı (Mətn uzunluğu həddi)'},
  {id:'max_chars',label:'Maksimum simvol sayı'},
  {id:'char_range',label:'Simvol sayı aralığı (Min - Maks simvol)'},
  {id:'min_words',label:'Minimum söz sayı (Geniş rəy və təkliflər üçün)'}
];

const DEMO_IMG_A = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="%23e0e7ff"/><circle cx="160" cy="75" r="35" fill="%236366f1"/><text x="160" y="83" fill="%23ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">A</text><text x="160" y="140" fill="%234338ca" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle">Dizayn Variantı A</text></svg>';
const DEMO_IMG_B = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="%23fef3c7"/><circle cx="160" cy="75" r="35" fill="%23f59e0b"/><text x="160" y="83" fill="%23ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">B</text><text x="160" y="140" fill="%23b45309" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle">Dizayn Variantı B</text></svg>';
const DEMO_IMG_C = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="%23dcfce7"/><circle cx="160" cy="75" r="35" fill="%2310b981"/><text x="160" y="83" fill="%23ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">C</text><text x="160" y="140" fill="%23047857" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle">Dizayn Variantı C</text></svg>';

function getQuestionUnit(q){
  if(!q?.settings)return '';
  const u=q.settings.unit;
  if(!u||u==='none')return q.type==='currency'?'AZN':q.type==='percentage'?'%':'';
  if(u==='custom')return q.settings.customUnit||'';
  const found=MEASURE_UNITS.find(x=>x.id===u);
  return found?.short||u;
}

function validateQuestionAnswer(q,val){
  if(!q)return '';
  const s=q.settings||{};
  const isReq=!!q.required;
  const customErr=s.errorMessage?.trim();
  const unit=getQuestionUnit(q);

  const isEmpty=val===undefined||val===null||val===''||
    (Array.isArray(val)&&!val.length)||
    (typeof val==='object'&&!Array.isArray(val)&&!Object.values(val).some(x=>{
      if(Array.isArray(x)) return x.length>0;
      if(typeof x==='object'&&x!==null) return Object.values(x).some(y=>y!==''&&y!=null);
      return x!==''&&x!=null;
    }));

  if(isReq&&isEmpty){
    return q.title+' — bu suala cavab verilməlidir.';
  }
  if(isEmpty)return '';

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
    return q.title+' — ən yaxşı və ən pis variantlar fərqli seçilməlidir.';
  }
  if(q.type==='multiple'&&s.maxSelect&&Array.isArray(val)&&val.length>Number(s.maxSelect)){
    return customErr||`${q.title} — ən çox ${s.maxSelect} seçim edə bilərsiniz.`;
  }

  // Numeric and Unit validations
  const isNumType=['number','currency','percentage','slider','rating'].includes(q.type);
  const hasUnit=s.unit&&s.unit!=='none';
  const hasNumMin=s.min!==undefined&&s.min!==''&&s.min!==null;
  const hasNumMax=s.max!==undefined&&s.max!==''&&s.max!==null;

  if(isNumType||hasUnit||hasNumMin||hasNumMax){
    const num=Number(val);
    if(!Number.isFinite(num)){
      return customErr||`${q.title} — düzgün rəqəm dəyəri daxil edilməlidir.`;
    }
    if(hasNumMin&&num<Number(s.min)){
      return customErr||`${q.title} — daxil edilən dəyər minimum ${s.min}${unit?' '+unit:''} olmalıdır.`;
    }
    if(hasNumMax&&num>Number(s.max)){
      return customErr||`${q.title} — daxil edilən dəyər maksimum ${s.max}${unit?' '+unit:''} ola bilər.`;
    }
    if(q.type==='percentage'&&(num<0||num>100)){
      return customErr||`${q.title} — faiz dəyəri 0 ilə 100 arasında olmalıdır.`;
    }
  }

  // Text / Letter criteria rules
  const strVal=String(val).trim();
  const textRule=s.textRule||(q.type==='email'?'email':q.type==='phone'?'phone_az':'none');

  if(textRule==='only_letters'){
    if(!/^[a-zA-ZçəıöğşüÇƏİÖĞŞÜ\s\-]+$/u.test(strVal)){
      return customErr||`${q.title} — yalnız hərflərdən ibarət olmalıdır (rəqəm və ya simvol daxil edilə bilməz).`;
    }
  }else if(textRule==='uppercase'){
    if(/[a-zçəıöğşü]/.test(strVal)){
      return customErr||`${q.title} — yalnız böyük hərflərlə yazılmalıdır.`;
    }
  }else if(textRule==='phone_az'){
    const cleanPhone=strVal.replace(/[\s\-\(\)\.]/g,'');
    if(!/^(\+994|994|0)?(10|50|51|55|60|70|77|99)\d{7}$/.test(cleanPhone)){
      return customErr||`${q.title} — düzgün Azərbaycan mobil nömrəsi daxil edin (məs: +994501234567 və ya 0501234567).`;
    }
  }else if(textRule==='email'){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)){
      return customErr||`${q.title} — düzgün e-poçt formatı daxil edin (məsələn: ad@domain.com).`;
    }
  }else if(textRule==='fin'){
    if(!/^[A-Za-z0-9]{7}$/.test(strVal)){
      return customErr||`${q.title} — FİN kod 7 simvoldan ibarət olmalıdır (hərf və rəqəm).`;
    }
  }else if(textRule==='voen'){
    if(!/^\d{10}$/.test(strVal)){
      return customErr||`${q.title} — VÖEN 10 rəqəmdən ibarət olmalıdır.`;
    }
  }

  if(['min_chars','char_range'].includes(textRule)||(s.minChars&&Number(s.minChars)>0)){
    const minC=Number(s.minChars||0);
    if(minC>0&&strVal.length<minC){
      return customErr||`${q.title} — ən azı ${minC} simvol daxil edilməlidir.`;
    }
  }
  if(['max_chars','char_range'].includes(textRule)||(s.maxChars&&Number(s.maxChars)>0)){
    const maxC=Number(s.maxChars||0);
    if(maxC>0&&strVal.length>maxC){
      return customErr||`${q.title} — daxil edilən mətn ${maxC} simvoldan çox ola bilməz.`;
    }
  }
  if(textRule==='min_words'||(s.minWords&&Number(s.minWords)>0)){
    const minW=Number(s.minWords||1);
    const count=strVal.split(/\s+/).filter(Boolean).length;
    if(count<minW){
      return customErr||`${q.title} — ən azı ${minW} söz daxil edilməlidir.`;
    }
  }

  return '';
}

let state={
  user:null,page:'dashboard',surveys:[],contacts:[],responses:[],users:[],audit:[],dashboard:null,
  filter:'',statusFilter:'all',selectedSector:'all',selectedContacts:new Set(),builder:null,builderQ:null,builderSection:null,
  propOpen:false,preview:false,interview:null,interviewIndex:0,interviewDone:false,report:null,
  reportSurveyId:null,reportTab:'responses',mobile:false,dirty:false,
  publicSurvey:null,publicSurveyAnswers:{},publicSurveyIndex:0,publicSurveyDone:false,
  publicSurveyLoading:false,publicSurveyError:'',publicSurveyStartTime:0
};

async function request(url,opts={}){
  const res=await fetch(url,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
  let data;const ct=res.headers.get('content-type')||'';
  if(ct.includes('application/json'))data=await res.json();else data=await res.text();
  if(!res.ok){
    if(res.status===401&&state.user&&state.page!=='public_survey'){state.user=null;renderLogin();}
    throw new Error(data?.error||`HTTP ${res.status}`);
  }
  return data;
}
const api=(url,data,method='POST')=>request(url,{method,body:JSON.stringify(data)});

function notify(text,bad=false){
  const div=document.createElement('div');div.className='toast'+(bad?' error':'');
  div.innerHTML=ico(bad?'info':'check',17)+'<span>'+esc(text)+'</span>';
  $('#toast-root').appendChild(div);
  setTimeout(()=>div.remove(),4200);
}

async function init(){
  const hash=location.hash||'';
  const pubMatch=hash.match(/^#\/s\/([\w-]+)/);
  if(pubMatch){
    await loadPublicSurvey(pubMatch[1]);
    return;
  }
  try{
    const {user}=await request('/api/me');
    state.user=user;
    await refresh();
    route();
  }catch{
    renderLogin();
  }
}

async function refresh(){
  const load=[request('/api/surveys'),request('/api/dashboard')];
  if(isLeader()){
    load.push(request('/api/users'));
    load.push(request('/api/audit'));
  }
  const results=await Promise.all(load);
  state.surveys=results[0].surveys;
  state.contacts=[];
  state.dashboard=results[1];
  state.users=results[2]?.users||[];
  state.audit=results[3]?.audit||[];
}

function renderLogin(){
  state.page='login';
  $('#app').innerHTML=`
    <div class="login-page">
      <div class="login-visual">
        <div class="brand">
          <span class="brand-icon">${ico('spark',23)}</span>
          <span><span class="brand-name">SorğuPro</span><span class="brand-desc">SURVEY INTELLIGENCE PLATFORM</span></span>
        </div>
        <div class="login-promo">
          <div class="login-kicker">Yeni nəsil sorğu idarəetməsi</div>
          <h1>Hər cavab<br><em>dəyərli məlumatdır.</em></h1>
          <p>Telefon sorğuları, respondent sektorları, birbaşa müsahibə və hər əməkdaş üzrə dəqiq vaxt analitikası.</p>
          <div class="login-graphic">
            <div class="mini-bars">${[32,49,41,65,54,76,68,92].map(x=>`<i style="height:${x}%"></i>`).join('')}</div>
            <div class="login-metric"><strong>360°</strong><small>Dəqiq Vaxt İcmalı<br>Sektorlaşdırılmış Baza</small></div>
          </div>
        </div>
        <div class="login-visual-foot">
          <span><i class="dot-live"></i>İnteqrə sorğu mühiti</span>
          <span>© 2026 SorğuPro</span>
        </div>
      </div>
      <div class="login-form-side">
        <form class="login-form" id="login-form">
          <div class="login-splash">${ico('lock',27)}</div>
          <h2>Xoş gəlmisiniz!</h2>
          <p>İş mühitinizə keçmək üçün hesab məlumatlarınızla daxil olun.</p>
          <div class="field">
            <label>İstifadəçi adı</label>
            <div class="input-icon">${ico('users',17)}<input name="username" autocomplete="username" placeholder="İstifadəçi adınızı daxil edin" required autofocus></div>
          </div>
          <div class="field">
            <label>Şifrə</label>
            <div class="input-icon">${ico('lock',17)}<input type="password" name="password" autocomplete="current-password" placeholder="Şifrənizi daxil edin" required></div>
          </div>
          <div id="login-error"></div>
          <button class="btn btn-primary btn-lg w100" style="margin-top:12px" type="submit">Sistemə daxil ol ${ico('arrow',17)}</button>
          <div class="login-demo">
            <b>Demo girişlər (bütün şifrələr: 1234567890):</b><br>
            <div style="cursor:pointer;margin-top:4px" onclick="document.querySelector('[name=username]').value='admin';document.querySelector('[name=password]').value='1234567890'">• Admin: <b>admin</b> / <b>1234567890</b></div>
            <div style="cursor:pointer;margin-top:2px" onclick="document.querySelector('[name=username]').value='redaktor1';document.querySelector('[name=password]').value='1234567890'">• Redaktor: <b>redaktor1</b> / <b>1234567890</b></div>
            <div style="cursor:pointer;margin-top:2px" onclick="document.querySelector('[name=username]').value='operator1';document.querySelector('[name=password]').value='1234567890'">• Operator 1: <b>operator1</b> / <b>1234567890</b></div>
            <div style="cursor:pointer;margin-top:2px" onclick="document.querySelector('[name=username]').value='operator2';document.querySelector('[name=password]').value='1234567890'">• Operator 2: <b>operator2</b> / <b>1234567890</b></div>
          </div>
          <div class="login-copy">Qorunan giriş · Rol əsaslı icazələr · Təhlükəsiz sessiya</div>
        </form>
      </div>
    </div>`;
}

const NAV=[
  ['dashboard','İdarə paneli','dashboard'],
  ['surveys','Sorğular','surveys'],
  ['reports','Hesabatlar','reports'],
  ['team','Operatorlar','team'],
  ['audit','Fəaliyyət tarixçəsi','clock'],
  ['settings','Parametrlər','settings']
];

function navigate(page){
  if(state.dirty&&['builder','interview'].includes(state.page)&&page!==state.page&&!confirm('Yadda saxlanmamış dəyişikliklər var. Səhifəni tərk etmək istəyirsiniz?'))return;
  state.page=page;state.filter='';state.statusFilter='all';state.dirty=false;state.preview=false;
  location.hash='#/'+page;render();window.scrollTo(0,0);
}

function route(){
  const hash=location.hash||'';
  const pubMatch=hash.match(/^#\/s\/([\w-]+)/);
  if(pubMatch){loadPublicSurvey(pubMatch[1]);return;}
  const p=hash.match(/^#\/([\w-]+)/)?.[1]||(isLeader()?'dashboard':'surveys');
  if(state.user){
    const allowed=['dashboard','surveys','reports','team','audit','settings','builder','interview'];
    let target=allowed.includes(p)?p:(isLeader()?'dashboard':'surveys');
    if(target==='builder'&&!state.builder){
      target=isLeader()?'dashboard':'surveys';
      if(location.hash!=='#/'+target)location.hash='#/'+target;
    }
    if(target==='interview'&&!state.interview){
      const restored=restoreInterviewDraft();
      if(restored){
        state.page='interview';
        render();
        notify('Qaralama müsahibə bərpa edildi. Ən son qaldığınız yerdən davam edirsiniz.');
        return;
      }
      target=isLeader()?'dashboard':'surveys';
      if(location.hash!=='#/'+target)location.hash='#/'+target;
    }
    state.page=target;
    render();
  }
}

function shell(){
  const leader=isLeader();
  const p=state.page;
  const nav=NAV.filter(([id])=>leader||!['reports','team','audit'].includes(id));
  const label=NAV.find(([id])=>id===p)?.[1]||(p==='builder'?'Sorğu konstruktoru':p==='interview'?'Müsahibə forması':'');
  return `
    <div class="shell">
      <div class="mobile-scrim ${state.mobile?'show':''}" data-action="close-mobile"></div>
      <aside class="sidebar ${state.mobile?'open':''}">
        <div class="side-brand">
          <div class="brand">
            <span class="brand-icon">${ico('spark',22)}</span>
            <span><span class="brand-name">SorğuPro</span><span class="brand-desc">INTELLIGENCE STUDIO</span></span>
          </div>
        </div>
        <nav class="nav-box">
          <div class="nav-label">İŞ MÜHİTİ</div>
          ${nav.map(([id,text,icon])=>`
            <button class="nav-link ${p===id?'active':''}" data-action="nav" data-page="${id}" style="width:100%;border:0;text-align:left">
              ${ico(icon,18)}<span>${text}</span>
            </button>
          `).join('')}
          <div class="nav-label">SİSTEM</div>
          <div class="nav-link" style="cursor:default">
            ${ico('shield',18)}<span>Təhlükəsiz giriş</span><span class="nav-count">●</span>
          </div>
        </nav>
        <div class="side-bottom">
          <div class="side-assist">
            <b>${ico('spark',14)} &nbsp; SorğuPro Studio</b>
            <p>Sorğuları qurun, sektorlar üzrə müsahibələri aparın və dəqiq vaxt hesabatlarını izləyin.</p>
          </div>
          <div class="side-user">
            <div class="avatar">${esc(initials(state.user.name))}</div>
            <div class="side-user-text">
              <strong>${esc(state.user.name)}</strong>
              <small>${roleTitle(state.user.role)}</small>
            </div>
            <button class="signout" data-action="logout" title="Çıxış">${ico('logout',17)}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="gap10">
            <button class="mobile-toggle" data-action="toggle-mobile">${ico('menu',20)}</button>
            <div class="crumb">İş mühiti ${ico('chevron',14)} <strong>${esc(label)}</strong></div>
          </div>
          <div class="top-actions">
            <div class="search-box">
              ${ico('search',15)}
              <input id="global-search" placeholder="Sürətli axtarış..." aria-label="Sürətli axtarış" value="${esc(state.filter)}">
            </div>
            <span class="top-time">${new Date().toLocaleDateString('az-AZ',{day:'numeric',month:'long',year:'numeric'})}</span>
            <div class="top-avatar">${esc(initials(state.user.name))}</div>
          </div>
        </header>
        <main class="content ${p==='builder'?'builder-content':''}" id="page-content">${page()}</main>
      </div>
    </div>`;
}

function page(){
  switch(state.page){
    case'dashboard':return dashboardPage();
    case'surveys':return surveysPage();
    case'contacts':return contactsPage();
    case'reports':return reportsPage();
    case'team':return teamPage();
    case'audit':return auditPage();
    case'settings':return settingsPage();
    case'builder':return builderPage();
    case'interview':return interviewPage();
    default:return dashboardPage();
  }
}

function render(){
  if(state.page==='public_survey')return renderPublicSurvey();
  if(!state.user)return renderLogin();

  const prevStageScroll=$('.builder-stage')?.scrollTop;
  const prevLibScroll=$('.builder-panel:not(.right)')?.scrollTop;
  const prevPropScroll=$('.builder-panel.right')?.scrollTop;
  const prevWinY=window.scrollY;
  const prevWinX=window.scrollX;

  $('#app').innerHTML=shell();

  if(prevStageScroll!==undefined){
    const st=$('.builder-stage');
    if(st)st.scrollTop=prevStageScroll;
  }
  if(prevLibScroll!==undefined){
    const lb=$('.builder-panel:not(.right)');
    if(lb)lb.scrollTop=prevLibScroll;
  }
  if(prevPropScroll!==undefined){
    const pr=$('.builder-panel.right');
    if(pr)pr.scrollTop=prevPropScroll;
  }
  window.scrollTo(prevWinX,prevWinY);

  requestAnimationFrame(()=>{
    if(prevStageScroll!==undefined){
      const st=$('.builder-stage');
      if(st&&Math.abs(st.scrollTop-prevStageScroll)>2)st.scrollTop=prevStageScroll;
    }
    if(prevLibScroll!==undefined){
      const lb=$('.builder-panel:not(.right)');
      if(lb)lb.scrollTop=prevLibScroll;
    }
    if(prevPropScroll!==undefined){
      const pr=$('.builder-panel.right');
      if(pr)pr.scrollTop=prevPropScroll;
    }
    window.scrollTo(prevWinX,prevWinY);
  });
}

const heading=(k,title,sub,buttons='')=>`<div class="page-heading"><div><div class="eyebrow">${k}</div><h1>${title}</h1><p>${sub}</p></div><div class="heading-actions">${buttons}</div></div>`;
function empty(icon,title,text,button=''){return `<div class="empty">${ico(icon,39)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${button}</div>`;}

function dashboardPage(){
  const x=state.dashboard||{stats:{},days:[],recent:[]};
  const z=x.stats,leader=isLeader();
  const cards=[
    ['Aktiv sorğular',z.activeSurveys,'Hazırda yayımlanan sorğular','surveys',''],
    ['Tamamlanan sorğu',z.completed,'Uğurla başa çatan müsahibələr','check','mint'],
    ['Cəmi sərf olunan vaxt',formatTimeSpent(z.totalDurationSec),'Bütün müsahibələr üzrə','clock','blue'],
    ['Qəbul edilən cavablar',pl(z.completed),'Sistemə daxil olan cavablar','file','orange']
  ];
  const maxDay=Math.max(1,...(x.days||[]).map(d=>d.completed));
  const activeList=state.surveys.filter(s=>s.status==='active');
  return `
    ${heading('İDARƏ PANELİ','Salam, '+esc(state.user.name.split(' ')[0])+'!','Sorğular üzrə birbaşa müsahibə aparın və əməkdaşların vaxt hesabatlarını izləyin.',`
      <button class="btn" data-action="refresh">${ico('refresh',16)} Yenilə</button>
      ${leader?`<button class="btn btn-primary" data-action="new-survey">${ico('plus',16)} Yeni sorğu</button>`:''}
    `)}
    <div class="welcome-banner">
      <div>
        <h2>Məlumatı topla. Dəqiq vaxt və nəticə ilə analiz et.</h2>
        <p>${leader?'Sorğuları idarə edin və əməkdaşların sərf etdiyi vaxtı izləyin.':'İstənilən aktiv sorğunu seçib dərhal müsahibəyə başlayın. Sorğu bitdikdə sərf olunan vaxt avtomatik qeydə alınır.'}</p>
      </div>
      <button class="btn" data-action="nav" data-page="surveys">Sorğulara bax ${ico('arrow',15)}</button>
    </div>
    <div class="grid cols-4">${cards.map(([title,val,desc,icon,color])=>`
      <div class="card stat-card">
        <div class="stat-head"><span class="stat-label">${title}</span><span class="stat-icon ${color}">${ico(icon,20)}</span></div>
        <div class="stat-value" style="font-size:25px">${val}</div>
        <div class="stat-foot">${desc}</div>
      </div>
    `).join('')}</div>
    ${activeList.length?`
      <div class="card mt20">
        <div class="card-head">
          <div><h3>Aktiv Sorğular (Birbaşa Başla)</h3><p>Müsahibə aparmaq üçün sorğuya klikləyib dərhal başlayın</p></div>
          <button class="section-link" data-action="nav" data-page="surveys">Kitabxanaya bax ${ico('arrow',14)}</button>
        </div>
        <div class="card-body">
          <div class="grid cols-3" style="gap:14px">
            ${activeList.map(s=>`
              <div class="card" style="border:1px solid #e2e8f0;padding:16px;border-radius:12px;background:#f8fafc">
                <div class="gap10" style="justify-content:space-between;margin-bottom:8px">
                  <span class="badge active">Aktiv</span>
                  <span style="font-size:12px;color:#64748b">${s.questionsCount} sual · ~${s.estimatedMinutes} dəq</span>
                </div>
                <h4 style="margin:0 0 6px 0;font-size:16px;font-weight:700">${esc(s.title)}</h4>
                <p style="font-size:12px;color:#64748b;margin:0 0 14px 0;line-height:1.4">${esc(s.description||'Müsahibəyə başlamaq üçün düyməni sıxın.')}</p>
                <button type="button" class="btn btn-primary w100" data-action="start-survey" data-id="${s.id}">
                  ${ico('phone',15)} Sorğuya başla
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `:''}
    <div class="grid cols-3 mt20">
      <div class="card span-2">
        <div class="card-head">
          <div><h3>Müsahibə dinamikası</h3><p>Son 7 gündə tamamlanan sorğu sayı</p></div>
          <div class="legend"><span class="mint">Tamamlanan müsahibələr</span></div>
        </div>
        <div class="dashboard-chart">
          <div class="chart-area">${(x.days||[]).map(d=>`
            <div class="chart-group">
              <div class="bar second" title="${d.completed} sorğu (${formatTimeSpent(d.durationSec)})" style="height:${Math.max(3,d.completed/maxDay*90)}%"></div>
            </div>
          `).join('')}</div>
          <div class="chart-x">${(x.days||[]).map(d=>`<span>${fmtDate(d.date,true)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <div><h3>Vaxt göstəriciləri</h3><p>Müsahibə vaxt analitikası</p></div>${ico('clock',18)}
        </div>
        <div class="card-body">
          <div class="info-pair"><span>Bir sorğuya orta vaxt</span><b>${formatTimeSpent(z.averageDurationSec)}</b></div>
          <div class="info-pair"><span>Ümumi qeydə alınan vaxt</span><b>${formatTimeSpent(z.totalDurationSec)}</b></div>
          <div class="info-pair"><span>Ümumi cavablar</span><b>${pl(z.completed)}</b></div>
          <div class="highlight-box mt20">
            ${ico('spark',14)} &nbsp; Tapşırıq təyinatına ehtiyac yoxdur. Sorğuya klikləyib dərhal başlayın.
          </div>
        </div>
      </div>
    </div>
    <div class="card mt20">
      <div class="card-head">
        <div><h3>Son tamamlanan müsahibələr</h3><p>Ən son keçirilən sorğular və sərf olunan vaxt</p></div>
        ${leader?`<button class="section-link" data-action="nav" data-page="reports">Hesabatlara bax ${ico('arrow',14)}</button>`:''}
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Respondent</th><th>Sorğu</th><th>Əməkdaş</th><th>Tarix</th><th>Sərf olunan vaxt</th></tr>
          </thead>
          <tbody>
            ${(x.recent||[]).map(a=>`
              <tr>
                <td><b>${esc(a.contact)}</b><div class="table-desc">${esc(a.phone)}</div></td>
                <td><b>${esc(a.survey)}</b></td>
                <td><span class="role-badge agent">${esc(a.agent)}</span></td>
                <td>${fmtTime(a.submittedAt)}</td>
                <td><span class="time-spent-badge">${ico('clock',12)} ${formatTimeSpent(a.durationSec)}</span></td>
              </tr>
            `).join('')||`<tr><td colspan="5" style="text-align:center;padding:26px;color:#64748b">Hazırda tamamlanmış müsahibə qeydi yoxdur.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function filtered(list,terms){
  const needle=state.filter.toLowerCase().trim();
  return needle?list.filter(x=>terms(x).toLowerCase().includes(needle)):list;
}

function surveysPage(){
  const leader=isLeader();
  let list=filtered(state.surveys,s=>s.title+' '+s.description+' '+s.category);
  if(state.statusFilter!=='all')list=list.filter(s=>s.status===state.statusFilter);
  return `
    ${heading('SORĞULAR','Sorğu kitabxanası','Sorğuları seçib birbaşa müsahibəyə başlayın və ya redaktə edin.',leader?`<button class="btn btn-primary" data-action="new-survey">${ico('plus',16)} Yeni sorğu yarat</button>`:'')}
    <div class="filter-strip">
      <input class="filter-input" data-local-search placeholder="Sorğu adı və kateqoriya üzrə axtar..." value="${esc(state.filter)}">
      <select class="filter-select" data-status-filter>
        <option value="all">Bütün statuslar</option>
        ${['active','draft','paused','archived'].map(v=>`<option value="${v}" ${state.statusFilter===v?'selected':''}>${OUTCOME[v]}</option>`).join('')}
      </select>
      <span class="pill">${list.length} sorğu</span>
    </div>
    <div class="grid cols-3">
      ${list.map(s=>`
        <article class="card survey-card">
          <div class="survey-top">
            <div class="survey-icon clickable" data-action="start-survey" data-id="${s.id}" title="Sorğuya başla">${ico('surveys',23)}</div>
            <div class="gap10">
              <span class="badge ${s.access==='private'?'draft':'active'}">${s.access==='private'?'Private':'Public'}</span>
              ${outcomeBadge(s.status)}
            </div>
          </div>
          <h3 class="clickable" data-action="${s.status==='active'?'start-survey':'edit-survey'}" data-id="${s.id}">${esc(s.title)}</h3>
          <p>${esc(s.description||'Sorğu haqqında təsvir əlavə edilməyib.')}</p>
          <div class="survey-metrics">
            <span><b>${s.questionsCount}</b>Sual</span>
            <span><b>${s.responsesCount}</b>Cavab</span>
            <span><b>${s.estimatedMinutes} dəq.</b>Müddət</span>
          </div>
          ${isAdmin()&&s.access!=='private'&&s.status==='active'?`
            <div class="share-link-box" style="margin-top:14px">
              <input class="share-link-input" readonly value="${location.origin}/#/s/${s.id}">
              <button class="btn btn-sm btn-quiet" data-action="copy-share-link" data-id="${s.id}" title="Linki kopyala">${ico('copy',13)} Kopyala</button>
            </div>
          `:''}
          <div class="survey-actions" style="margin-top:16px;display:flex;gap:7px;flex-wrap:wrap">
            ${s.status==='active'?`
              <button type="button" class="btn btn-primary" style="flex:2" data-action="start-survey" data-id="${s.id}">
                ${ico('phone',15)} Sorğuya başla
              </button>
            `:''}
            ${leader?`
              <button type="button" class="btn" style="flex:1" data-action="edit-survey" data-id="${s.id}">${ico('edit',14)} Redaktə</button>
              <button type="button" class="btn btn-icon" title="Surətini yarat" data-action="duplicate-survey" data-id="${s.id}">${ico('copy',15)}</button>
              <button type="button" class="btn btn-icon" title="Statusu dəyiş" data-action="survey-status" data-id="${s.id}">${ico('more',16)}</button>
              <button type="button" class="btn btn-icon btn-danger" title="Sorğunu sil" data-action="delete-survey" data-id="${s.id}">${ico('trash',15)}</button>
            `:''}
          </div>
        </article>
      `).join('')}
    </div>
    ${list.length?'':empty('surveys','Sorğu tapılmadı','Axtarışı dəyişin və ya ilk sorğunuzu yaradın.',leader?`<button class="btn btn-primary" data-action="new-survey">Yeni sorğu</button>`:'')}`;
}

function contactsPage(){
  const leader=isLeader();
  const allContacts=state.contacts;
  let list=allContacts;
  if(state.selectedSector==='unassigned')list=allContacts.filter(c=>!c.surveyId);
  else if(state.selectedSector!=='all')list=allContacts.filter(c=>c.surveyId===state.selectedSector);
  list=filtered(list,c=>(c.fullName||'')+' '+(c.phone||'')+' '+(c.email||'')+' '+(c.region||''));

  const currentSurvey=state.surveys.find(s=>s.id===state.selectedSector);

  return `
    ${heading('RESPONDENT BAZASI','Baza və Sorğu Sektorları','Hər sorğu üçün ayrılmış sektor üzrə respondentləri idarə edin və müsahibəyə başlayın.',`
      <button class="btn" data-action="export-contacts-excel">${ico('download',15)} Excel ixrac</button>
      ${leader?`<button class="btn" data-action="import-contacts" data-sector="${state.selectedSector!=='all'&&state.selectedSector!=='unassigned'?state.selectedSector:''}">${ico('upload',15)} Sektora CSV idxalı</button>`:''}
      <button class="btn btn-primary" data-action="new-contact" data-sector="${state.selectedSector!=='all'&&state.selectedSector!=='unassigned'?state.selectedSector:''}">${ico('plus',15)} Respondent əlavə et</button>
    `)}
    <div class="sector-tabs-wrap">
      <button class="sector-tab ${state.selectedSector==='all'?'active':''}" data-action="select-sector" data-sector="all">
        Bütün sektorlar <span class="sector-tab-count">${allContacts.length}</span>
      </button>
      ${state.surveys.map(s=>{
        const count=allContacts.filter(c=>c.surveyId===s.id).length;
        return `
          <button class="sector-tab ${state.selectedSector===s.id?'active':''}" data-action="select-sector" data-sector="${s.id}">
            ${ico('surveys',14)} ${esc(s.title)} <span class="sector-tab-count">${count}</span>
          </button>`;
      }).join('')}
      <button class="sector-tab ${state.selectedSector==='unassigned'?'active':''}" data-action="select-sector" data-sector="unassigned">
        Ümumi / Təyinsiz <span class="sector-tab-count">${allContacts.filter(c=>!c.surveyId).length}</span>
      </button>
    </div>
    ${currentSurvey?`
      <div class="card" style="padding:16px 20px;margin-bottom:18px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <span class="eyebrow">SEKTOR</span>
          <h3 style="margin:2px 0 0;font-size:16px">${esc(currentSurvey.title)} sektoru</h3>
          <small class="muted">Bu sektor üzrə bazada cəmi ${allContacts.filter(c=>c.surveyId===currentSurvey.id).length} respondent var.</small>
        </div>
        <div class="gap10">
          <button class="btn btn-primary btn-sm" data-action="start-survey" data-id="${currentSurvey.id}">
            ${ico('phone',14)} Bu sorğuya başla
          </button>
          <button class="btn btn-sm" data-action="open-report" data-id="${currentSurvey.id}">
            ${ico('chart',14)} Sektor hesabatı
          </button>
        </div>
      </div>
    `:''}
    <div class="filter-strip">
      <input class="filter-input" data-local-search placeholder="Ad, telefon və ya region üzrə axtar..." value="${esc(state.filter)}">
      <span class="pill">${pl(list.length)} respondent</span>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Ad və soyad</th><th>Telefon</th><th>Region</th><th>E-poçt</th><th>Sorğu Sektoru</th><th>Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c=>{
              const survey=state.surveys.find(s=>s.id===c.surveyId);
              const targetSurveyId=c.surveyId||(state.selectedSector!=='all'&&state.selectedSector!=='unassigned'?state.selectedSector:state.surveys[0]?.id);
              return `
                <tr>
                  <td><div class="gap10"><span class="person-avatar" style="height:33px;width:33px;border-radius:9px;font-size:11px">${esc(initials(c.fullName))}</span><b>${esc(c.fullName)}</b></div></td>
                  <td><b>${esc(c.phone)}</b></td>
                  <td>${esc(c.region||'—')}</td>
                  <td>${esc(c.email||'—')}</td>
                  <td>
                    ${survey?`<span class="badge in_progress" title="${esc(survey.title)}">${esc(survey.title.slice(0,25))}${survey.title.length>25?'...':''}</span>`:'<span class="badge draft">Ümumi sektor</span>'}
                  </td>
                  <td>
                    <div class="inline-actions">
                      ${targetSurveyId?`
                        <button class="btn btn-primary btn-sm" data-action="start-survey-with-contact" data-survey-id="${targetSurveyId}" data-contact-id="${c.id}" title="Sorğuya başla">
                          ${ico('phone',13)} Başla
                        </button>
                      `:''}
                      <button class="btn btn-icon btn-sm" data-action="edit-contact" data-id="${c.id}" title="Dəyişdir">${ico('edit',14)}</button>
                    </div>
                  </td>
                </tr>`;
            }).join('')||`<tr><td colspan="6">${empty('contacts','Bu sektorda respondent tapılmadı','Yuxarıdakı düymədən bu sektora yeni respondent əlavə edin və ya CSV idxal edin.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function reportsPage(){
  const list=state.surveys;
  return `
    ${heading('ANALİTİKA VƏ HESABATLAR','Hesabatlar','Sorğu nəticələri, respondentlərin vaxt reyestri və hər əməkdaşın ümumi vaxt hesabatı.')}
    ${!state.report?`
      <div class="grid cols-3">
        ${list.map(s=>`
          <div class="card survey-card">
            <div class="survey-top">
              <div class="survey-icon">${ico('chart',23)}</div>
              <div class="gap10">
                <span class="badge ${s.access==='private'?'draft':'active'}">${s.access==='private'?'Private':'Public'}</span>
                ${outcomeBadge(s.status)}
              </div>
            </div>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.description)}</p>
            <div class="survey-metrics">
              <span><b>${s.responsesCount}</b>Cavab</span>
              <span><b>${s.contactsCount||0}</b>Bazada</span>
              <span><b>${formatTimeSpent(s.totalDurationSec||0)}</b>Ümumi vaxt</span>
            </div>
            <div class="survey-actions">
              <button class="btn btn-primary" data-action="open-report" data-id="${s.id}">${ico('chart',15)} Hesabatı aç</button>
              <button class="btn btn-icon" data-action="export-report" data-id="${s.id}" title="CSV ixrac">${ico('download',15)}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `:reportDetail()}`;
}

function reportDetail(){
  const leader=isLeader();
  const r=state.report;
  let respList=r.responses||[];
  if(state.filter){
    const needle=state.filter.toLowerCase().trim();
    respList=respList.filter(x=>(x.contact||'').toLowerCase().includes(needle)||(x.phone||'').includes(needle)||(x.agent||'').toLowerCase().includes(needle));
  }

  return `
    <button class="btn" style="margin-bottom:19px" data-action="close-report">${ico('back',14)} Bütün hesabatlar</button>
    <div class="card" style="padding:24px 26px;margin-bottom:19px">
      <div style="display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap">
        <div>
          <div class="eyebrow">SORĞU HESABATI VƏ VAXT ANALİTİKASI</div>
          <h2 style="font-size:22px;margin:0 0 8px">${esc(r.survey.title)}</h2>
          ${outcomeBadge(r.survey.status)}
        </div>
        <div class="gap10">
          <button class="btn btn-primary" data-action="export-report-excel" data-id="${r.survey.id}">${ico('download',15)} Excel ixrac (.xls)</button>
          <button class="btn btn-quiet" data-action="export-report-csv" data-id="${r.survey.id}">${ico('file',15)} CSV ixrac (.csv)</button>
        </div>
      </div>
      <div class="grid cols-4 mt20">
        <div class="report-metric"><span>Tamamlanan müsahibə</span><b>${r.completed}</b></div>
        <div class="report-metric"><span>Ümumi sərf olunan vaxt</span><b style="color:#4f46e5">${formatTimeSpent(r.totalDurationAll)}</b></div>
        <div class="report-metric"><span>Bir sorğuya orta vaxt</span><b>${formatTimeSpent(r.averageDuration)}</b></div>
        <div class="report-metric"><span>İştirak edən əməkdaş</span><b>${(r.userStats||[]).length} nəfər</b></div>
      </div>
    </div>
    <div class="card">
      <div class="tabs">
        <button class="tab ${state.reportTab==='responses'?'active':''}" data-action="report-tab" data-tab="responses">${ico('list',15)} &nbsp; Respondent Reyestri və Vaxt Bölgüsü (${r.completed})</button>
        <button class="tab ${state.reportTab==='summary'?'active':''}" data-action="report-tab" data-tab="summary">${ico('chart',15)} &nbsp; Sual Analitikası</button>
      </div>
      ${state.reportTab==='responses'?`
        <div style="padding:0 24px 18px">
          <div class="filter-strip" style="margin-bottom:14px">
            <input class="filter-input" data-local-search placeholder="Respondent, telefon və ya əməkdaş üzrə axtar..." value="${esc(state.filter)}">
            <span class="pill">${respList.length} respondent göstərilir</span>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th style="width:50px">№</th>
                  <th>Respondent</th>
                  <th>Telefon</th>
                  <th>Əməkdaş / Operator</th>
                  <th>Tarix və Saat</th>
                  <th>SƏRF OLUNAN VAXT (MÜDDƏT)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${respList.map((x,idx)=>`
                  <tr>
                    <td><b>${idx+1}</b></td>
                    <td><b>${esc(x.contact||'—')}</b>${x.ip?`<div class="table-desc">${ico('shield',11)} ${esc(x.ip)}</div>`:''}</td>
                    <td><b>${esc(x.phone||'—')}</b></td>
                    <td>
                      <span class="role-badge ${x.isPublic?'public':'agent'}">
                        ${esc(x.agent)}${x.agentUsername?` (@${esc(x.agentUsername)})`:''}
                      </span>
                    </td>
                    <td>${fmtTime(x.submittedAt)}</td>
                    <td>
                      <span class="time-spent-badge">
                        ${ico('clock',13)} ${formatTimeSpent(x.durationSec)}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-sm" data-action="response-details" data-id="${x.id}" title="Cavablara bax">${ico('eye',14)} Bax</button>
                        ${leader?`<button class="btn btn-sm btn-primary" data-action="edit-response-sheet" data-id="${x.id}" title="Sorğu vərəqəsini redaktə et">${ico('edit',14)} Redaktə</button>`:''}
                      </div>
                    </td>
                  </tr>
                `).join('')||'<tr><td colspan="7">Cavab tapılmadı.</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="operator-summary-card">
            <div class="operator-summary-head">
              <div>
                <h3 style="margin:0;font-size:16px">ƏMƏKDAŞLARIN ÜMUMİ VAXT VƏ İCRA İCMALI</h3>
                <small class="muted">Hər bir istifadəçinin bu sorğuya sərf etdiyi cəmi vaxt və fərdi statistikası</small>
              </div>
              <span class="time-total-badge">${ico('clock',14)} Cəmi: ${formatTimeSpent(r.totalDurationAll)}</span>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Əməkdaş</th>
                    <th>Rol</th>
                    <th>Tamamlanan sorğu sayı</th>
                    <th>Bir sorğuya orta vaxt</th>
                    <th>Ən qısa müsahibə</th>
                    <th>Ən uzun müsahibə</th>
                    <th>ÜMUMİ SƏRF OLUNAN VAXT</th>
                    <th>Vaxt payı</th>
                  </tr>
                </thead>
                <tbody>
                  ${(r.userStats||[]).map(u=>`
                    <tr>
                      <td>
                        <div class="gap10">
                          <span class="person-avatar" style="height:32px;width:32px;border-radius:8px;font-size:11px">${esc(initials(u.name))}</span>
                          <div>
                            <b>${esc(u.name)}</b>
                            ${u.username?`<div class="table-desc">@${esc(u.username)}</div>`:''}
                          </div>
                        </div>
                      </td>
                      <td>${roleBadge(u.role)}</td>
                      <td><b>${u.count}</b> respondent</td>
                      <td><b>${formatTimeSpent(u.avgDurationSec)}</b></td>
                      <td><span class="muted">${formatTimeSpent(u.minDurationSec)}</span></td>
                      <td><span class="muted">${formatTimeSpent(u.maxDurationSec)}</span></td>
                      <td><b class="time-total-badge">${ico('clock',13)} ${formatTimeSpent(u.totalDurationSec)}</b></td>
                      <td style="min-width:110px">
                        <div class="gap10">
                          <div class="progress-line" style="height:8px"><span style="width:${u.percentage||0}%;background:#6656e9"></span></div>
                          <span style="font-size:11px;font-weight:700">${u.percentage||0}%</span>
                        </div>
                      </td>
                    </tr>
                  `).join('')||'<tr><td colspan="8">Statistika mövcud deyil.</td></tr>'}
                  <tr style="background:#f8fafc;font-weight:800">
                    <td colspan="2"><b>CƏMİ YEKUN</b></td>
                    <td><b>${r.completed} respondent</b></td>
                    <td><b>${formatTimeSpent(r.averageDuration)}</b></td>
                    <td>—</td>
                    <td>—</td>
                    <td><b class="time-total-badge" style="background:#4338ca;color:white;border-color:#4338ca">${formatTimeSpent(r.totalDurationAll)}</b></td>
                    <td><b>100%</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `:`
        <div style="padding:10px 24px 24px">
          ${r.questions.map((q,i)=>`
            <div class="report-q">
              <div class="gap10"><span class="pill">${i+1}</span><h4 style="margin:0">${esc(q.title)}</h4></div>
              <small>${typeLabel(q.type)} · ${q.answered} cavab</small>
              ${q.average!==null?`<div class="highlight-box">Orta göstərici: <b>${q.average}</b></div>`:''}
              ${q.counts.length?q.counts.slice(0,9).map(([label,count])=>`
                <div class="report-entry">
                  <span>${esc(label)}</span>
                  <div class="progress-line"><span style="width:${q.answered?Math.min(100,count/q.answered*100):0}%;background:#7969ea"></span></div>
                  <b>${count}</b>
                </div>
              `).join(''):q.samples.length?q.samples.map(v=>`<p class="note" style="margin:13px 0">“${esc(v)}”</p>`).join(''):'<div class="note mt12">Məlumat yoxdur və ya cavablar sərbəst formatdadır.</div>'}
            </div>
          `).join('')}
        </div>
      `}
    </div>`;
}

function teamPage(){
  const u=state.users,admin=isAdmin();
  return `
    ${heading('İSTİFADƏÇİ İDARƏETMƏSİ','Operator heyəti','İcazələri, hesabları və operatorların fəaliyyətini izləyin.',admin?`<button class="btn btn-primary" data-action="new-user">${ico('plus',16)} Yeni əməkdaş</button>`:'')}
    <div class="grid cols-3">
      ${u.map(person=>{
        return `
          <div class="card" style="padding:24px">
            <div class="gap10">
              <div class="person-avatar">${esc(initials(person.name))}</div>
              <div style="flex:1">
                <b>${esc(person.name)}</b>
                <div class="table-desc">@${esc(person.username)}</div>
              </div>
              <span class="badge ${person.active?'active':'refused'}">${person.active?'Aktiv':'Deaktiv'}</span>
            </div>
            <div class="separator"></div>
            <div class="gap10" style="justify-content:space-between;font-size:11px;color:#8491a5">
              ${roleBadge(person.role)}
              <span>Qeydiyyat: <b style="color:var(--ink)">${fmtDate(person.createdAt,true)}</b></span>
            </div>
            <div class="gap10" style="justify-content:space-between;margin-top:16px">
              <span class="note">${person.active?'Sistemdə aktivdir':'Deaktiv edilib'}</span>
              ${admin?`<button class="btn btn-sm" data-action="edit-user" data-id="${person.id}">${ico('edit',13)} İdarə et</button>`:`<span class="pill">${person.active?'Aktiv':'Deaktiv'}</span>`}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function auditPage(){
  let list=filtered(state.audit,a=>(a.userName||'')+' '+(a.username||'')+' '+(a.ip||'')+' '+(a.action||'')+' '+(a.entity||'')+' '+(a.details||'')+' '+(a.role||''));
  return `
    ${heading('TƏHLÜKƏSİZLİK VƏ AUDİT','Fəaliyyət tarixçəsi','Bütün istifadəçilərin sistemdəki hərəkətləri və IP ünvanlarının qeydiyyatı.',`
      <button class="btn" data-action="export-audit-excel">${ico('download',15)} Excel ixrac</button>
      <button class="btn" data-action="refresh">${ico('refresh',15)} Yenilə</button>
    `)}
    <div class="filter-strip">
      <input class="filter-input" data-local-search placeholder="İstifadəçi, rol, IP ünvanı və ya hərəkət üzrə axtar..." value="${esc(state.filter)}">
      <span class="pill">${list.length} qeyd</span>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Tarix və Saat</th>
              <th>İstifadəçi</th>
              <th>Rol</th>
              <th>IP Ünvanı</th>
              <th>Fəaliyyət</th>
              <th>Obyekt / Təfərrüat</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a=>`
              <tr>
                <td><b>${fmtTime(a.createdAt)}</b></td>
                <td>
                  <div class="gap10">
                    <span class="person-avatar" style="height:32px;width:32px;border-radius:8px;font-size:11px">${esc(initials(a.userName||a.username))}</span>
                    <div>
                      <b>${esc(a.userName||a.username||'Qonaq')}</b>
                      <div class="table-desc">@${esc(a.username||'anonim')}</div>
                    </div>
                  </div>
                </td>
                <td>${roleBadge(a.role)}</td>
                <td><span class="ip-badge">${ico('shield',11)} ${esc(a.ip||'127.0.0.1')}</span></td>
                <td><strong>${esc(a.action)}</strong></td>
                <td>
                  <div style="max-width:320px;line-height:1.45">
                    <b>${esc(a.entity||'—')}</b>
                    ${a.details?`<div class="table-desc">${esc(a.details)}</div>`:''}
                  </div>
                </td>
              </tr>
            `).join('')||`<tr><td colspan="6">${empty('clock','Tarixçə tapılmadı','Hələ heç bir fəaliyyət qeydə alınmayıb.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function settingsPage(){
  return `
    ${heading('HESAB VƏ TƏHLÜKƏSİZLİK','Parametrlər','Şəxsi profil, şifrə və platforma haqqında məlumatlar.')}
    <div class="grid cols-2">
      <div class="card list-card">
        <h3>Şəxsi profil</h3>
        <p class="muted" style="font-size:12px">Cari istifadəçi məlumatları</p>
        <div class="separator"></div>
        ${[['Ad və soyad',state.user.name],['İstifadəçi adı',state.user.username],['Rol',roleTitle(state.user.role)],['Qeydiyyat tarixi',fmtDate(state.user.createdAt)]].map(([label,value])=>`
          <div class="info-pair"><span>${label}</span><span>${esc(value)}</span></div>
        `).join('')}
        <button class="btn mt20" data-action="change-password">${ico('lock',15)} Şifrəni dəyiş</button>
      </div>
      <div class="card list-card">
        <h3>Platforma haqqında</h3>
        <p class="muted" style="font-size:12px">SorğuPro Enterprise Edition · Birbaşa Müsahibə Sistemi</p>
        <div class="separator"></div>
        <div class="gap10">
          ${ico('clock',34)}
          <div>
            <b>Dəqiq Vaxt Hesabatları</b>
            <p class="note mt12">Hər respondentə sərf olunan vaxt dərhal hesabata əlavə olunur və hər bir əməkdaşın ümumi iş vaxtı hesablanır.</p>
          </div>
        </div>
        <div class="separator"></div>
        <div class="gap10">
          ${ico('layers',34)}
          <div>
            <b>Bazada Sorğu Sektorları</b>
            <p class="note mt12">Hər bir sorğu üçün ayrıca respondent sektoru ayrılıb və birbaşa o sektordan sorğuya başlamaq mümkündür.</p>
          </div>
        </div>
        <div class="hint mt20">Məlumatlar yerli serverdə saxlanılır. Serverin <b>data/</b> qovluğunu mütəmadi yedəkləyin.</div>
      </div>
    </div>`;
}

// ——— FORM DESIGNER DRAFT & LIVE SYNC HELPERS ———
function saveBuilderDraft(){
  if(!state.builder||!state.builder.id)return;
  try{
    const bId=state.builder.id;
    const payload={
      builder:state.builder,
      builderQ:state.builderQ,
      builderSection:state.builderSection,
      savedAt:Date.now()
    };
    localStorage.setItem('sp_builder_draft_'+bId,JSON.stringify(payload));
  }catch{}
}

function clearBuilderDraft(surveyId){
  const id=surveyId||state.builder?.id;
  if(id){
    try{localStorage.removeItem('sp_builder_draft_'+id);}catch{}
  }
}

function restoreBuilderDraft(survey){
  if(!survey||!survey.id)return null;
  try{
    const raw=localStorage.getItem('sp_builder_draft_'+survey.id);
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(data&&data.builder&&data.builder.id===survey.id){
      return data;
    }
  }catch{}
  return null;
}

function syncBuilderLive(q){
  if(!q)return;
  const card=document.querySelector(`.q-card[data-id="${q.id}"]`);
  if(card){
    const titleEl=card.querySelector('.q-title');
    if(titleEl){
      titleEl.innerHTML=`${esc(q.title||'Adsız sual')} ${q.required?'<span class="required">*</span>':''}<div class="q-mini-type">${typeLabel(q.type)}${q.condition?' · Şərt tətbiq edilib':''}</div>`;
    }
    const previewEl=card.querySelector('.q-preview');
    if(previewEl){
      previewEl.innerHTML=questionMini(q);
    }
  }
  const topEyebrow=document.querySelector('.builder-top .eyebrow');
  if(topEyebrow){
    topEyebrow.innerHTML=`SORĞU KONSTRUKTORU · <span style="color:var(--accent-orange,#ea580c);font-weight:600">QARALAMA YADDA SAXLANILDI (LOKAL)</span>`;
  }
  saveBuilderDraft();
}

// ——— FORM DESIGNER ———
function newQuestion(type,sectionId){
  const question={
    id:mkId(),
    sectionId,
    type,
    title:'Yeni sual',
    description:'',
    required:!['paragraph','file','consent'].includes(type),
    options:[],
    rows:[],
    columns:[],
    settings:{min:0,max:10},
    condition:null
  };

  switch(type){
    case'single':
      question.title='Fəaliyyət növünüzü və ya əsas kateqoriyanızı seçin';
      question.options=['Kənd təsərrüfatı və fermerlik','Emal sənayesi və istehsalat','Ticarət və xidmət sahəsi','Digər fəaliyyət'].map(label=>({id:mkId(),label,image:''}));
      break;
    case'multiple':
      question.title='Təsərrüfatınızda hansı bitki və ya məhsulları yetişdirirsiniz?';
      question.description='Bir neçə variant seçə bilərsiniz.';
      question.options=['Taxıl və dənli bitkilər','Kartof və tərəvəz','Meyvə bağları','Texniki və yem bitkiləri','İstixana məhsulları'].map(label=>({id:mkId(),label,image:''}));
      question.settings={maxSelect:0};
      break;
    case'dropdown':
      question.title='Fəaliyyət göstərdiyiniz iqtisadi rayonu seçin';
      question.description='Siyahıdan müvafiq regionu seçin.';
      question.options=['Abşeron-Xızı','Gəncə-Daşkəsən','Qazax-Tovuz','Quba-Xaçmaz','Lənkəran-Astara','Mərkəzi Aran','Mil-Muğan','Şəki-Zaqatala','Şirvan-Salyan','Qarabağ','Şərqi Zəngəzur','Naxçıvan MR'].map(label=>({id:mkId(),label,image:''}));
      break;
    case'yesno':
      question.title='Cari ildə dövlət subsidiyası və ya aqrar kreditdən istifadə etmisinizmi?';
      question.options=[{id:mkId(),label:'Bəli',image:''},{id:mkId(),label:'Xeyr',image:''}];
      break;
    case'image_choice':
      question.title='Məhsul üçün ən münasib qablaşdırma və ya etiket dizaynını seçin';
      question.description='Təqdim olunan vizual variantlardan birinə klikləyin.';
      question.options=[
        {id:mkId(),label:'Variant A (Klassik qablaşdırma)',image:DEMO_IMG_A},
        {id:mkId(),label:'Variant B (Ekoloji kraft qablaşdırma)',image:DEMO_IMG_B},
        {id:mkId(),label:'Variant C (Premium şüşə qablaşdırma)',image:DEMO_IMG_C}
      ];
      break;
    case'rating':
      question.title='Göstərilən xidmətin ümumi keyfiyyət səviyyəsini qiymətləndirin';
      question.description='1 - Çox zəif, 10 - Əla səviyyədə';
      question.settings={min:1,max:10};
      break;
    case'stars':
      question.title='Mütəxəssis və aqronom məsləhətinin keyfiyyətini ulduzlarla qiymətləndirin';
      question.description='5 ulduz ən yüksək qiymətləndirmədir.';
      question.settings={min:1,max:5};
      break;
    case'slider':
      question.title='Layihənin gözləntilərinizi qarşılama dərəcəsi (0-100%)';
      question.description='Dəyəri təyin etmək üçün slayderi sürüşdürün.';
      question.settings={min:0,max:100,step:5,unit:'percent'};
      break;
    case'ranking':
      question.title='Məhsul seçimində sizin üçün ən vacib olan amilləri prioritetə görə sıralayın';
      question.description='Variantları əhəmiyyət sırasına uyğun yerləşdirin.';
      question.options=['Yüksək keyfiyyət və təbiilik','Münasib qiymət','Sürətli çatdırılma və əlçatanlıq','Brendə olan etibar'].map(label=>({id:mkId(),label,image:''}));
      break;
    case'bestworst':
      question.title='Təklif olunan xidmətlər arasında ən faydalı və ən az ehtiyac duyulanı seçin';
      question.description='Hər meyar üzrə ən müsbət və ən mənfi xüsusiyyəti qeyd edin.';
      question.options=['Subsidiyaların elektron verilməsi','Aqrotexniki treninqlər','Məhsulun birbaşa satış yarmarkaları','Güzəştli sığorta mexanizmi'].map(label=>({id:mkId(),label,image:''}));
      break;
    case'matrix':
      question.title='Aşağıdakı sahələr üzrə xidmət səviyyəsini qiymətləndirin';
      question.rows=['Müraciətlərə baxılma sürəti','Əməkdaşların nəzakəti və peşəkarlığı','İnformasiyanın aydınlığı','Texniki dəstək xidməti'];
      question.columns=['Qənaətbəxş deyil','Orta','Yaxşı','Əla'];
      break;
    case'matrix_multi':
      question.title='Hər bir fəaliyyət dövründə tətbiq etdiyiniz aqrotexniki tədbirlər';
      question.rows=['Yaz səpini dövrü','Yay suvarma dövrü','Payız məhsul yığımı'];
      question.columns=['Mineral gübrə','Üzvi gübrə','Zərərvericilərə qarşı dərmanlama','Mexanikləşdirilmiş emal'];
      break;
    case'matrix_dropdown':
      question.title='Təsərrüfat istiqamətləri üzrə illik məhsuldarlıq dinamikası';
      question.rows=['Dənli bitkilər','Kartof və tərəvəzçilik','Meyvəçilik və üzümçülük'];
      question.columns=['Artıb','Dəyişməyib','Azalıb','Məlumat yoxdur'];
      break;
    case'matrix_text':
      question.title='Hansı sort kartoflardan əkmisiniz və sahələr üzrə həcmi (kq)?';
      question.description='Birinci sütunda kartof sortları, digər sütunlarda müvafiq intervallar üzrə həcmi daxil edin.';
      question.rows=['Bakı kartofu','Cəlilabad kartofu','Gədəbəy kartofu','Tovuz kartofu'];
      question.columns=['0-100','100-200','200-300','300-dən çox'];
      break;
    case'nps':
      question.title='Mərkəzimizin xidmətlərini həmkarlarınıza və ya yaxınlarınıza tövsiyə etmə ehtimalınız nə qədərdir?';
      question.description='0 - Qətiyyən tövsiyə etmərəm, 10 - Mütləq tövsiyə edərəm';
      question.settings={min:0,max:10};
      break;
    case'likert':
      question.title='"Elektron aqrar sistemlər sənədləşmə işlərini əhəmiyyətli dərəcədə asanlaşdırır" fikri ilə nə dərəcədə razısınız?';
      question.settings={min:1,max:5};
      question.options=['Tamamilə razı deyiləm','Razı deyiləm','Neytral / Qərarsızam','Razıyam','Tamamilə razıyam'].map(label=>({id:mkId(),label,image:''}));
      break;
    case'short_text':
      question.title='Təsərrüfatınızın və ya müəssisənizin rəsmi adını qeyd edin';
      question.description='Məsələn: "Bərəkət" MMC və ya Fərdi Sahibkar Əliyev';
      question.settings={textRule:'none'};
      break;
    case'paragraph':
      question.title='Xidmət keyfiyyətinin artırılması ilə bağlı təklif və iradlarınızı ətraflı qeyd edin';
      question.description='Fikirlərinizi sərbəst şəkildə yazın.';
      question.required=false;
      question.settings={textRule:'none'};
      break;
    case'fill_blank':
      question.title='Əkin və məhsuldarlıq göstəriciləri üzrə boşluqları doldurun';
      question.description='Cümlədəki boşluq sahələrinə müvafiq rəqəmləri və ya məlumatları daxil edin.';
      question.options=[
        {id:mkId(),label:'Yaz zamanı ____ kq kartof əkmişəm.',image:''},
        {id:mkId(),label:'Payızda ümumi sahədən ____ kq məhsul yığmışam.',image:''},
        {id:mkId(),label:'Məhsulun ____ faizini bazarda satışa çıxarmışam.',image:''}
      ];
      break;
    case'number':
      question.title='Təsərrüfatınızda çalışan ümumi işçilərin (əməkdaşların) sayı';
      question.description='Yalnız tam rəqəm daxil edin.';
      question.settings={min:1,max:1000,step:1,unit:'none'};
      break;
    case'currency':
      question.title='Cari il üzrə ümumi subsidiyanın və ya gəlirin məbləği (AZN ilə)';
      question.description='Məbləği manatla daxil edin.';
      question.settings={min:0,max:1000000,step:1,unit:'azn'};
      break;
    case'percentage':
      question.title='Damcılı və qənaətcil suvarma sisteminin əkin sahəsində tətbiq olunma faizi';
      question.description='0 ilə 100 arasında faiz göstəricisi daxil edin.';
      question.settings={min:0,max:100,step:1,unit:'percent'};
      break;
    case'multitext':
      question.title='Təsərrüfat rəhbərinin əsas məsuliyyət sahələri və əlaqəli şəxslər';
      question.rows=['Aqronomun adı və təcrübəsi','Mühasibin adı və əlaqə vasitəsi','Anbardarın adı və anbar ünvanı'];
      break;
    case'name':
      question.title='Respondent və ya təsərrüfat rəhbərinin adı, soyadı və ata adı';
      question.description='Şəxsiyyət vəsiqəsinə uyğun tam qeyd edin.';
      question.settings={textRule:'capitalized'};
      break;
    case'email':
      question.title='Rəsmi bildirişlər və əlaqə üçün e-poçt ünvanınız';
      question.description='Nümunə: ad.soyad@domain.az';
      question.settings={textRule:'email'};
      break;
    case'phone':
      question.title='Əlaqə üçün mobil telefon nömrəniz';
      question.description='Nümunə: +994 50 123 45 67';
      question.settings={textRule:'phone'};
      break;
    case'address':
      question.title='Təsərrüfatın və ya istehsalat sahəsinin yerləşdiyi dəqiq ünvan';
      question.description='Rayon, qəsəbə/kənd, küçə və torpaq sahəsinin təyinatı.';
      question.settings={textRule:'none'};
      break;
    case'date':
      question.title='Əkinin başlandığı və ya müqavilənin bağlandığı tarix';
      question.description='Təqvimdən müvafiq tarixi seçin.';
      break;
    case'time':
      question.title='Görüş və ya monitorinqin keçirilməsi üçün ən münasib saat';
      question.description='İş saatları daxilində vaxt seçin.';
      break;
    case'datetime':
      question.title='Növbəti sahə monitorinqinin planlaşdırılan dəqiq tarixi və vaxtı';
      question.description='Tarix və saatı birlikdə qeyd edin.';
      break;
    case'file':
      question.title='Torpaq çıxarışı, təhvil aktı və ya tələb olunan sənədin surətini yükləyin';
      question.description='Qəbul olunan formatlar: PDF, JPG, PNG və ya DOCX (Maksimum 2 MB).';
      question.required=false;
      break;
    case'consent':
      question.title='Fərdi məlumatların "Fərdi məlumatlar haqqında" AR Qanununa uyğun emalına razılıq verirsinizmi?';
      question.description='Sorğuda iştirak etməklə məlumatlarınızın aqrar təhlillərdə istifadəsinə razılıq vermiş olursunuz.';
      question.required=true;
      break;
    case'text_ab':
      question.title='Yeni aqrar maarifləndirmə şüarının qiymətləndirilməsi (A/B Testi)';
      question.description='Sizə təsadüfi qaydada təqdim olunan mətni qiymətləndirin və uyğunluğunu bildirin.';
      question.options=[
        {id:mkId(),label:'Variant A: "Kənd təsərrüfatında innovativ texnologiyalar və bol məhsul"',image:''},
        {id:mkId(),label:'Variant B: "Torpağın bərəkəti, zəhmətin qüdrəti: gələcəyə güvənlə addımla"',image:''}
      ];
      break;
    case'image_ab':
      question.title='Məhsulun yeni vizual dizayn və etiket variantının testi (A/B Testi)';
      question.description='Təqdim olunan vizual variantı nəzərdən keçirin və təsdiq edib-etmədiyinizi qeyd edin.';
      question.options=[
        {id:mkId(),label:'Dizayn A (Müasir minimal üslub)',image:DEMO_IMG_A},
        {id:mkId(),label:'Dizayn B (Ənənəvi milli ornamentli üslub)',image:DEMO_IMG_B}
      ];
      break;
    default:
      question.title=typeLabel(type)||'Yeni sual';
      question.options=['Variant 1','Variant 2','Variant 3'].map(label=>({id:mkId(),label,image:''}));
  }

  return question;
}

function makeBuilder(survey){
  const draft=restoreBuilderDraft(survey);
  if(draft&&draft.builder){
    state.builder=draft.builder;
    state.builderQ=draft.builderQ||draft.builder.questions[0]?.id||null;
    state.builderSection=draft.builderSection||draft.builder.sections[0]?.id||null;
    state.dirty=true;
    notify('Yadda saxlanmamış qaralama bərpa edildi.');
  } else {
    state.builder=JSON.parse(JSON.stringify(survey));
    state.builderQ=survey.questions[0]?.id||null;
    state.builderSection=survey.sections[0]?.id||null;
    state.dirty=false;
  }
  state.preview=false;
  state.propOpen=false;
  state.page='builder';
  location.hash='#/builder';
  render();
  window.scrollTo(0,0);
}

function builderPage(){
  const s=state.builder;
  if(!s)return `<div class="empty">Sorğu seçilməyib.</div>`;
  const sel=s.questions.find(q=>q.id===state.builderQ);
  const qBySection=id=>s.questions.filter(q=>q.sectionId===id);
  return `
    <div class="builder-top">
      <div>
        <div class="eyebrow">SORĞU KONSTRUKTORU ${state.dirty?'· YADDA SAXLANMAYIB':''}</div>
        <h1>${esc(s.title)}</h1>
      </div>
      <div class="heading-actions">
        <button class="btn" data-action="open-properties">${ico('edit',15)} Sual parametrləri</button>
        <button class="btn" data-action="survey-settings">${ico('settings',15)} Məlumatlar</button>
        <button class="btn" data-action="builder-preview">${ico(state.preview?'edit':'eye',16)} ${state.preview?'Redaktor':'Önizləmə'}</button>
        <button class="btn btn-primary" data-action="save-builder">${ico('save',16)} Yadda saxla</button>
        <button class="btn btn-icon" data-action="nav" data-page="surveys" title="Çıxış">${ico('close',16)}</button>
      </div>
    </div>
    <div class="builder-shell">
      <aside class="builder-panel">
        <div class="builder-panel-title">SUAL KİTABXANASI · ${TYPES.length}</div>
        ${groups.map(group=>`
          <div class="palette-group">
            <div class="palette-label">${group}</div>
            ${TYPES.filter(t=>t[0]===group).map(([g,type,label,icon])=>`
              <button class="palette-item" data-action="add-question" data-type="${type}">${ico(icon,15)} ${label}</button>
            `).join('')}
          </div>
        `).join('')}
      </aside>
      <div class="builder-stage">
        ${state.preview?builderPreview():`
          <div class="builder-intro">
            <small>${esc(s.category||'Ümumi')} / ${s.questions.length} sual / ${s.sections.length} bölmə / ${s.access==='private'?'Private (Daxili)':'Public (İctimai link)'}</small>
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.description||'Sorğunu konfiqurasiya etmək üçün sualları seçin.')}</p>
          </div>
          ${s.sections.map((sec,i)=>`
            <div class="section-band">
              <h3>${i+1 < 10?'0'+(i+1):i+1} — ${esc(sec.title)}</h3>
              <div class="inline-actions">
                <button class="btn btn-sm" data-action="edit-section" data-id="${sec.id}">${ico('edit',13)}</button>
                ${s.sections.length>1?`<button class="btn btn-sm" data-action="delete-section" data-id="${sec.id}">${ico('trash',13)}</button>`:''}
              </div>
            </div>
            ${qBySection(sec.id).map((q,idx)=>`
              <div class="q-card ${state.builderQ===q.id?'selected':''}" data-action="select-question" data-id="${q.id}">
                <div class="qcard-top">
                  <span class="q-number">${idx+1}</span>
                  <div class="q-title">${esc(q.title)} ${q.required?'<span class="required">*</span>':''}<div class="q-mini-type">${typeLabel(q.type)}${q.condition?' · Şərt tətbiq edilib':''}</div></div>
                  <div class="q-actions">
                    <button data-action="move-question" data-id="${q.id}" data-direction="-1" title="Yuxarı">↑</button>
                    <button data-action="move-question" data-id="${q.id}" data-direction="1" title="Aşağı">↓</button>
                    <button data-action="clone-question" data-id="${q.id}" title="Kopyala">${ico('copy',13)}</button>
                    <button data-action="delete-question" data-id="${q.id}" title="Sil">${ico('trash',13)}</button>
                  </div>
                </div>
                <div class="q-preview">${questionMini(q)}</div>
              </div>
            `).join('')}
            <button class="builder-add" data-action="add-question" data-section="${sec.id}" data-type="single">${ico('plus',15)} Bu bölməyə sual əlavə et</button>
          `).join('')}
          <button class="builder-add" data-action="add-section">${ico('plus',15)} Yeni bölmə əlavə et</button>
        `}
      </div>
      <aside class="builder-panel right ${sel&&state.propOpen?'show':''}" id="property-panel">
        ${state.preview?`
          <div class="builder-panel-title">ÖNİZLƏMƏ</div>
          <div class="prop-desc">Bu görüntü respondentə təqdim olunacaq interfeysə yaxındır.</div>
        `:sel?properties(sel):`
          <div class="builder-panel-title">SUAL PARAMETRLƏRİ</div>
          ${empty('edit','Sual seçin','Soldakı kitabxanadan sual əlavə edin və ya ortadakı sualı seçin.')}
        `}
      </aside>
    </div>`;
}

function questionMini(q){
  const opt=q.options||[];
  if(q.type==='image_choice') {
    return `<div class="mini-img-options">${opt.slice(0,4).map(o=>`
      <span class="mini-img-opt">
        ${o.image?`<img src="${esc(o.image)}" class="mini-thumb" alt="${esc(o.label)}">`:'<span class="mini-img-placeholder">🖼️</span>'}
        <small>${esc(o.label)}</small>
      </span>
    `).join('')}</div>`;
  }
  if(q.type==='image_ab') {
    return `<div class="mini-ab-box">
      <div class="mini-ab-badge">🖼️ ŞƏKİL A/B TESTİ (${opt.length} vizual variant)</div>
      <div class="mini-img-options">${opt.slice(0,2).map(o=>`
        <span class="mini-img-opt">
          ${o.image?`<img src="${esc(o.image)}" class="mini-thumb" alt="${esc(o.label)}">`:'<span class="mini-img-placeholder">🖼️</span>'}
          <small>${esc(o.label)}</small>
        </span>
      `).join('')}</div>
    </div>`;
  }
  if(q.type==='text_ab') {
    return `<div class="mini-ab-box">
      <div class="mini-ab-badge">📝 MƏTN A/B TESTİ (${opt.length} mətn variantı)</div>
      <div class="fake-options">${opt.slice(0,2).map(x=>`<span class="fake-option">💬 ${esc(x.label)}</span>`).join('')}</div>
    </div>`;
  }
  if(['single','multiple','dropdown','yesno'].includes(q.type))return `<div class="fake-options">${(q.type==='yesno'?['Bəli','Xeyr']:opt.map(x=>x.label)).slice(0,4).map(t=>`<span class="fake-option">◯ ${esc(t)}</span>`).join('')||'Variant əlavə edin'}</div>`;
  if(['ranking','bestworst'].includes(q.type))return `<div class="fake-options">${opt.slice(0,4).map((x,i)=>`<span class="fake-option">${i+1}. ${esc(x.label)}</span>`).join('')||'Variant əlavə edin'}</div>`;
  if(['rating','stars','slider','nps','likert'].includes(q.type))return `<div class="fake-options">${Array.from({length:5},(_,i)=>`<span class="fake-option">${q.type==='stars'?'☆':i+1}</span>`).join('')}</div>`;
  if(q.type==='fill_blank')return `<div class="fake-options">${(opt.slice(0,2).map(x=>`<span class="fake-option">✍ ${esc(x.label)}</span>`).join(''))||'Cümlə və boşluq əlavə edin'}</div>`;
  if(q.type.startsWith('matrix'))return `${q.rows.length} meyar × ${q.columns.length} ${q.type==='matrix_text'?'daxiletmə xanası':'cavab variantı'}`;
  return '<div class="fake-line">Cavab üçün sahə...</div>';
}

function properties(q){
  const s=state.builder;
  if(!q.settings)q.settings={};
  const withOpts=['single','multiple','dropdown','image_choice','ranking','bestworst','text_ab','image_ab','fill_blank'].includes(q.type);
  const withRows=['matrix','matrix_multi','matrix_dropdown','matrix_text','multitext'].includes(q.type);
  const numericLike=['slider','rating','stars','nps','likert','number','currency','percentage','short_text'].includes(q.type);
  const textLike=['short_text','paragraph','name','email','phone','address'].includes(q.type);
  const unitGroups=[...new Set(MEASURE_UNITS.map(x=>x.group))];

  return `
    <button class="btn btn-sm property-close" data-action="close-properties">${ico('close',14)} Paneli bağla</button>
    <div class="builder-panel-title">SUAL PARAMETRLƏRİ</div>
    <h3 class="prop-title">${esc(typeLabel(q.type))}</h3>
    <p class="prop-desc">Sualın məzmununu, ölçü vahidlərini və qəbul meyarlarını tənzimləyin.</p>
    <div class="prop-fields">
      <div class="field"><label>Sual mətni</label><textarea data-builder-field="title" data-qid="${q.id}">${esc(q.title)}</textarea></div>
      <div class="field"><label>İzah / köməkçi mətn</label><textarea data-builder-field="description" data-qid="${q.id}" style="min-height:60px">${esc(q.description)}</textarea></div>
      <label class="toggle-wrap"><input class="toggle" type="checkbox" data-builder-field="required" data-qid="${q.id}" ${q.required?'checked':''}> Məcburi sual</label>
      <div class="field"><label>Bölmə</label><select data-builder-field="sectionId" data-qid="${q.id}">${s.sections.map(x=>`<option value="${x.id}" ${q.sectionId===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></div>
      ${withOpts?`
        <div class="prop-divider"></div>
        <div class="field">
          <label>${q.type==='fill_blank'?'Cümlələr və boşluq sahələri (hər sətirdə bir)':'Cavab variantları (hər sətirdə bir variant)'}</label>
          <textarea data-builder-field="options" data-qid="${q.id}" style="min-height:125px">${esc(q.options.map(x=>x.label).join('\n'))}</textarea>
          ${q.type==='fill_blank'?`<small>Mətn daxilində <b>____</b> (alt xətt) və ya <b>[ ]</b> yazaraq doldurula bilən boşluq sahəsi yarada bilərsiniz. Məsələn: <i>"Yaz zamanı ____ kq kartof əkmişəm."</i></small>`:`<small>İstədiyiniz qədər variant daxil edin.</small>`}
        </div>
        ${['image_choice','image_ab'].includes(q.type)?`
          <div class="prop-divider"></div>
          <div class="prop-section-title">${ico('grid',14)} VİZUAL ŞƏKİLLƏRİN İDARƏ EDİLMƏSİ</div>
          <p class="note" style="margin:4px 0 10px;font-size:11.5px">Hər bir variant üçün kompüterdən birbaşa şəkil yükləyə və ya şəkil linki daxil edə bilərsiniz.</p>
          <div class="opt-images-list">
            ${q.options.map((opt,optIdx)=>`
              <div class="opt-image-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-subtle,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:8px;margin-bottom:8px">
                <div class="opt-image-thumb-wrap" style="width:48px;height:48px;flex-shrink:0;background:#eee;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid #cbd5e1">
                  ${opt.image?`<img src="${esc(opt.image)}" style="width:100%;height:100%;object-fit:cover" alt="${esc(opt.label)}">`:`<span style="font-size:18px;opacity:0.5">🖼️</span>`}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:12.5px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(opt.label||`Variant ${optIdx+1}`)}</div>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <label class="btn btn-sm" style="cursor:pointer;padding:3px 8px;font-size:11px;margin:0;display:inline-flex;align-items:center;gap:4px">
                      ${ico('upload',12)} Kompüterdən seç
                      <input type="file" accept="image/*" class="opt-img-file-input" data-qid="${q.id}" data-opt-idx="${optIdx}" style="display:none">
                    </label>
                    <input type="text" class="opt-img-url-input" data-qid="${q.id}" data-opt-idx="${optIdx}" value="${esc(opt.image||'')}" placeholder="və ya şəkil URL-i" style="flex:1;min-width:100px;padding:3px 6px;font-size:11.5px;height:28px">
                    ${opt.image?`<button type="button" class="btn btn-sm btn-icon" data-action="clear-opt-img" data-qid="${q.id}" data-opt-idx="${optIdx}" title="Şəkli sil" style="height:28px;width:28px">${ico('trash',12)}</button>`:''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `:''}
      `:''}
      ${withRows?`
        <div class="prop-divider"></div>
        <div class="field">
          <label>${q.type==='multitext'?'Mətn sahələrinin adları':q.type==='matrix_text'?'Cədvəl meyarları / sətirlər':'Matris sətirləri'} (hər sətirdə bir)</label>
          <textarea data-builder-field="rows" data-qid="${q.id}">${esc(q.rows.join('\n'))}</textarea>
          ${q.type==='matrix_text'?`<small>Birinci sütunda əks olunacaq meyarlar (məsələn: Bakı kartofu, Cəlilabad kartofu...)</small>`:''}
        </div>
        ${q.type!=='multitext'?`
          <div class="field">
            <label>${q.type==='matrix_text'?'Sütun başlıqları':'Matris sütunları'} (hər sətirdə bir)</label>
            <textarea data-builder-field="columns" data-qid="${q.id}">${esc(q.columns.join('\n'))}</textarea>
            ${q.type==='matrix_text'?`<small>Operatorun qarşısında dolduracağı sütun başlıqları (məsələn: 0-100, 100-200, 200-300...)</small>`:''}
          </div>
        `:''}
      `:''}
      ${numericLike?`
        <div class="prop-divider"></div>
        <div class="prop-section-title">${ico('sort',14)} ÖLÇÜ VAHİDİ VƏ RƏQƏM MEYARLARI</div>
        <div class="field">
          <label>Ölçü vahidi (Seçim və ya xüsusi)</label>
          <select data-builder-field="unit" data-qid="${q.id}">
            ${unitGroups.map(grp=>`
              <optgroup label="${esc(grp)}">
                ${MEASURE_UNITS.filter(u=>u.group===grp).map(u=>`
                  <option value="${u.id}" ${(q.settings.unit||'none')===u.id?'selected':''}>${esc(u.label)}</option>
                `).join('')}
              </optgroup>
            `).join('')}
          </select>
          <small>Ölçü vahidi sualda respondent və operatora əyani şəkildə göstərilir.</small>
        </div>
        ${q.settings.unit==='custom'?`
          <div class="field">
            <label>Xüsusi ölçü vahidinin adı</label>
            <input data-builder-field="customUnit" data-qid="${q.id}" value="${esc(q.settings.customUnit||'')}" placeholder="Məsələn: barel, tay, bağlama, yeşik...">
          </div>
        `:''}
        <div class="form-grid">
          <div class="field">
            <label>Minimum hədd (Limit)</label>
            <input type="number" data-builder-field="min" data-qid="${q.id}" value="${esc(q.settings.min??'')}" placeholder="Məs: 1000">
            <small>Bu həddən aşağı qəbul edilməyəcək.</small>
          </div>
          <div class="field">
            <label>Maksimum hədd</label>
            <input type="number" data-builder-field="max" data-qid="${q.id}" value="${esc(q.settings.max??'')}" placeholder="Məs: 50000">
            <small>Bu həddən yuxarı qəbul edilməyəcək.</small>
          </div>
        </div>
        ${['number','currency','percentage','slider'].includes(q.type)?`
          <div class="field">
            <label>Addım dəyəri (Step)</label>
            <input type="number" min="0.0001" step="any" data-builder-field="step" data-qid="${q.id}" value="${esc(q.settings.step??(q.type==='number'?1:''))}" placeholder="Məsələn: 1 və ya 0.1">
          </div>
        `:''}
      `:''}
      ${textLike?`
        <div class="prop-divider"></div>
        <div class="prop-section-title">${ico('edit',14)} HƏRF VƏ MƏTN MEYARLARI</div>
        <div class="field">
          <label>Mətn meyarı və format qaydası</label>
          <select data-builder-field="textRule" data-qid="${q.id}">
            ${TEXT_RULES.map(r=>`<option value="${r.id}" ${(q.settings.textRule||'none')===r.id?'selected':''}>${esc(r.label)}</option>`).join('')}
          </select>
          <small>Daxil edilən cavab yalnız bu meyara uyğun olduqda qəbul olunacaq.</small>
        </div>
        ${['min_chars','char_range'].includes(q.settings.textRule)?`
          <div class="field">
            <label>Minimum simvol sayı</label>
            <input type="number" min="1" data-builder-field="minChars" data-qid="${q.id}" value="${esc(q.settings.minChars??'')}" placeholder="Məsələn: 5">
          </div>
        `:''}
        ${['max_chars','char_range'].includes(q.settings.textRule)?`
          <div class="field">
            <label>Maksimum simvol sayı</label>
            <input type="number" min="1" data-builder-field="maxChars" data-qid="${q.id}" value="${esc(q.settings.maxChars??'')}" placeholder="Məsələn: 200">
          </div>
        `:''}
        ${q.settings.textRule==='min_words'?`
          <div class="field">
            <label>Minimum söz sayı</label>
            <input type="number" min="1" data-builder-field="minWords" data-qid="${q.id}" value="${esc(q.settings.minWords??3)}" placeholder="Məsələn: 3">
            <small>Fikir və rəylər üçün tələb olunan ən azı söz sayı.</small>
          </div>
        `:''}
      `:''}
      ${(numericLike||textLike)?`
        <div class="field">
          <label>Fərdi xəbərdarlıq / xəta mesajı (Könüllü)</label>
          <input data-builder-field="errorMessage" data-qid="${q.id}" value="${esc(q.settings.errorMessage||'')}" placeholder="Məs: Dəyər 1000 kq-dan aşağı ola bilməz...">
          <small>Boş saxlasanız, sistem avtomatik olaraq aydın standart xəbərdarlıq mətni göstərəcək.</small>
        </div>
      `:''}
      ${q.type==='multiple'?`<div class="field"><label>Maksimum seçim sayı (0 = limitsiz)</label><input type="number" min="0" max="100" data-builder-field="maxSelect" data-qid="${q.id}" value="${esc(q.settings.maxSelect??0)}"></div>`:''}
      <div class="prop-divider"></div>
      <div class="field">
        <label>Şərtli göstərilmə</label>
        <select data-builder-field="conditionQuestion" data-qid="${q.id}">
          <option value="">Həmişə göstər</option>
          ${s.questions.filter(x=>x.id!==q.id).map(x=>`<option value="${x.id}" ${q.condition?.questionId===x.id?'selected':''}>${esc(x.title.slice(0,60))}</option>`).join('')}
        </select>
        <small>Bu sual yalnız əvvəlki sualın cavabından asılı olaraq göstərilə bilər.</small>
      </div>
      ${q.condition?`
        <div class="field">
          <label>Müqayisə</label>
          <select data-builder-field="conditionOperator" data-qid="${q.id}">
            ${[['equals','Bərabərdir'],['not_equals','Bərabər deyil'],['contains','Ehtiva edir'],['not_empty','Boş deyil'],['empty','Boşdur']].map(([v,n])=>`<option value="${v}" ${q.condition.operator===v?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Cavab dəyəri</label><input data-builder-field="conditionValue" data-qid="${q.id}" value="${esc(q.condition.value)}" placeholder="Məsələn: Bəli"></div>
      `:''}
    </div>
    <div class="hint">${ico('info',14)} Suallar seçilərək nizamlanır. Dəyişikliklər "Yadda saxla" düyməsi ilə serverə yazılır.</div>`;
}

function builderPreview(){
  const s=state.builder;
  return `
    <div class="preview-banner">${ico('eye',16)} Önizləmə — doldurulan cavablar yadda saxlanmır.</div>
    <div class="card" style="overflow:hidden">
      <div class="interview-hero">
        <div class="tiny">ÖNİZLƏMƏ / ${s.estimatedMinutes} dəqiqə</div>
        <h2>${esc(s.title)}</h2>
        <p>${esc(s.description)}</p>
      </div>
      <div class="interview-section">
        ${s.sections.map((sec,i)=>`
          <h3 style="margin:25px 0 10px">${i+1}. ${esc(sec.title)}</h3>
          ${s.questions.filter(q=>q.sectionId===sec.id).map(q=>renderAnswer(q,{},true)).join('')}
        `).join('')}
      </div>
    </div>`;
}

// ——— DYNAMIC SURVEY RENDERER ———
const qVal=(answers,id)=>answers[id];
function variantFor(q,seedId){
  const options=q.options||[];
  return options.length?options[(q.id.charCodeAt(0)+(seedId?.charCodeAt(0)||0))%options.length]:null;
}

function renderAnswer(q,answers={},preview=false){
  const val=qVal(answers,q.id),type=q.type,opts=q.options||[];
  const min=Number(q.settings?.min??0),max=Math.min(100,Math.max(min+1,Number(q.settings?.max??10)));
  const checked=v=>Array.isArray(val)?val.includes(v):String(val??'')===String(v);
  const disabled=preview?'disabled':'';
  let html='';const questionId=esc(q.id);

  function options(checkbox=false,image=false){
    const raw=type==='yesno'?[{label:'Bəli'},{label:'Xeyr'}]:opts;
    return `
      <div class="choice-grid">
        ${raw.map(o=>`
          <label class="choice-card ${checked(o.label)?'selected':''}" ${image?'style="align-items:start;flex-direction:column"':''}>
            ${image&&o.image?`<img src="${esc(o.image)}" loading="lazy" alt="${esc(o.label)}" style="width:100%;height:100px;object-fit:cover;border-radius:7px">`:''}
            <span class="gap10">
              <input type="${checkbox?'checkbox':'radio'}" name="ans_${questionId}" data-answer="${questionId}" ${checked(o.label)?'checked':''} value="${esc(o.label)}" ${disabled}>
              ${esc(o.label)}
            </span>
          </label>
        `).join('')}
      </div>`;
  }

  if(['single','multiple','yesno','image_choice'].includes(type))html=options(type==='multiple',type==='image_choice');
  else if(type==='dropdown')html=`<select class="answer-input" data-answer="${questionId}" ${disabled}><option value="">Variant seçin...</option>${opts.map(o=>`<option value="${esc(o.label)}" ${checked(o.label)?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
  else if(type==='image_ab'){
    const variant=variantFor(q,'seed');
    const imgSrc=variant?.image||DEMO_IMG_A;
    html=`
      <div class="ab-card-visual" style="margin:0 0 12px;padding:14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;text-align:center">
        <div style="display:inline-block;padding:2px 10px;font-size:11px;font-weight:700;color:#6366f1;background:#eef2ff;border-radius:12px;margin-bottom:10px">🖼️ A/B VİZUAL DİZAYN VƏ ETİKET TESTİ</div>
        <div style="margin:8px 0"><img src="${esc(imgSrc)}" alt="${esc(variant?.label||'Dizayn')}" style="max-width:100%;max-height:220px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);object-fit:contain"></div>
        <div style="font-weight:600;font-size:13.5px;color:#1e293b;margin-top:6px">${esc(variant?.label||'Vizual Variant')}</div>
      </div>
      <div class="choice-grid">
        <label class="choice-card ${(val?.answer==='Bəli'||checked('Bəli'))?'selected':''}"><input type="radio" name="ans_${questionId}" data-answer="${questionId}" value="Bəli" ${(val?.answer==='Bəli'||checked('Bəli'))?'checked':''} ${disabled}> Bəyəndim (Müsbət)</label>
        <label class="choice-card ${(val?.answer==='Xeyr'||checked('Xeyr'))?'selected':''}"><input type="radio" name="ans_${questionId}" data-answer="${questionId}" value="Xeyr" ${(val?.answer==='Xeyr'||checked('Xeyr'))?'checked':''} ${disabled}> Bəyənmədim (Mənfi)</label>
      </div>`;
  }
  else if(type==='text_ab'){
    const variant=variantFor(q,'seed');
    html=`
      <div class="ab-card-text" style="margin:0 0 12px;padding:16px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px">
        <div style="display:inline-block;padding:2px 10px;font-size:11px;font-weight:700;color:#059669;background:#ecfdf5;border-radius:12px;margin-bottom:8px">📝 A/B MƏTN VƏ ŞÜAR TESTİ</div>
        <div style="font-size:14.5px;font-weight:500;line-height:1.5;color:#1e293b;border-left:3px solid #10b981;padding-left:12px;margin:6px 0">"${esc(variant?.label||'Mətn variantı yoxdur')}"</div>
      </div>
      <div class="choice-grid">
        <label class="choice-card ${(val?.answer==='Bəli'||checked('Bəli'))?'selected':''}"><input type="radio" name="ans_${questionId}" data-answer="${questionId}" value="Bəli" ${(val?.answer==='Bəli'||checked('Bəli'))?'checked':''} ${disabled}> Uyğundur (Bəyəndim)</label>
        <label class="choice-card ${(val?.answer==='Xeyr'||checked('Xeyr'))?'selected':''}"><input type="radio" name="ans_${questionId}" data-answer="${questionId}" value="Xeyr" ${(val?.answer==='Xeyr'||checked('Xeyr'))?'checked':''} ${disabled}> Uyğun deyil (Bəyənmədim)</label>
      </div>`;
  }
  else if(['rating','nps','likert'].includes(type))html=`<div class="rating-group">${Array.from({length:Math.min(21,max-min+1)},(_,i)=>min+i).map(n=>`<button type="button" class="rating-btn ${Number(val)===n?'active':''}" data-action="numeric-answer" data-qid="${questionId}" data-value="${n}" ${disabled}>${n}</button>`).join('')}</div>${type==='nps'?'<div class="range-row mt12" style="max-width:445px"><span>Heç tövsiyə etmərəm</span><span>Mütləq tövsiyə edərəm</span></div>':''}`;
  else if(type==='stars')html=`<div class="star-rating">${Array.from({length:Math.min(10,max)},(_,i)=>i+1).map(n=>`<button type="button" class="${Number(val)>=n?'active':''}" data-action="numeric-answer" data-qid="${questionId}" data-value="${n}" ${disabled}>★</button>`).join('')}</div>`;
  else if(type==='slider')html=`<input class="answer-range" data-answer="${questionId}" type="range" min="${min}" max="${max}" step="${Number(q.settings?.step)||1}" value="${val??min}" ${disabled}><div class="range-row"><span>${min}</span><b class="slider-value" data-for="${questionId}" style="color:#6656e9">${val??min}</b><span>${max}</span></div>`;
  else if(type==='consent')html=`<label class="choice-card" style="max-width:470px"><input type="checkbox" data-answer="${questionId}" value="Bəli" ${checked('Bəli')?'checked':''} ${disabled}> Razılıq verirəm</label>`;
  else if(type==='fill_blank'){
    const blankRegex=/_{2,}|\[\s*\]|\{\s*\}|\.{3,}/g;
    html=`<div class="fillblank-container">${opts.map((o,optIdx)=>{
      const text=o.label||`Variant ${optIdx+1}`;
      const hasBlank=blankRegex.test(text);
      let rendered='';
      if(hasBlank){
        let count=0;
        rendered=esc(text).replace(/(_{2,}|\[\s*\]|\{\s*\}|\.{3,})/g,()=>{
          const key=count===0?o.id:`${o.id}_${count}`;
          const currentVal=(typeof val==='object'&&val)?(val[key]??''):'';
          count++;
          return `<input type="text" class="answer-input fillblank-input" data-answer="${questionId}" data-blank-id="${esc(key)}" value="${esc(currentVal)}" placeholder="______" ${disabled}>`;
        });
      }else{
        const currentVal=(typeof val==='object'&&val)?(val[o.id]??''):'';
        rendered=`${esc(text)} <input type="text" class="answer-input fillblank-input" data-answer="${questionId}" data-blank-id="${esc(o.id)}" value="${esc(currentVal)}" placeholder="______" ${disabled}>`;
      }
      return `<div class="fillblank-row"><span class="fillblank-text">${rendered}</span></div>`;
    }).join('')||'<div class="note">Variant və ya cümlə əlavə edilməyib.</div>'}</div>`;
  }
  else if(type.startsWith('matrix')){
    const rows=q.rows||[],cols=q.columns||[],multi=type==='matrix_multi',drop=type==='matrix_dropdown',isText=type==='matrix_text';
    html=`<div class="matrix-wrap"><table class="matrix ${isText?'matrix-text-table':''}"><thead><tr><th style="min-width:160px">Meyarlar</th>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><td class="matrix-row-title"><b>${esc(row)}</b></td>${isText?cols.map(col=>`<td class="matrix-cell-td"><input type="text" class="answer-input matrix-cell-input" data-answer="${questionId}" data-row="${esc(row)}" data-col="${esc(col)}" value="${esc((val?.[row]||{})[col]||'')}" placeholder="______" ${disabled}></td>`).join(''):drop?`<td colspan="${cols.length}" style="padding:8px 12px"><select class="answer-input" style="height:36px" data-answer="${questionId}" data-row="${esc(row)}" ${disabled}><option value="">Seçin...</option>${cols.map(col=>`<option value="${esc(col)}" ${(val||{})[row]===col?'selected':''}>${esc(col)}</option>`).join('')}</select></td>`:cols.map(col=>`<td class="matrix-choice-td"><label class="matrix-choice-label"><input type="${multi?'checkbox':'radio'}" class="matrix-round-input" name="mx_${questionId}_${esc(row)}" data-answer="${questionId}" data-row="${esc(row)}" value="${esc(col)}" ${multi?(Array.isArray((val||{})[row])&&(val||{})[row].includes(col)?'checked':''):((val||{})[row]===col?'checked':'')} ${disabled}></label></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  else if(type==='multitext')html=(q.rows||[]).map(row=>`<div class="multitext-row"><label>${esc(row)}</label><input class="answer-input" data-answer="${questionId}" data-row="${esc(row)}" value="${esc((val||{})[row]||'')}" placeholder="Cavabı daxil edin" ${disabled}></div>`).join('');
  else if(type==='ranking')html=`<p class="note">Hər variant üçün sıralama nömrəsi seçin (1 ən yüksəkdir).</p>${opts.map((o,i)=>`<div class="multitext-row"><label style="flex:1">${esc(o.label)}</label><select class="answer-input" style="max-width:110px" data-answer="${questionId}" data-row="${esc(o.label)}" ${disabled}><option value="">Sıra</option>${opts.map((_,j)=>`<option value="${j+1}" ${String((val||{})[o.label]||'')===String(j+1)?'selected':''}>${j+1}</option>`).join('')}</select></div>`).join('')}`;
  else if(type==='bestworst')html=`<div class="form-grid"><div class="field"><label>Ən yaxşı</label><select class="answer-input" data-answer="${questionId}" data-row="best" ${disabled}><option value="">Seçin...</option>${opts.map(o=>`<option value="${esc(o.label)}" ${(val||{}).best===o.label?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div><div class="field"><label>Ən pis</label><select class="answer-input" data-answer="${questionId}" data-row="worst" ${disabled}><option value="">Seçin...</option>${opts.map(o=>`<option value="${esc(o.label)}" ${(val||{}).worst===o.label?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div></div>`;
  else if(type==='file')html=`<input type="file" data-file-answer="${questionId}" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx" ${disabled}><p class="note">Maksimum 2 MB, JPG / PNG / WebP / PDF / DOCX.${val?` <b>Fayl əlavə edilib.</b>`:''}</p>`;
  else if(type==='paragraph'||type==='address')html=`<textarea class="answer-input answer-textarea" data-answer="${questionId}" placeholder="Cavabı buraya yazın..." ${disabled}>${esc(val??'')}</textarea>`;
  else {
    const inputType=({email:'email',phone:'tel',number:'number',currency:'number',percentage:'number',date:'date',time:'time',datetime:'datetime-local'})[type]||'text';
    const unit=getQuestionUnit(q);
    const stepAttr=q.settings?.step?`step="${esc(q.settings.step)}"`:(['number','currency','percentage'].includes(type)?`step="${type==='number'?1:'.01'}"`:'');
    const minAttr=q.settings?.min!==undefined&&q.settings.min!==''?`min="${esc(q.settings.min)}"`:(type==='percentage'?'min="0"':'');
    const maxAttr=q.settings?.max!==undefined&&q.settings.max!==''?`max="${esc(q.settings.max)}"`:(type==='percentage'?'max="100"':'');
    const ph=unit?`Cavabı daxil edin (${unit})...`:'Cavabı daxil edin...';
    if(unit){
      html=`<div class="unit-input-group"><input class="answer-input" type="${inputType}" ${stepAttr} ${minAttr} ${maxAttr} data-answer="${questionId}" value="${esc(val??'')}" placeholder="${esc(ph)}" ${disabled}><span class="input-unit-badge">${esc(unit)}</span></div>`;
    }else{
      html=`<input class="answer-input" type="${inputType}" ${stepAttr} ${minAttr} ${maxAttr} data-answer="${questionId}" value="${esc(val??'')}" placeholder="${esc(ph)}" ${disabled}>`;
    }
  }
  const hints=[];
  const unitStr=getQuestionUnit(q);
  if(q.settings?.min!==undefined&&q.settings?.min!==''&&q.settings?.min!==null){
    hints.push(`Minimum: <b>${esc(q.settings.min)}${unitStr?' '+esc(unitStr):''}</b>`);
  }
  if(q.settings?.max!==undefined&&q.settings?.max!==''&&q.settings?.max!==null){
    hints.push(`Maksimum: <b>${esc(q.settings.max)}${unitStr?' '+esc(unitStr):''}</b>`);
  }
  if(q.settings?.textRule&&q.settings.textRule!=='none'){
    const ruleObj=TEXT_RULES.find(r=>r.id===q.settings.textRule);
    if(ruleObj){
      if(q.settings.textRule==='min_words'&&q.settings.minWords)hints.push(`Ən azı <b>${esc(q.settings.minWords)} söz</b>`);
      else if(q.settings.textRule==='min_chars'&&q.settings.minChars)hints.push(`Ən azı <b>${esc(q.settings.minChars)} simvol</b>`);
      else if(q.settings.textRule==='max_chars'&&q.settings.maxChars)hints.push(`Ən çox <b>${esc(q.settings.maxChars)} simvol</b>`);
      else if(q.settings.textRule==='char_range')hints.push(`Simvol: <b>${esc(q.settings.minChars||0)} - ${esc(q.settings.maxChars||'∞')}</b>`);
      else hints.push(esc(ruleObj.label.split('(')[0].trim()));
    }
  }
  const hintHtml=hints.length?`<div class="criteria-badge-row">${hints.map(h=>`<span class="criteria-badge highlight">${ico('check',12)} ${h}</span>`).join('')}</div>`:'';

  return `<div class="answer-question" data-question="${questionId}"><div class="answer-qtitle">${esc(q.title)} ${q.required?'<span class="required">*</span>':''}</div>${q.description?`<div class="answer-desc">${esc(q.description)}</div>`:''}${html}${hintHtml}</div>`;
}

function conditionMatch(q,answers){
  if(!q.condition)return true;
  let value=answers[q.condition.questionId];
  let str=Array.isArray(value)?value.join(', '):value&&typeof value==='object'?Object.values(value).flatMap(x=>typeof x==='object'&&x?Object.values(x):x).join(', '):String(value??'');
  switch(q.condition.operator){
    case'equals':return Array.isArray(value)?value.includes(q.condition.value):str===q.condition.value;
    case'not_equals':return str!==q.condition.value;
    case'contains':return str.includes(q.condition.value);
    case'not_empty':return str.trim()!=='';
    case'empty':return str.trim()==='';
    default:return true;
  }
}

function activeQuestions(){
  const s=state.interview.survey;
  return s.questions.filter(q=>q.sectionId===s.sections[state.interviewIndex].id&&conditionMatch(q,state.interview.answers));
}

// ——— LOCAL STORAGE DRAFT & RECOVERY HELPERS ———
function saveInterviewDraft(){
  if(!state.interview||!state.interview.survey)return;
  try{
    const sId=state.interview.survey.id;
    const data={
      surveyId:sId,
      respondentName:state.interview.respondentName||'',
      respondentPhone:state.interview.respondentPhone||'',
      answers:state.interview.answers||{},
      interviewIndex:state.interviewIndex||0,
      startTime:state.interview.startTime||Date.now()
    };
    localStorage.setItem('sp_draft_interview_'+sId,JSON.stringify(data));
    localStorage.setItem('sp_active_interview_id',sId);
  }catch{}
}

function restoreInterviewDraft(targetSurveyId){
  try{
    const sId=targetSurveyId||localStorage.getItem('sp_active_interview_id');
    if(!sId)return false;
    const raw=localStorage.getItem('sp_draft_interview_'+sId);
    if(!raw)return false;
    const data=JSON.parse(raw);
    const survey=state.surveys.find(s=>s.id===sId);
    if(!survey||survey.status!=='active')return false;
    state.interview={
      survey,
      respondentName:data.respondentName||'',
      respondentPhone:data.respondentPhone||'',
      answers:data.answers||{},
      startTime:Number(data.startTime)||Date.now()
    };
    state.interviewIndex=Math.max(0,Math.min(survey.sections.length-1,Number(data.interviewIndex)||0));
    state.interviewDone=false;
    state.dirty=true;
    return true;
  }catch{return false;}
}

function clearInterviewDraft(surveyId){
  try{
    if(surveyId)localStorage.removeItem('sp_draft_interview_'+surveyId);
    const active=localStorage.getItem('sp_active_interview_id');
    if(!surveyId||active===surveyId)localStorage.removeItem('sp_active_interview_id');
  }catch{}
}

function savePublicSurveyDraft(surveyId){
  if(!surveyId)return;
  try{
    const data={
      answers:state.publicSurveyAnswers||{},
      index:state.publicSurveyIndex||0,
      startTime:state.publicSurveyStartTime||Date.now()
    };
    localStorage.setItem('sp_pub_draft_'+surveyId,JSON.stringify(data));
  }catch{}
}

function restorePublicSurveyDraft(surveyId){
  try{
    const raw=localStorage.getItem('sp_pub_draft_'+surveyId);
    if(!raw)return false;
    const data=JSON.parse(raw);
    if(data&&typeof data==='object'&&data.answers){
      state.publicSurveyAnswers=data.answers||{};
      state.publicSurveyIndex=Math.max(0,Number(data.index)||0);
      state.publicSurveyStartTime=Number(data.startTime)||Date.now();
      return true;
    }
  }catch{return false;}
}

function clearPublicSurveyDraft(surveyId){
  try{
    if(surveyId)localStorage.removeItem('sp_pub_draft_'+surveyId);
  }catch{}
}

// ——— DIRECT SURVEY INTERVIEW FLOW ———
function startDirectInterview(surveyId){
  if(!surveyId){
    const firstActive=state.surveys.find(s=>s.status==='active');
    surveyId=firstActive?.id;
  }
  const survey=state.surveys.find(s=>s.id===surveyId);
  if(!survey)return notify('Aktiv sorğu tapılmadı.',true);
  const restored=restoreInterviewDraft(surveyId);
  if(!restored){
    state.interview={
      survey,
      respondentName:'',
      respondentPhone:'',
      answers:{},
      startTime: Date.now()
    };
    state.interviewIndex=0;
    state.interviewDone=false;
    state.dirty=false;
    saveInterviewDraft();
  } else {
    notify('Davam edən müsahibə bərpa edildi. Qaldığınız yerdən davam edirsiniz.');
  }
  state.page='interview';
  if(location.hash!=='#/interview'){
    location.hash='#/interview';
  }
  render();
  window.scrollTo(0,0);
}

function interviewPage(){
  const x=state.interview;
  if(!x)return empty('surveys','Müsahibə seçilməyib','Sorğular səhifəsindən aktiv sorğu seçin.');
  if(state.interviewDone)return `<div class="card" style="max-width:680px;margin:60px auto">${successPage()}</div>`;
  const {survey:s}=x,sec=s.sections[state.interviewIndex],p=(state.interviewIndex+1)/s.sections.length*100;

  return `
    ${heading('CANLI MÜSAHİBƏ',esc(s.title),'Cavabları daxil edin. Hər respondentə sərf olunan vaxt avtomatik qeydə alınır.',`
      <button class="btn" data-action="nav" data-page="surveys">${ico('back',15)} Sorğulara qayıt</button>
    `)}
    <div class="interview-layout">
      <div class="card interview-main">
        <div class="interview-hero">
          <div class="tiny">BÖLMƏ ${state.interviewIndex+1} / ${s.sections.length} · CANLI SORĞU</div>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.description||'Müsahibəni ardıcıllıqla tamamlayın.')}</p>
          <div class="steps">${s.sections.map((_,i)=>`<button data-action="interview-step" data-index="${i}" class="${i===state.interviewIndex?'active':i<state.interviewIndex?'done':''}" title="${i+1}-ci bölmə"></button>`).join('')}</div>
        </div>
        <div class="interview-section">
          <div class="gap10" style="justify-content:space-between">
            <div><h3>${esc(sec.title)}</h3><p class="muted">${esc(sec.description||'Sualları ardıcıllıqla cavablandırın.')}</p></div>
            <span class="pill">${Math.round(p)}%</span>
          </div>
          ${activeQuestions().map(q=>renderAnswer(q,x.answers,false)).join('')||`<p class="note" style="padding:20px">Bu bölmədə göstəriləcək sual yoxdur.</p>`}
          <div id="interview-warning"></div>
        </div>
        <div class="interview-foot">
          <div class="gap10">
            <button class="btn" data-action="interview-prev" ${state.interviewIndex===0?'disabled':''}>${ico('back',14)} Geri</button>
          </div>
          <button class="btn btn-primary" data-action="interview-next">
            ${state.interviewIndex===s.sections.length-1?'Tamamla və göndər':'Növbəti bölmə'} ${ico(state.interviewIndex===s.sections.length-1?'check':'arrow',15)}
          </button>
        </div>
      </div>
      <div class="interview-aside">
        <div class="card person-card">
          <div class="person-head">
            <div class="person-avatar">${ico('clock',22)}</div>
            <div>
              <small style="color:#64748b;font-weight:750">SƏRF OLUNAN VAXT</small>
              <div id="timer-display" style="font-size:24px;font-weight:850;color:#4f46e5;letter-spacing:1px">00:00</div>
            </div>
          </div>
          <div class="separator"></div>
          <div class="field">
            <label>Respondent (Ad / Qeyd) <span style="font-weight:normal;color:#64748b">(Könüllü)</span></label>
            <input id="interview-name-input" value="${esc(x.respondentName||'')}" placeholder="Boş qalsa avtomatik ardıcıl nömrələnir...">
          </div>
          <div class="field">
            <label>Əlaqə nömrəsi <span style="font-weight:normal;color:#64748b">(Könüllü)</span></label>
            <input id="interview-phone-input" value="${esc(x.respondentPhone||'')}" placeholder="+994...">
          </div>
        </div>
        <div class="card person-card mt20">
          <div class="aside-title">Sorğu bölmələri</div>
          <div class="step-list">
            ${s.sections.map((sc,i)=>`
              <button class="step-item ${i===state.interviewIndex?'active':i<state.interviewIndex?'done':''}" data-action="interview-step" data-index="${i}">
                <span>${i<state.interviewIndex?'✓':i+1}</span>${esc(sc.title)}
              </button>
            `).join('')}
          </div>
          <div class="question-note">
            ${ico('info',14)} Müsahibə yekunlaşdıqda vaxt dərhal hesabat reyestrinə və əməkdaşın ümumi sərf etdiyi vaxta əlavə olunur.
          </div>
        </div>
      </div>
    </div>`;
}

function successPage(){
  const x=state.interview;
  const durSec=Math.round((Date.now()-x.startTime)/1000);
  return `
    <div class="success-state">
      <div class="confirm-illustration">${ico('check',34)}</div>
      <h2>Müsahibə tamamlandı!</h2>
      <p>Cavablar sistemə ardıcıl və etibarlı şəkildə qeydə alındı.<br>Bu müsahibəyə sərf olunan vaxt: <b class="time-spent-badge" style="font-size:14px">${ico('clock',14)} ${formatTimeSpent(durSec)}</b></p>
      <div class="gap10" style="justify-content:center;margin:28px auto 5px;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" data-action="next-direct-interview" data-id="${x.survey.id}">
          ${ico('plus',16)} Növbəti müsahibəyə başla
        </button>
        <button class="btn" data-action="nav" data-page="surveys">
          ${ico('surveys',15)} Bütün sorğular
        </button>
        ${isLeader()?`
          <button class="btn" data-action="open-report" data-id="${x.survey.id}">
            ${ico('chart',15)} Hesabata bax
          </button>
        `:''}
      </div>
    </div>`;
}

function checkSection(){
  for(const q of activeQuestions()){
    const val=state.interview.answers[q.id];
    const err=validateQuestionAnswer(q,val);
    if(err)return err;
  }
  return '';
}

function updateAnswer(node){
  const id=node.dataset.answer;
  if(!id)return;
  if(state.page==='public_survey'&&state.publicSurvey){
    const q=state.publicSurvey.questions.find(q=>q.id===id);
    if(!q)return;
    let v;
    if(node.dataset.blankId){
      v={...(state.publicSurveyAnswers[id]||{})};
      v[node.dataset.blankId]=node.value;
    } else if(node.dataset.row){
      v={...(state.publicSurveyAnswers[id]||{})};
      const row=node.dataset.row;
      if(q.type==='matrix_text'&&node.dataset.col){
        const col=node.dataset.col;
        v[row]={...(v[row]||{})};
        v[row][col]=node.value;
      } else if(q.type==='matrix_multi'){
        const checked=$$(`[data-answer="${CSS.escape(id)}"][data-row="${CSS.escape(row)}"]:checked`).map(x=>x.value);
        v[row]=checked;
      } else v[row]=node.value;
    } else if(node.type==='checkbox'){
      if(q.type==='consent')v=node.checked?'Bəli':'';
      else v=$$(`input[data-answer="${CSS.escape(id)}"]:checked`).map(x=>x.value);
    } else if(node.type==='range'||['number','currency','percentage'].includes(q.type)){
      v=node.value===''?'':Number(node.value);
    } else if(q.type==='text_ab'||q.type==='image_ab'){
      v={variant:variantFor(q,'public')?.label||'',answer:node.value};
    } else {
      v=node.value;
    }
    state.publicSurveyAnswers[id]=v;
    savePublicSurveyDraft(state.publicSurvey.id);
    if(node.type==='range'){$(`.slider-value[data-for="${id}"]`)?.replaceChildren(document.createTextNode(v));}
    if(['radio','checkbox','select-one'].includes(node.type)&&!node.dataset.row&&!node.dataset.blankId)renderPublicSurvey();
    return;
  }
  if(!state.interview||state.page!=='interview')return;
  const q=state.interview.survey.questions.find(q=>q.id===id);
  if(!q)return;
  let v;
  if(node.dataset.blankId){
    v={...(state.interview.answers[id]||{})};
    v[node.dataset.blankId]=node.value;
  } else if(node.dataset.row){
    v={...(state.interview.answers[id]||{})};
    const row=node.dataset.row;
    if(q.type==='matrix_text'&&node.dataset.col){
      const col=node.dataset.col;
      v[row]={...(v[row]||{})};
      v[row][col]=node.value;
    } else if(q.type==='matrix_multi'){
      const checked=$$(`[data-answer="${id}"][data-row="${CSS.escape(row)}"]:checked`).map(x=>x.value);
      v[row]=checked;
    } else v[row]=node.value;
  } else if(node.type==='checkbox'){
    if(q.type==='consent')v=node.checked?'Bəli':'';
    else v=$$(`input[data-answer="${id}"]:checked`).map(x=>x.value);
  } else if(node.type==='range'||['number','currency','percentage'].includes(q.type))v=node.value===''?'':Number(node.value);
  else if(q.type==='text_ab'||q.type==='image_ab')v={variant:variantFor(q,'seed')?.label||'',answer:node.value};
  else v=node.value;
  state.interview.answers[id]=v;
  state.dirty=true;
  saveInterviewDraft();
  if(node.type==='range'){$(`.slider-value[data-for="${id}"]`)?.replaceChildren(document.createTextNode(v));}
  if(['radio','checkbox','select-one'].includes(node.type)&&!node.dataset.row&&!node.dataset.blankId)render();
}

async function finishInterview(){
  const x=state.interview;
  for(let i=0;i<x.survey.sections.length;i++){
    state.interviewIndex=i;
    const err=checkSection();
    if(err){
      render();
      notify(err,true);
      const warn=$('#interview-warning');
      if(warn)warn.innerHTML=`<div class="page-error">${ico('info',14)} ${esc(err)}</div>`;
      return;
    }
  }
  const nameInput=$('#interview-name-input');
  const phoneInput=$('#interview-phone-input');
  const respondentName=nameInput?.value?.trim()||'';
  const respondentPhone=phoneInput?.value?.trim()||'';
  const durationSec=Math.round((Date.now()-x.startTime)/1000);

  try{
    await api('/api/surveys/'+x.survey.id+'/responses',{
      answers: x.answers,
      durationSec,
      contactId: null,
      respondentName,
      respondentPhone,
      status: 'completed'
    });
    clearInterviewDraft(x.survey.id);
    state.dirty=false;
    await refresh();
    state.interviewDone=true;
    render();
    notify(`Sorğu tamamlandı! Sərf olunan vaxt: ${formatTimeSpent(durationSec)}.`);
  }catch(err){
    const isOffline = !navigator.onLine || /network|failed to fetch/i.test(err.message||'');
    if (isOffline) {
      notify('İnternet bağlantısı kəsildi! Seçimləriniz cihazınızda təhlükəsiz saxlanıldı. Bağlantı bərpa olunduqda yenidən "Sorğunu yekunlaşdır" düyməsinə klikləyin.', true);
      const warn=$('#interview-warning');
      if(warn)warn.innerHTML=`<div class="page-error" style="background:#fee2e2;color:#991b1b;border:1px solid #f87171">${ico('info',16)} İnternet bağlantısı kəsilib. Qeyd etdiyiniz bütün cavablar cihazda saxlanıldı. Bağlantı bərpa olunduqda yenidən təsdiq edin.</div>`;
    } else {
      notify(err.message||'Müsahibə saxlanılarkən xəta baş verdi.',true);
    }
  }
}

// ——— PUBLIC STANDALONE SURVEY INTERFACE ———
async function loadPublicSurvey(id){
  state.page='public_survey';
  state.publicSurvey=null;
  state.publicSurveyAnswers={};
  state.publicSurveyIndex=0;
  state.publicSurveyDone=false;
  state.publicSurveyError='';
  state.publicSurveyLoading=true;
  state.publicSurveyStartTime=Date.now();
  renderPublicSurvey();
  try{
    const res=await request('/api/public/surveys/'+id);
    state.publicSurvey=res.survey;
    state.publicSurveyLoading=false;
    const restored=restorePublicSurveyDraft(id);
    if(restored){
      notify('Əvvəlki seçimləriniz bərpa edildi. Qaldığınız yerdən davam edirsiniz.');
    }
    renderPublicSurvey();
  }catch(err){
    state.publicSurveyLoading=false;
    state.publicSurveyError=err.message||'Sorğu yüklənə bilmədi.';
    renderPublicSurvey();
  }
}

function renderPublicSurvey(){
  if(state.publicSurveyLoading){
    $('#app').innerHTML=`
      <div class="boot-screen">
        <div class="boot-logo">S<span>+</span></div>
        <div class="boot-txt">SORĞU YÜKLƏNİR...</div>
        <div class="boot-loader"></div>
      </div>`;
    return;
  }
  if(state.publicSurveyError){
    $('#app').innerHTML=`
      <div class="public-survey-wrap">
        <div class="public-survey-container" style="text-align:center;padding:50px 30px">
          <div style="font-size:46px;color:#ef4444;margin-bottom:15px">⚠️</div>
          <h2 style="font-size:23px;margin-bottom:10px">Sorğu əlçatan deyil</h2>
          <p style="color:var(--muted);max-width:440px;margin:12px auto 25px;line-height:1.7">${esc(state.publicSurveyError)}</p>
          <a href="#/login" class="btn btn-primary">${ico('lock',16)} Sistemə daxil ol</a>
        </div>
      </div>`;
    return;
  }
  if(state.publicSurveyDone){
    $('#app').innerHTML=`
      <div class="public-survey-wrap">
        <div class="public-survey-container" style="text-align:center;padding:60px 30px">
          <div class="confirm-illustration" style="margin:0 auto 20px">${ico('check',36)}</div>
          <h2 style="font-size:26px;margin-bottom:10px">Təşəkkür edirik!</h2>
          <p style="color:var(--muted);font-size:15px;max-width:480px;margin:0 auto 25px;line-height:1.7">Cavablarınız uğurla qeydə alındı. Sorğuda iştirak etdiyiniz üçün minnətdarıq.</p>
        </div>
      </div>`;
    return;
  }
  const s=state.publicSurvey;
  if(!s)return;
  const sec=s.sections[state.publicSurveyIndex]||s.sections[0];
  const qList=s.questions.filter(q=>q.sectionId===sec.id&&conditionMatch(q,state.publicSurveyAnswers));
  const progress=Math.round(((state.publicSurveyIndex+1)/s.sections.length)*100);

  $('#app').innerHTML=`
    <div class="public-survey-wrap">
      <div class="public-survey-container">
        <div class="public-survey-header">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span class="badge active" style="background:#ffffff22;color:white">${ico('spark',12)} İctimai Sorğu</span>
            <span style="font-size:12px;opacity:.9">${s.estimatedMinutes} dəqiqə</span>
          </div>
          <h1 style="font-size:25px;margin:0 0 8px;font-weight:800;color:white">${esc(s.title)}</h1>
          ${s.description?`<p style="margin:0;font-size:13px;opacity:.92;line-height:1.6">${esc(s.description)}</p>`:''}
          <div class="steps" style="margin-top:20px">
            ${s.sections.map((_,i)=>`<button class="${i===state.publicSurveyIndex?'active':i<state.publicSurveyIndex?'done':''}" style="height:6px;border-radius:4px"></button>`).join('')}
          </div>
        </div>
        <div class="public-survey-body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <div>
              <h3 style="margin:0;font-size:17px">${esc(sec.title)}</h3>
              ${sec.description?`<p class="muted" style="margin:4px 0 0;font-size:12px">${esc(sec.description)}</p>`:''}
            </div>
            <span class="pill">${progress}%</span>
          </div>
          ${qList.map(q=>renderAnswer(q,state.publicSurveyAnswers,false)).join('')||'<p class="note">Bu bölmədə göstəriləcək sual yoxdur.</p>'}
          <div id="public-survey-error"></div>
        </div>
        <div class="public-survey-footer">
          <button class="btn" data-action="public-survey-prev" ${state.publicSurveyIndex===0?'disabled':''}>${ico('back',15)} Əvvəlki</button>
          <button class="btn btn-primary" data-action="public-survey-next">
            ${state.publicSurveyIndex===s.sections.length-1?'Sorğunu tamamla və göndər':'Növbəti bölmə'} ${ico(state.publicSurveyIndex===s.sections.length-1?'check':'arrow',16)}
          </button>
        </div>
      </div>
    </div>`;
}

function checkPublicSection(){
  const s=state.publicSurvey;
  const sec=s.sections[state.publicSurveyIndex];
  const qList=s.questions.filter(q=>q.sectionId===sec.id&&conditionMatch(q,state.publicSurveyAnswers));
  for(const q of qList){
    const val=state.publicSurveyAnswers[q.id];
    const err=validateQuestionAnswer(q,val);
    if(err)return err;
  }
  return '';
}

async function submitPublicSurvey(){
  const s=state.publicSurvey;
  for(let i=0;i<s.sections.length;i++){
    state.publicSurveyIndex=i;
    const err=checkPublicSection();
    if(err){
      renderPublicSurvey();
      notify(err,true);
      const warn=$('#public-survey-error');
      if(warn)warn.innerHTML=`<div class="page-error">${ico('info',14)} ${esc(err)}</div>`;
      return;
    }
  }
  const durationSec=Math.round((Date.now()-state.publicSurveyStartTime)/1000);
  try{
    await api('/api/public/surveys/'+s.id,{answers:state.publicSurveyAnswers,durationSec});
    clearPublicSurveyDraft(s.id);
    state.publicSurveyDone=true;
    renderPublicSurvey();
    notify('Sorğu uğurla tamamlandı. Təşəkkür edirik!');
  }catch(err){
    const isOffline = !navigator.onLine || /network|failed to fetch/i.test(err.message||'');
    if (isOffline) {
      notify('İnternet bağlantısı kəsildi! Cavablarınız cihazınızda qorunub saxlanıldı. Bağlantı bərpa edildikdən sonra yenidən göndərin.', true);
      const warn=$('#public-survey-error');
      if(warn)warn.innerHTML=`<div class="page-error" style="background:#fee2e2;color:#991b1b;border:1px solid #f87171">${ico('info',16)} İnternet bağlantısı kəsilib. Seçimləriniz cihazınızda təhlükəsiz saxlanıldı. Bağlantı bərpa edildikdən sonra sorğunu yenidən göndərə bilərsiniz.</div>`;
    } else {
      notify(err.message||'Xəta baş verdi',true);
    }
  }
}

// ——— MODALS ———
function openModal(title,subtitle,body,formName=''){
  const div=document.createElement('div');
  div.className='overlay';div.id='modal-overlay';
  div.innerHTML=`
    <div class="modal ${formName==='import'?'modal-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>
        <button class="modal-x" data-action="close-modal">${ico('close',18)}</button>
      </div>
      <form data-modal-form="${esc(formName)}">
        <div class="modal-body">${body}</div>
        <div class="modal-foot">
          <button type="button" class="btn" data-action="close-modal">Ləğv et</button>
          <button type="submit" class="btn btn-primary">${ico('check',15)} Təsdiqlə</button>
        </div>
      </form>
    </div>`;
  document.body.append(div);
  div.addEventListener('click',e=>{if(e.target===div)div.remove();});
  div.querySelector('input:not([type=hidden]),textarea,select')?.focus();
}

function closeModal(){$('#modal-overlay')?.remove();}
function formVal(form){const obj={};new FormData(form).forEach((v,k)=>obj[k]=v);return obj;}

function contactModal(id,defaultSector=''){
  const c=state.contacts.find(c=>c.id===id)||{};
  const currentSector=c.surveyId||defaultSector||(state.selectedSector!=='all'&&state.selectedSector!=='unassigned'?state.selectedSector:'');
  openModal(id?'Respondenti redaktə et':'Yeni respondent','Əlaqə məlumatlarını və sorğu sektorunu daxil edin.',`
    <input type="hidden" name="id" value="${esc(c.id||'')}">
    <div class="form-grid">
      <div class="field full"><label>Ad və soyad *</label><input name="fullName" required maxlength="150" value="${esc(c.fullName||'')}" placeholder="Məsələn: Leyla Məmmədova"></div>
      <div class="field"><label>Telefon *</label><input name="phone" type="tel" required value="${esc(c.phone||'')}" placeholder="+994 50 123 45 67"></div>
      <div class="field"><label>Region</label><input name="region" value="${esc(c.region||'')}" placeholder="Bakı"></div>
      <div class="field full">
        <label>Sorğu sektoru (Bazada ayrıca sektor)</label>
        <select name="surveyId">
          <option value="">Ümumi sektor (Təyinsiz)</option>
          ${state.surveys.map(s=>`
            <option value="${s.id}" ${currentSector===s.id?'selected':''}>${esc(s.title)} sektoru</option>
          `).join('')}
        </select>
        <small>Bu respondent seçilmiş sorğunun sektorunda yerləşdiriləcək.</small>
      </div>
      <div class="field full"><label>E-poçt</label><input name="email" type="email" value="${esc(c.email||'')}" placeholder="example@mail.az"></div>
      <div class="field full"><label>Qeyd</label><textarea name="notes">${esc(c.notes||'')}</textarea></div>
    </div>`,'contact');
}

function userModal(id){
  const u=state.users.find(u=>u.id===id)||{};
  openModal(id?'Əməkdaşı redaktə et':'Yeni əməkdaş','Rol və giriş məlumatlarını idarə edin.',`
    <input name="id" type="hidden" value="${esc(u.id||'')}">
    <div class="form-grid">
      <div class="field full"><label>Ad və soyad *</label><input name="name" required value="${esc(u.name||'')}" placeholder="Ad Soyad"></div>
      <div class="field"><label>İstifadəçi adı *</label><input name="username" ${id?'disabled':''} ${id?'':'required'} value="${esc(u.username||'')}" placeholder="operator3"></div>
      <div class="field">
        <label>Rol</label>
        <select name="role">
          <option value="agent" ${u.role==='agent'?'selected':''}>Operator</option>
          <option value="editor" ${u.role==='editor'?'selected':''}>Redaktor</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Administrator</option>
        </select>
      </div>
      <div class="field full">
        <label>${id?'Yeni şifrə (dəyişmək istəmirsinizsə boş buraxın)':'Şifrə (ən azı 10 simvol) *'}</label>
        <input name="password" type="password" autocomplete="new-password" ${id?'':'required'} minlength="${id?0:10}" placeholder="Güclü şifrə">
      </div>
      ${id?`
        <div class="field full">
          <label>Hesab statusu</label>
          <select name="active">
            <option value="true" ${u.active?'selected':''}>Aktiv</option>
            <option value="false" ${!u.active?'selected':''}>Deaktiv</option>
          </select>
        </div>`:''}
    </div>`,'user');
}

function surveySettings(){
  const s=state.builder;
  openModal('Sorğu parametrləri','Əsas məlumatlar və yayımlanma vəziyyəti.',`
    <div class="form-grid">
      <div class="field full"><label>Sorğu adı *</label><input required name="title" value="${esc(s.title)}"></div>
      <div class="field full"><label>Təsvir</label><textarea name="description">${esc(s.description||'')}</textarea></div>
      <div class="field"><label>Kateqoriya</label><input name="category" value="${esc(s.category||'Ümumi')}"></div>
      <div class="field"><label>Təxmini müddət (dəqiqə)</label><input name="estimatedMinutes" min="1" max="180" type="number" value="${s.estimatedMinutes||5}"></div>
      <div class="field">
        <label>Status</label>
        <select name="status">
          ${['draft','active','paused','archived'].map(v=>`<option value="${v}" ${s.status===v?'selected':''}>${OUTCOME[v]}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Giriş icazəsi (Access)</label>
        <select name="access">
          <option value="public" ${s.access!=='private'?'selected':''}>Public (İctimai link aktivdir)</option>
          <option value="private" ${s.access==='private'?'selected':''}>Private (Yalnız daxili istifadəçilər)</option>
        </select>
      </div>
      <div class="field full"><label>Vurğu rəngi</label><input name="accent" type="color" value="${esc(s.accent||'#6756ea')}" style="padding:6px"></div>
    </div>`,'survey-settings');
}

function sectionModal(id){
  const sec=state.builder.sections.find(s=>s.id===id)||{};
  openModal(id?'Bölməni dəyiş':'Yeni bölmə','Sorğunu mövzular üzrə qruplaşdırın.',`
    <input name="id" type="hidden" value="${esc(sec.id||'')}">
    <div class="field"><label>Bölmə adı *</label><input name="title" required value="${esc(sec.title||'')}"></div>
    <div class="field"><label>İzah</label><textarea name="description">${esc(sec.description||'')}</textarea></div>`,'section');
}

function importModal(defaultSector=''){
  if(!isLeader())return notify('CSV idxalı üçün admin və ya redaktor icazəsi tələb olunur.',true);
  const targetSector=defaultSector||(state.selectedSector!=='all'&&state.selectedSector!=='unassigned'?state.selectedSector:'');
  openModal('Respondentlərin CSV idxalı','CSV faylında başlıqlar: fullName, phone, region, email, notes',`
    <div class="hint" style="margin-bottom:17px">İlk sətirdə sütun adları olmalıdır. <b>fullName</b> (və ya ad), <b>phone</b> (və ya telefon) mütləqdir. Ayırıcı kimi <b>,</b> və ya <b>;</b> dəstəklənir.</div>
    <div class="field">
      <label>Sorğu sektoru (İdxal ediləcək sektor)</label>
      <select name="surveyId" id="import-survey-id">
        <option value="">Ümumi sektor (Təyinsiz)</option>
        ${state.surveys.map(s=>`
          <option value="${s.id}" ${targetSector===s.id?'selected':''}>${esc(s.title)} sektoru</option>
        `).join('')}
      </select>
    </div>
    <div class="field"><label>CSV faylını seçin</label><input type="file" accept=".csv,text/csv" id="import-file" required style="padding:11px"></div>
    <div class="field"><label>Önizləmə</label><div id="import-preview" class="hint">Fayl seçilməyib.</div></div>`,'import');
}

function passwordModal(){
  openModal('Şifrəni dəyiş','Hesabınızı qorumaq üçün güclü şifrə istifadə edin.',`
    <div class="field"><label>Cari şifrə *</label><input name="oldPassword" type="password" required></div>
    <div class="field"><label>Yeni şifrə *</label><input name="newPassword" type="password" required minlength="10" placeholder="Ən azı 10 simvol"></div>
    <div class="field"><label>Yeni şifrə (təkrar) *</label><input name="confirm" type="password" required minlength="10"></div>`,'password');
}

function statusModal(id){
  const s=state.surveys.find(s=>s.id===id);
  if(!s)return;
  openModal('Sorğu statusu və idarəetmə','Statusu dəyişin və ya sorğunu sistemdən tamamilə silin.',`
    <input type="hidden" name="id" value="${esc(id)}">
    <div class="field">
      <label>Yeni status</label>
      <select name="status">
        ${['draft','active','paused','archived'].map(x=>`<option value="${x}" ${s.status===x?'selected':''}>${OUTCOME[x]}</option>`).join('')}
      </select>
    </div>
    <div class="separator" style="margin:20px 0 16px"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#fff1f2;border:1px solid #ffdbe0;border-radius:10px">
      <div>
        <strong style="color:#d94c5c;font-size:12px;display:block">Sorğunu birdəfəlik sil</strong>
        <span style="color:#64748b;font-size:11px">Bu sorğu və əlaqəli məlumatlar tamamilə silinəcək</span>
      </div>
      <button type="button" class="btn btn-danger btn-sm" data-action="delete-survey" data-id="${esc(id)}">
        ${ico('trash',13)} Sorğunu sil
      </button>
    </div>`,'status');
}

function responseDetails(id){
  const r=state.report?.responses?.find(x=>x.id===id);
  if(!r)return;
  const survey=state.surveys.find(s=>s.id===state.report.survey.id);
  openModal('Müsahibə cavabları və vaxtı',`${r.contact} · ${fmtTime(r.submittedAt)} · Sərf olunan vaxt: ${formatTimeSpent(r.durationSec)}`,
    `<div style="max-height:55vh;overflow:auto">
      <div class="highlight-box" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>Əməkdaş: <b>${esc(r.agent)}</b> &nbsp;|&nbsp; Müddət: <b>${formatTimeSpent(r.durationSec)}</b></div>
        ${isLeader()?`<button type="button" class="btn btn-sm btn-primary" data-action="edit-response-sheet" data-id="${r.id}">${ico('edit',13)} Sorğu vərəqəsini redaktə et</button>`:''}
      </div>
      ${survey.questions.map((q,i)=>`
        <div class="info-pair" style="display:block">
          <b style="display:block;margin-bottom:9px">${i+1}. ${esc(q.title)}</b>
          <span>${esc(typeof r.answers[q.id]==='object'?JSON.stringify(r.answers[q.id]):r.answers[q.id]??'—')}</span>
        </div>
      `).join('')}
    </div>`,'read-only');
  $('.modal-foot')?.remove();
}

function renderQuestionEditField(q, ans){
  if(q.type==='fill_blank'&&Array.isArray(q.options)){
    const obj=typeof ans==='object'&&ans?ans:{};
    return `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${q.options.map(o=>`
          <div style="display:flex;align-items:center;gap:10px;font-size:12px;background:#ffffff;padding:8px 10px;border-radius:6px;border:1px solid #e2e8f0">
            <span style="flex:1;font-weight:500;color:#334155">${esc(o.label)}</span>
            <input data-qans-blank="${q.id}" data-blank-id="${o.id}" value="${esc(obj[o.id]||'')}" style="width:130px;height:32px;font-size:12px" placeholder="Cavab...">
          </div>
        `).join('')}
      </div>
    `;
  }
  if(q.type==='matrix_text'&&Array.isArray(q.rows)&&Array.isArray(q.columns)){
    const obj=typeof ans==='object'&&ans?ans:{};
    return `
      <div style="overflow-x:auto">
        <table class="table" style="font-size:12px;background:#ffffff">
          <thead><tr><th>Meyar</th>${q.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>
            ${q.rows.map(r=>`
              <tr>
                <td><b>${esc(r)}</b></td>
                ${q.columns.map(c=>`
                  <td>
                    <input data-qans-matrix="${q.id}" data-row="${esc(r)}" data-col="${esc(c)}" value="${esc((obj[r]||{})[c]||'')}" style="width:90px;height:30px;padding:3px 6px;font-size:12px;text-align:center" placeholder="...">
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  if(q.options&&q.options.length&&q.type==='single'){
    return `
      <select data-qans="${q.id}">
        <option value="">-- Seçilməyib --</option>
        ${q.options.map(o=>`<option value="${esc(o.label)}" ${ans===o.label?'selected':''}>${esc(o.label)}</option>`).join('')}
      </select>
    `;
  }
  if(q.options&&q.options.length&&q.type==='multiple'){
    const arr=Array.isArray(ans)?ans:(ans?[ans]:[]);
    return `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${q.options.map(o=>`
          <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer">
            <input type="checkbox" data-qans-multi="${q.id}" value="${esc(o.label)}" ${arr.includes(o.label)?'checked':''}>
            <span>${esc(o.label)}</span>
          </label>
        `).join('')}
      </div>
    `;
  }
  if(q.type&&q.type.startsWith('matrix')){
    const jsonStr=typeof ans==='object'&&ans?JSON.stringify(ans,null,2):(ans||'');
    return `
      <textarea data-qans="${q.id}" rows="3" style="font-family:monospace;font-size:12px" placeholder='JSON formatında (Məs: {"Sətir 1": "Cavab 1"})'>${esc(jsonStr)}</textarea>
    `;
  }
  if(['paragraph','multitext'].includes(q.type)){
    return `<textarea data-qans="${q.id}" rows="3">${esc(ans??'')}</textarea>`;
  }
  return `<input data-qans="${q.id}" value="${esc(ans??'')}">`;
}

function editResponseSheetModal(id){
  closeModal();
  const r=state.report?.responses?.find(x=>x.id===id);
  if(!r)return notify('Müsahibə qeydi tapılmadı.',true);
  const survey=state.surveys.find(s=>s.id===state.report.survey.id);
  if(!survey)return notify('Sorğu tapılmadı.',true);

  const body=`
    <input type="hidden" name="responseId" value="${r.id}">
    <div class="highlight-box" style="margin-bottom:14px">
      Operator: <b>${esc(r.agent)}</b> &nbsp;|&nbsp; Tarix: <b>${fmtTime(r.submittedAt)}</b>
    </div>
    <div class="grid cols-2" style="gap:12px;margin-bottom:14px">
      <div class="field">
        <label>Respondent adı / qeyd</label>
        <input name="respondentName" value="${esc(r.contact||'')}">
      </div>
      <div class="field">
        <label>Əlaqə telefonu</label>
        <input name="respondentPhone" value="${esc(r.phone==='—'?'':r.phone||'')}">
      </div>
    </div>
    <div class="field" style="margin-bottom:16px">
      <label>Sərf olunan vaxt (saniyə)</label>
      <input type="number" name="durationSec" min="0" max="86400" value="${r.durationSec||0}">
    </div>
    <div class="separator" style="margin:16px 0"></div>
    <h4 style="margin:0 0 12px 0;font-size:15px;color:#1e1b4b">Suallar və Operatorun qeyd etdiyi cavablar:</h4>
    <div style="max-height:42vh;overflow-y:auto;padding-right:6px">
      ${survey.questions.map((q,i)=>{
        const ans=r.answers?.[q.id];
        return `
          <div class="field" style="margin-bottom:14px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">
            <label style="font-weight:700;color:#0f172a;margin-bottom:6px">${i+1}. ${esc(q.title)} <span style="font-weight:normal;color:#64748b">(${typeLabel(q.type)})</span></label>
            ${renderQuestionEditField(q, ans)}
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal('Sorğu vərəqəsini redaktə et', `№${r.seqNumber||'—'} · ${r.contact}`, body, 'edit-response');
}

function csvParse(text,delimiter=','){
  const lines=[];let row=[],value='',quotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'&&quotes&&text[i+1]==='"'){value+='"';i++;}
    else if(c==='"')quotes=!quotes;
    else if(!quotes&&(c===delimiter||c==='\n'||c==='\r')){
      if(c===delimiter){row.push(value);value='';}
      else if(c==='\n'){row.push(value);value='';if(row.some(x=>x.trim()))lines.push(row);row=[];}
    }else value+=c;
  }
  row.push(value);if(row.some(x=>x.trim()))lines.push(row);
  return lines;
}

function csvContacts(text){
  const firstLine=text.split(/\r?\n/)[0];
  const delim=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':',';
  const rows=csvParse(text.replace(/^\ufeff/,''),delim);
  const head=(rows.shift()||[]).map(x=>x.trim().toLowerCase());
  const col=(line,...names)=>{const i=head.findIndex(h=>names.some(n=>h===n));return i>=0?line[i]?.trim()||'':'';};
  return rows.map(line=>({fullName:col(line,'fullname','name','ad','ad soyad','ad və soyad','soyad'),phone:col(line,'phone','tel','telefon','mobil'),email:col(line,'email','e-poçt','e-mail'),region:col(line,'region','rayon','şəhər'),notes:col(line,'notes','qeyd')})).filter(x=>x.fullName&&x.phone);
}

// ——— USER INTERACTIONS ———
function findBuilderQ(id){return state.builder?.questions.find(q=>q.id===id);}
function updateBuilderField(el){
  const q=findBuilderQ(el.dataset.qid),key=el.dataset.builderField;
  if(!q)return;
  if(!q.settings)q.settings={};
  const v=el.type==='checkbox'?el.checked:el.value;
  switch(key){
    case'required':q.required=!!v;break;
    case'options':{const old=q.options||[],images=old.map(o=>o.image);q.options=String(v).split(/\r?\n/).filter(x=>x.trim()).slice(0,80).map((label,i)=>({id:old[i]?.id||mkId(),label:label.trim(),image:images[i]||''}));break;}
    case'images':{const images=String(v).split(/\r?\n/);q.options.forEach((o,i)=>o.image=images[i]||'');break;}
    case'rows':case'columns':q[key]=String(v).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);break;
    case'min':case'max':case'maxSelect':case'step':case'minChars':case'maxChars':case'minWords':{
      if(v===''||v==null||Number.isNaN(Number(v))){delete q.settings[key];}else{q.settings[key]=Number(v);}
      break;
    }
    case'unit':case'customUnit':case'textRule':case'errorMessage':{
      if(v===''||v==null||v==='none'){delete q.settings[key];}else{q.settings[key]=String(v).trim();}
      break;
    }
    case'conditionQuestion':q.condition=v?{questionId:v,operator:q.condition?.operator||'equals',value:q.condition?.value||''}:null;break;
    case'conditionOperator':if(q.condition)q.condition.operator=v;break;
    case'conditionValue':if(q.condition)q.condition.value=v;break;
    default:q[key]=v;
  }
  state.dirty=true;
  syncBuilderLive(q);
}

async function dispatchAction(el){
  const action=el.dataset.action,id=el.dataset.id;
  try{
    switch(action){
      case'nav':state.mobile=false;navigate(el.dataset.page);break;
      case'toggle-mobile':state.mobile=!state.mobile;render();break;
      case'close-mobile':state.mobile=false;render();break;
      case'logout':await api('/api/logout',{});state.user=null;state.report=null;state.builder=null;location.hash='';renderLogin();notify('Hesabdan çıxış edildi.');break;
      case'refresh':await refresh();render();notify('Məlumatlar yeniləndi.');break;
      case'start-survey':startDirectInterview(id||el.dataset.id||el.getAttribute('data-id'));break;
      case'next-direct-interview':startDirectInterview(id||el.dataset.id||state.interview?.survey?.id);break;
      case'start-survey-with-contact':startDirectInterview(el.dataset.surveyId);break;
      case'delete-survey':{
        if(!isLeader()){notify('Sorğunu yalnız administrator və ya redaktor silə bilər.',true);break;}
        const surveyId=id||el.dataset.id||el.getAttribute('data-id');
        const survey=state.surveys.find(s=>s.id===surveyId);
        const title=survey?.title||'bu sorğu';
        if(!confirm(`"${title}" adlı sorğunu sistemdən tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`))break;
        await api('/api/surveys/'+surveyId,{},'DELETE');
        closeModal();
        await refresh();
        if(state.page==='interview'&&state.interview?.survey?.id===surveyId){
          state.interview=null;
          navigate('surveys');
        }else{
          render();
        }
        notify('Sorğu sistemdən uğurla silindi.');
        break;
      }
      case'new-survey':{
        const newSecId=mkId();
        const s={title:'Yeni sorğu',description:'',category:'Ümumi',status:'draft',access:'public',estimatedMinutes:5,sections:[{id:newSecId,title:'Bölmə 1',description:''}],questions:[{id:mkId(),sectionId:newSecId,type:'single',title:'İlk sual',description:'',required:true,options:[{id:mkId(),label:'Variant 1',image:''},{id:mkId(),label:'Variant 2',image:''}],rows:[],columns:[],settings:{},condition:null}]};
        const r=await api('/api/surveys',s);await refresh();makeBuilder(r.survey);notify('Yeni sorğu yaradıldı.');break;
      }
      case'edit-survey':{const s=state.surveys.find(x=>x.id===id);if(s)makeBuilder(s);break;}
      case'duplicate-survey':{if(!confirm('Bu sorğunun surətini yaratmaq istəyirsiniz?'))break;const r=await api('/api/surveys/'+id+'/duplicate',{});await refresh();makeBuilder(r.survey);notify('Sorğunun surəti yaradıldı.');break;}
      case'survey-status':statusModal(id);break;
      case'copy-share-link':{
        if(!isAdmin()){notify('İctimai link yalnız administrator tərəfindən paylaşıla bilər.',true);break;}
        const link=`${window.location.origin}/#/s/${id}`;
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);}
        else{const ta=document.createElement('textarea');ta.value=link;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
        notify('İctimai sorğu linki kopyalandı.');break;
      }
      case'new-contact':contactModal(null,el.dataset.sector);break;
      case'edit-contact':contactModal(id);break;
      case'import-contacts':importModal(el.dataset.sector);break;
      case'new-user':userModal();break;
      case'edit-user':userModal(id);break;
      case'change-password':passwordModal();break;
      case'open-report':state.report=await request('/api/reports/'+id);state.reportSurveyId=id;state.reportTab='responses';render();break;
      case'close-report':state.report=null;render();break;
      case'report-tab':state.reportTab=el.dataset.tab;render();break;
      case'response-details':responseDetails(id);break;
      case'edit-response-sheet':editResponseSheetModal(id);break;
      case'export-report':
      case'export-report-excel':window.location.href='/api/export/'+id+'?format=excel';notify('Excel (.xls) ixracı başlanıldı.');break;
      case'export-report-csv':window.location.href='/api/export/'+id+'?format=csv';notify('CSV ixracı başlanıldı.');break;
      case'export-contacts-excel':{
        const sec=state.selectedSector!=='all'&&state.selectedSector!=='unassigned'?('&surveyId='+state.selectedSector):'';
        window.location.href='/api/export-contacts?format=excel'+sec;
        notify('Respondent bazasının Excel ixracı başlanıldı.');break;
      }
      case'export-audit-excel':window.location.href='/api/export-audit?format=excel';notify('Fəaliyyət tarixçəsinin Excel ixracı başlanıldı.');break;
      case'close-modal':closeModal();break;
      case'save-builder':{
        const r=await api('/api/surveys/'+state.builder.id,state.builder,'PUT');
        state.builder=r.survey;
        state.dirty=false;
        clearBuilderDraft(state.builder.id);
        await refresh();
        render();
        notify('Sorğu uğurla yadda saxlanıldı və təsdiqləndi.');
        break;
      }
      case'add-question':{
        const s=state.builder;
        const q=newQuestion(el.dataset.type,el.dataset.section||state.builderSection||s.sections[0]?.id);
        s.questions.push(q);
        state.builderQ=q.id;
        state.builderSection=q.sectionId;
        state.preview=false;
        state.propOpen=true;
        state.dirty=true;
        saveBuilderDraft();
        render();
        requestAnimationFrame(()=>{
          const newCard=$(`.q-card[data-id="${q.id}"]`);
          if(newCard)newCard.scrollIntoView({behavior:'smooth',block:'nearest'});
        });
        break;
      }
      case'select-question':{
        state.builderQ=id;
        state.builderSection=findBuilderQ(id)?.sectionId;
        state.preview=false;
        state.propOpen=true;
        const stage=$('.builder-stage');
        const propPanel=$('#property-panel');
        if(stage&&propPanel){
          $$('.q-card').forEach(card=>card.classList.toggle('selected',card.dataset.id===id));
          propPanel.classList.add('show');
          const q=findBuilderQ(id);
          propPanel.innerHTML=q?properties(q):`<div class="builder-panel-title">SUAL PARAMETRLƏRİ</div>${empty('edit','Sual seçin','Soldakı kitabxanadan sual əlavə edin və ya ortadakı sualı seçin.')}`;
          break;
        }
        render();
        break;
      }
      case'clone-question':{const i=state.builder.questions.findIndex(q=>q.id===id);const clone=structuredClone(state.builder.questions[i]);clone.id=mkId();clone.title+=' (surət)';state.builder.questions.splice(i+1,0,clone);state.builderQ=clone.id;state.propOpen=true;state.dirty=true;saveBuilderDraft();render();break;}
      case'delete-question':if(confirm('Bu sualı silmək istəyirsiniz?')){state.builder.questions=state.builder.questions.filter(q=>q.id!==id);state.builderQ=state.builder.questions[0]?.id||null;state.dirty=true;saveBuilderDraft();render();}break;
      case'move-question':{const s=state.builder,idx=s.questions.findIndex(q=>q.id===id),section=s.questions[idx].sectionId,matching=s.questions.map((q,i)=>q.sectionId===section?i:-1).filter(i=>i>=0),pos=matching.indexOf(idx),target=matching[pos+Number(el.dataset.direction)];if(target!==undefined){[s.questions[idx],s.questions[target]]=[s.questions[target],s.questions[idx]];state.dirty=true;saveBuilderDraft();render();}break;}
      case'clear-opt-img':{
        const q=findBuilderQ(el.dataset.qid);
        const optIdx=Number(el.dataset.optIdx);
        if(q&&q.options&&q.options[optIdx]){
          q.options[optIdx].image='';
          state.dirty=true;
          syncBuilderLive(q);
          const propPanel=$('#property-panel');
          if(propPanel)propPanel.innerHTML=properties(q);
          notify('Şəkil silindi.');
        }
        break;
      }
      case'add-section':sectionModal();break;
      case'edit-section':sectionModal(id);break;
      case'delete-section':{const s=state.builder;if(!confirm('Bölmə silinəcək. Bu bölmədəki suallar ilk bölməyə köçürüləcək.'))break;s.sections=s.sections.filter(x=>x.id!==id);s.questions.filter(q=>q.sectionId===id).forEach(q=>q.sectionId=s.sections[0].id);state.builderSection=s.sections[0].id;state.dirty=true;saveBuilderDraft();render();break;}
      case'open-properties':state.propOpen=true;render();break;
      case'close-properties':state.propOpen=false;render();break;
      case'survey-settings':surveySettings();break;
      case'builder-preview':state.preview=!state.preview;render();break;
      case'numeric-answer':{
        if(state.page==='public_survey'&&state.publicSurvey){
          state.publicSurveyAnswers[el.dataset.qid]=Number(el.dataset.value);
          savePublicSurveyDraft(state.publicSurvey.id);
          renderPublicSurvey();
        } else if(state.interview&&state.page==='interview'){
          state.interview.answers[el.dataset.qid]=Number(el.dataset.value);
          saveInterviewDraft();
          state.dirty=true;render();
        }
        break;
      }
      case'interview-prev':if(state.interviewIndex>0){state.interviewIndex--;saveInterviewDraft();render();}break;
      case'interview-step':state.interviewIndex=Number(el.dataset.index);saveInterviewDraft();render();break;
      case'interview-next':{
        const err=checkSection();
        if(err){notify(err,true);const warning=$('#interview-warning');if(warning)warning.innerHTML=`<div class="page-error">${ico('info',14)} ${esc(err)}</div>`;break;}
        if(state.interviewIndex===state.interview.survey.sections.length-1){
          if(confirm('Sorğunu yekunlaşdırmaq istəyirsiniz? Sərf olunan vaxt hesabatda qeydə alınacaq.'))await finishInterview();
        }else {state.interviewIndex++;saveInterviewDraft();render();window.scrollTo(0,0);}
        break;
      }
      case'public-survey-prev':if(state.publicSurveyIndex>0){state.publicSurveyIndex--;savePublicSurveyDraft(state.publicSurvey.id);renderPublicSurvey();window.scrollTo(0,0);}break;
      case'public-survey-next':{
        const err=checkPublicSection();
        if(err){notify(err,true);const warn=$('#public-survey-error');if(warn)warn.innerHTML=`<div class="page-error">${ico('info',14)} ${esc(err)}</div>`;break;}
        if(state.publicSurveyIndex===state.publicSurvey.sections.length-1){
          await submitPublicSurvey();
        }else{
          state.publicSurveyIndex++;savePublicSurveyDraft(state.publicSurvey.id);renderPublicSurvey();window.scrollTo(0,0);
        }
        break;
      }
      default:break;
    }
  }catch(e){notify(e.message,true);}
}

async function handleForm(form){
  const kind=form.dataset.modalForm,values=formVal(form);
  if(!kind)return;
  try{
    if(kind==='contact'){
      const url=values.id?'/api/contacts/'+values.id:'/api/contacts';
      await api(url,values,values.id?'PUT':'POST');
      notify('Respondent məlumatları saxlanıldı.');
    }
    else if(kind==='user'){
      const data={...values,active:values.active!=='false'};
      if(!values.password)delete data.password;
      await api(values.id?'/api/users/'+values.id:'/api/users',data,values.id?'PUT':'POST');
      notify('Əməkdaş hesabı saxlanıldı.');
    }
    else if(kind==='survey-settings'){
      Object.assign(state.builder,{title:values.title,description:values.description,category:values.category,status:values.status,access:values.access==='private'?'private':'public',estimatedMinutes:Number(values.estimatedMinutes),accent:values.accent});
      state.dirty=true;
      notify('Parametrlər redaktora tətbiq edildi. "Yadda saxla" düyməsini basın.');
    }
    else if(kind==='section'){
      const s=state.builder;let sec=s.sections.find(x=>x.id===values.id);
      if(sec){sec.title=values.title;sec.description=values.description;}
      else{sec={id:mkId(),title:values.title,description:values.description};s.sections.push(sec);}
      state.builderSection=sec.id;state.dirty=true;notify('Bölmə yeniləndi.');
    }
    else if(kind==='status'){
      const s=state.surveys.find(s=>s.id===values.id);
      await api('/api/surveys/'+s.id,{...s,status:values.status},'PUT');
      notify('Sorğu statusu dəyişdirildi.');
    }
    else if(kind==='edit-response'){
      const respId=values.responseId;
      const surveyId=state.report?.survey?.id;
      const survey=state.surveys.find(s=>s.id===surveyId);
      const answers={};
      form.querySelectorAll('[data-qans]').forEach(input=>{
        const qid=input.dataset.qans;
        const val=input.value.trim();
        const q=survey?.questions.find(x=>x.id===qid);
        if(q&&q.type.startsWith('matrix')){
          try{answers[qid]=JSON.parse(val);}catch{answers[qid]=val;}
        }else if(q&&['number','currency','percentage'].includes(q.type)){
          answers[qid]=val===''?'':Number(val);
        }else{
          answers[qid]=val;
        }
      });
      const multiGroups={};
      form.querySelectorAll('[data-qans-multi]:checked').forEach(cb=>{
        const qid=cb.dataset.qansMulti;
        if(!multiGroups[qid])multiGroups[qid]=[];
        multiGroups[qid].push(cb.value);
      });
      survey?.questions.filter(q=>q.type==='multiple').forEach(q=>{
        answers[q.id]=multiGroups[q.id]||[];
      });
      form.querySelectorAll('[data-qans-blank]').forEach(input=>{
        const qid=input.dataset.qansBlank;
        const bId=input.dataset.blankId;
        if(!answers[qid])answers[qid]={};
        answers[qid][bId]=input.value.trim();
      });
      form.querySelectorAll('[data-qans-matrix]').forEach(input=>{
        const qid=input.dataset.qansMatrix;
        const row=input.dataset.row;
        const col=input.dataset.col;
        if(!answers[qid])answers[qid]={};
        if(!answers[qid][row])answers[qid][row]={};
        answers[qid][row][col]=input.value.trim();
      });

      const data={
        respondentName: values.respondentName,
        respondentPhone: values.respondentPhone,
        durationSec: Number(values.durationSec)||0,
        answers
      };
      await api('/api/responses/'+respId, data, 'PUT');
      if(surveyId) state.report=await request('/api/reports/'+surveyId);
      closeModal();
      render();
      notify('Sorğu vərəqəsi uğurla yeniləndi.');
    }
    else if(kind==='password'){
      if(values.newPassword!==values.confirm)throw Error('Yeni şifrələr uyğun gəlmir.');
      await api('/api/me/password',{oldPassword:values.oldPassword,newPassword:values.newPassword},'PUT');
      closeModal();state.user=null;renderLogin();
      notify('Şifrə dəyişdirildi. Yenidən daxil olun.');return;
    }
    else if(kind==='import'){
      const file=$('#import-file')?.files?.[0];
      if(!file)throw Error('CSV faylı seçin.');
      const text=await file.text();
      const records=csvContacts(text);
      if(!records.length)throw Error('CSV-də fullName və phone sütunları üzrə məlumat tapılmadı.');
      const surveyId=$('#import-survey-id')?.value||'';
      const r=await api('/api/contacts/bulk',{contacts:records,surveyId});
      notify(`${r.count} respondent sektora idxal edildi.`);
    }
    else return;
    closeModal();
    if(['survey-settings','section'].includes(kind))render();
    else{await refresh();render();}
  }catch(e){notify(e.message,true);}
}

let searchDebounce=0;
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]');
  if(!action)return;
  e.preventDefault();e.stopPropagation();
  dispatchAction(action);
});

document.addEventListener('submit',async e=>{
  const form=e.target;
  if(form.id==='login-form'){
    e.preventDefault();
    const data=formVal(form),button=$('button[type=submit]',form);
    button.disabled=true;button.textContent='Yoxlanılır...';
    try{
      const out=await api('/api/login',data);
      state.user=out.user;
      await refresh();
      state.page='dashboard';
      location.hash='#/dashboard';
      render();
      notify('Sistemə uğurla daxil oldunuz.');
    }catch(error){
      const box=$('#login-error');
      if(box)box.innerHTML=`<div class="page-error">${esc(error.message)}</div>`;
    }finally{
      if(button){button.disabled=false;button.innerHTML=`Sistemə daxil ol ${ico('arrow',17)}`;}
    }
  }else if(form.dataset.modalForm){
    e.preventDefault();
    await handleForm(form);
  }
});

document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.builderField!==undefined){updateBuilderField(el);return;}
  if(el.classList.contains('opt-img-url-input')){
    const q=findBuilderQ(el.dataset.qid);
    const optIdx=Number(el.dataset.optIdx);
    if(q&&q.options&&q.options[optIdx]){
      q.options[optIdx].image=el.value.trim();
      state.dirty=true;
      syncBuilderLive(q);
      const row=el.closest('.opt-image-row');
      const thumbWrap=row?.querySelector('.opt-image-thumb-wrap');
      if(thumbWrap){
        thumbWrap.innerHTML=q.options[optIdx].image?`<img src="${esc(q.options[optIdx].image)}" style="width:100%;height:100%;object-fit:cover" alt="Thumb">`:`<span style="font-size:18px;opacity:0.5">🖼️</span>`;
      }
    }
    return;
  }
  if(el.id==='global-search'||el.dataset.localSearch!==undefined){
    state.filter=el.value;
    clearTimeout(searchDebounce);
    searchDebounce=setTimeout(()=>{
      const focus=el.id==='global-search'?'#global-search':'[data-local-search]';
      const pos=el.selectionStart;
      render();
      const input=$(focus);
      if(input){input.focus();try{input.setSelectionRange(pos,pos);}catch{}}
    },220);
    return;
  }
  if(el.id==='interview-name-input'){if(state.interview){state.interview.respondentName=el.value;saveInterviewDraft();}return;}
  if(el.id==='interview-phone-input'){if(state.interview){state.interview.respondentPhone=el.value;saveInterviewDraft();}return;}
  if(el.dataset.answer!==undefined){updateAnswer(el);return;}
});

document.addEventListener('change',async e=>{
  const el=e.target;
  if(el.classList.contains('opt-img-file-input')){
    try{
      const file=el.files?.[0];
      if(!file)return;
      if(file.size>2*1024*1024)throw new Error('Şəkil 2 MB-dan böyük ola bilməz.');
      if(!file.type.startsWith('image/'))throw new Error('Yalnız şəkil faylları (JPG, PNG, WebP) qəbul edilir.');
      const data=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result).split(',')[1]);
        reader.onerror=()=>reject(new Error('Fayl oxuna bilmədi.'));
        reader.readAsDataURL(file);
      });
      const result=await api('/api/uploads',{name:file.name,mime:file.type,data});
      const q=findBuilderQ(el.dataset.qid);
      const optIdx=Number(el.dataset.optIdx);
      if(q&&q.options&&q.options[optIdx]){
        q.options[optIdx].image=result.url;
        state.dirty=true;
        syncBuilderLive(q);
        const propPanel=$('#property-panel');
        if(propPanel)propPanel.innerHTML=properties(q);
        notify('Şəkil uğurla yükləndi və varianta tətbiq edildi.');
      }
    }catch(err){notify(err.message,true);}
    return;
  }
  if(el.id==='interview-contact-select'){
    const cId=el.value;
    const contact=state.contacts.find(c=>c.id===cId);
    if(contact){
      if(state.interview){
        state.interview.contact=contact;
        state.interview.respondentName=contact.fullName;
        state.interview.respondentPhone=contact.phone;
      }
      const nameInput=$('#interview-name-input');
      const phoneInput=$('#interview-phone-input');
      if(nameInput)nameInput.value=contact.fullName;
      if(phoneInput)phoneInput.value=contact.phone;
    }
    return;
  }
  if(el.dataset.builderField!==undefined){
    if(el.tagName==='SELECT'||el.type==='checkbox')render();
    return;
  }
  if(el.dataset.statusFilter!==undefined){state.statusFilter=el.value;render();return;}
  if(el.dataset.answer!==undefined){updateAnswer(el);return;}
  if(el.dataset.fileAnswer!==undefined){
    try{
      const file=el.files?.[0];
      if(!file)return;
      if(file.size>2*1024*1024)throw new Error('Fayl 2 MB-dan böyükdür.');
      const allowed=['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if(!allowed.includes(file.type))throw new Error('Yalnız JPG, PNG, WebP, PDF və DOCX yükləmək olar.');
      const data=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result).split(',')[1]);
        reader.onerror=()=>reject(new Error('Fayl oxuna bilmədi.'));
        reader.readAsDataURL(file);
      });
      const result=await api('/api/uploads',{name:file.name,mime:file.type,data});
      if(state.page==='public_survey')state.publicSurveyAnswers[el.dataset.fileAnswer]=result.id;
      else if(state.interview){state.interview.answers[el.dataset.fileAnswer]=result.id;state.dirty=true;}
      notify('Fayl uğurla əlavə edildi.');render();
    }catch(err){notify(err.message,true);}
    return;
  }
  if(el.id==='import-file'){
    const file=el.files?.[0];
    if(file){
      const text=await file.text();
      const records=csvContacts(text);
      const x=$('#import-preview');
      if(x)x.textContent=`${records.length} uyğun respondent müəyyən edildi. Fayl: ${file.name}`;
    }
  }
});

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

setInterval(()=>{
  if(state.page==='interview'&&state.interview){
    const sec=Math.round((Date.now()-state.interview.startTime)/1000);
    const el=$('#timer-display');
    if(el)el.textContent=formatDurationClock(sec);
  }
},1000);

window.addEventListener('hashchange',()=>{
  const hash=location.hash||'';
  const pubMatch=hash.match(/^#\/s\/([\w-]+)/);
  if(pubMatch){loadPublicSurvey(pubMatch[1]);}
  else if(state.user){
    if(hash==='#/interview'&&state.page==='interview'&&state.interview){
      return;
    }
    route();
  }
  else{renderLogin();}
});

window.addEventListener('online',()=>{notify('İnternet bağlantısı bərpa olundu.');});
window.addEventListener('offline',()=>{notify('İnternet bağlantısı kəsildi. Sorğu məlumatları cihazınızda təhlükəsiz saxlanılır.',true);});

window.addEventListener('beforeunload',e=>{
  if(state.builder&&state.page==='builder')saveBuilderDraft();
  if(state.interview&&state.page==='interview')saveInterviewDraft();
  if(state.publicSurvey&&state.page==='public_survey')savePublicSurveyDraft(state.publicSurvey.id);
  if(state.dirty&&['builder','interview'].includes(state.page)){e.preventDefault();e.returnValue='';}
});

init();

