'use strict';
const crypto=require('crypto');const {init,get,uid,iso,isProduction}=require('./store');
function hashPass(password,salt=crypto.randomBytes(16).toString('hex')){return salt+':'+crypto.scryptSync(password,salt,64).toString('hex');}
const option = label => ({id:uid(),label});
const q=(sectionId,type,title,extra={})=>({id:uid(),sectionId,type,title,description:'',required:true,options:[],rows:[],columns:[],settings:{},condition:null,...extra});
function seed(){
 // Never generate Internet-accessible demo accounts on a new production site.
 if (get()) return;
 if (isProduction && process.env.SEED_DEMO === 'true') {
   console.warn('⚠️ [XƏBƏRDARLIQ] İstehsalat serverində SEED_DEMO=true aktivdir.');
 }
 const demo = !isProduction && process.env.SEED_DEMO !== 'false';
 let password = (process.env.ADMIN_PASSWORD || '').trim();
 if (!demo && (!password || password.length < 8)) {
   password = 'Admin@2026!Initial';
   console.warn('\n⚠️ [XƏBƏRDARLIQ] İlk istehsalat quraşdırılmasında ADMIN_PASSWORD təyin edilməyib.');
   console.warn('   Serverin 503 verməməsi üçün ilkin administrator şifrəsi təyin edildi: ' + password);
   console.warn('   Hostinger hPanel > Environment Variables bölməsində ADMIN_PASSWORD təyin etməyiniz tövsiyə olunur.\n');
 }
 if (!password) password = 'Admin@2026!';
 const adminId=uid(),agentId=uid(),agent2Id=uid(),surveyId=uid();
 const sections=[{id:uid(),title:'Respondent haqqında',description:'Əsas demoqrafik məlumatlar'},{id:uid(),title:'Xidmətin qiymətləndirilməsi',description:'Məmnunluq və istifadə təcrübəsi'},{id:uid(),title:'Təklif və rəylər',description:'Əlavə suallar'}];
 const questions=[
 q(sections[0].id,'single','Hansı yaş qrupuna aidsiniz?',{options:['18–24','25–34','35–44','45–54','55+'].map(option)}),
 q(sections[0].id,'dropdown','Yaşadığınız region',{options:['Bakı','Abşeron','Gəncə–Daşkəsən','Quba–Xaçmaz','Lənkəran–Astara','Digər'].map(option)}),
 q(sections[0].id,'single','Xidmətimizdən daha əvvəl istifadə etmisiniz?',{options:['Bəli','Xeyr'].map(option)}),
 q(sections[1].id,'rating','Ümumi məmnunluğunuzu qiymətləndirin',{settings:{max:5}}),
 q(sections[1].id,'nps','Bizi tanışlarınıza tövsiyə etmə ehtimalınız nə qədərdir?',{settings:{min:0,max:10}}),
 q(sections[1].id,'multiple','Sizin üçün ən vacib amillər hansılardır?',{options:['Sürət','Keyfiyyət','Əlçatanlıq','Qiymət','Dəstək'].map(option),settings:{maxSelect:3}}),
 q(sections[1].id,'matrix','Aşağıdakı istiqamətləri qiymətləndirin',{rows:['Operatorun nəzakəti','Məlumatın aydınlığı','Xidmətin sürəti'],columns:['Çox pis','Pis','Orta','Yaxşı','Əla']}),
 q(sections[2].id,'paragraph','Xidməti təkmilləşdirmək üçün nə təklif edərdiniz?',{required:false}),
 q(sections[2].id,'yesno','Gələcək tədqiqatlarda iştirak etmək istərdiniz?',{required:false})
 ];
 const survey={id:surveyId,title:'Vətəndaş məmnuniyyəti sorğusu — 2026',description:'Telefon vasitəsilə xidmət keyfiyyətinin qiymətləndirilməsi.',category:'Məmnuniyyət',status:'active',language:'az',estimatedMinutes:6,sections,questions,createdBy:adminId,createdAt:iso(),updatedAt:iso(),accent:'#6756ea'};
 const s2sections=[{id:uid(),title:'Ümumi məlumatlar',description:''},{id:uid(),title:'Rəqəmsal xidmətlər',description:''}];
 const survey2={id:uid(),title:'Rəqəmsal xidmətlər üzrə araşdırma',description:'Yeni rəqəmsal həllərə dair potensial istifadəçi ehtiyacları.',category:'Araşdırma',status:'draft',language:'az',estimatedMinutes:8,sections:s2sections,questions:[q(s2sections[0].id,'single','Rəqəmsal xidmətlərdən nə qədər tez-tez istifadə edirsiniz?',{options:['Hər gün','Həftədə bir neçə dəfə','Nadir hallarda'].map(option)}),q(s2sections[1].id,'likert','Rəqəmsal xidmətlərdən istifadə etmək mənim üçün rahatdır.',{settings:{min:1,max:5}})],createdBy:adminId,createdAt:iso(),updatedAt:iso(),accent:'#16a798'};
 const users=[{id:adminId,username:process.env.ADMIN_USERNAME||'admin',name:'Sistem administratoru',role:'admin',passwordHash:hashPass(password),active:true,createdAt:iso()}, {id:agentId,username:'operator1',name:'Aysel Məmmədova',role:'agent',passwordHash:hashPass('Agent@2026!'),active:true,createdAt:iso()}, {id:agent2Id,username:'operator2',name:'Murad Əliyev',role:'agent',passwordHash:hashPass('Agent@2026!'),active:true,createdAt:iso()}];
 const names=['Nərmin Quliyeva','Elçin Həsənov','Günel Rzayeva','Kamal Cəfərov','Aygün Məmmədli','Rəşad Abbasov','Leyla Mustafayeva','Fərid Əhmədov','Sevda Hüseynova','Orxan Əliyev','Aytac Qasımova','Elnur İsmayılov','Ülkər Sultanova','Tural Rəhimov'];
 const contacts=names.map((name,i)=>({id:uid(),fullName:name,phone:'+994 50 '+String(200+i*11).padStart(3,'0')+' '+String(10+i).padStart(2,'0')+' '+String(20+i).padStart(2,'0'),email:'',region:['Bakı','Abşeron','Gəncə','Lənkəran'][i%4],notes:'',createdBy:adminId,createdAt:iso()}));
 const assignments=contacts.map((c,i)=>({id:uid(),surveyId,contactId:c.id,assignedTo:i%2===0?agentId:agent2Id,status:i<4?'completed':i===4?'callback':i===5?'no_answer':i===6?'refused':'pending',priority:i%4===0?'high':'normal',attempts:i<7?1:0,callbackAt:i===4?new Date(Date.now()+86400000).toISOString():null,notes:'',lastCallAt:i<7?new Date(Date.now()-(i+1)*86400000).toISOString():null,createdAt:new Date(Date.now()-(14-i)*86400000).toISOString(),updatedAt:iso()}));
 const responses=assignments.slice(0,4).map((a,i)=>({id:uid(),surveyId,assignmentId:a.id,contactId:a.contactId,agentId:a.assignedTo,answers:{[questions[0].id]:['25–34','35–44','18–24','45–54'][i],[questions[1].id]:['Bakı','Abşeron','Gəncə–Daşkəsən','Bakı'][i],[questions[2].id]:'Bəli',[questions[3].id]:[5,4,3,5][i],[questions[4].id]:[9,8,6,10][i],[questions[5].id]:['Sürət','Keyfiyyət'].map(x=>x),[questions[6].id]:{'Operatorun nəzakəti':'Əla','Məlumatın aydınlığı':'Yaxşı','Xidmətin sürəti':'Yaxşı'},[questions[7].id]:'Xidmətdən razıyam.',[questions[8].id]:'Bəli'},status:'completed',durationSec:210+i*53,startedAt:new Date(Date.now()-(i+3)*86400000).toISOString(),updatedAt:iso(),submittedAt:new Date(Date.now()-(i+3)*86400000).toISOString()}));
 const callLogs=assignments.slice(0,7).map((a,i)=>({id:uid(),assignmentId:a.id,agentId:a.assignedTo,outcome:a.status,notes:'Nümunə zəng qeydi',durationSec:185+i*17,createdAt:a.lastCallAt}));
 const ok=init({schemaVersion:1,
  users:demo?users:[users[0]],surveys:demo?[survey,survey2]:[],
  contacts:demo?contacts:[],assignments:demo?assignments:[],
  responses:demo?responses:[],callLogs:demo?callLogs:[],
  sessions:[],audit:[],uploads:[]});
 if(ok) console.log(demo ? '✓ Lokal demo məlumatları yaradıldı (yalnız test üçün).' : '✓ İstehsalat bazası yaradıldı: demo hesablar və demo respondentlər yoxdur.');
}
module.exports={seed,hashPass};
