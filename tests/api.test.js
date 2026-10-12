'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const net=require('node:net');
const project=path.resolve(__dirname,'..');
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});s.on('error',reject);});}
async function setup(){const port=await freePort(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sorgupro-test-'));const server=spawn(process.execPath,[path.join(project,'server/server.js')],{cwd:project,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:temp,ADMIN_PASSWORD:'UnitTest@2026!'},stdio:'ignore'});const base='http://127.0.0.1:'+port;let ready=false;for(let i=0;i<65;i++){await new Promise(r=>setTimeout(r,100));try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}}if(!ready)throw Error('Test server did not start');return {base,temp,server,close(){server.kill();fs.rmSync(temp,{recursive:true,force:true});}};}
async function login(base,username,password){const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
function request(base,cookie,method,route,payload){return fetch(base+route,{method,headers:{...(cookie?{Cookie:cookie}:{}) ,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});}

test('API integration · roles, forms, assignments, validation and exports',async t=>{
 const env=await setup();t.after(()=>env.close());const {base}=env;
 const admin=await login(base,'admin','UnitTest@2026!');const agent=await login(base,'operator1','Agent@2026!');
 assert.equal((await request(base,agent,'GET','/api/users')).status,403);
 let r=await request(base,admin,'POST','/api/surveys',{title:'Unit test survey',status:'active',access:'public',sections:[{id:'test-section',title:'Test'}],questions:[{id:'question-1',sectionId:'test-section',type:'single',title:'A or B?',required:true,options:[{id:'opt-a',label:'A'},{id:'opt-b',label:'B'}]}]});assert.equal(r.status,201);const surveyId=(await r.json()).survey.id;
 r=await request(base,admin,'POST','/api/contacts',{fullName:'Test contact',phone:'+994 50 555 55 55'});assert.equal(r.status,201);const contactId=(await r.json()).contact.id;
 r=await request(base,admin,'GET','/api/users');const users=(await r.json()).users,agentId=users.find(u=>u.username==='operator1').id;
 r=await request(base,admin,'POST','/api/assignments',{surveyId,assignedTo:agentId,contactIds:[contactId]});assert.equal((await r.json()).count,1);
 r=await request(base,agent,'GET','/api/assignments');const assignmentId=(await r.json()).assignments.find(a=>a.surveyId===surveyId).id;
 r=await request(base,agent,'PUT','/api/responses/assignment/'+assignmentId,{answers:{},status:'completed'});assert.equal(r.status,400);
 r=await request(base,agent,'PUT','/api/responses/assignment/'+assignmentId,{answers:{'question-1':'A'},status:'draft',durationSec:45});assert.equal(r.status,200);
 r=await request(base,agent,'PUT','/api/responses/assignment/'+assignmentId,{answers:{'question-1':'A'},status:'completed',durationSec:59});assert.equal(r.status,200);
 r=await request(base,agent,'PUT','/api/responses/assignment/'+assignmentId,{answers:{'question-1':'B'},status:'completed'});assert.equal(r.status,409);
 r=await request(base,admin,'GET','/api/reports/'+surveyId);assert.equal((await r.json()).completed,1);
 r=await request(base,admin,'GET','/api/export/'+surveyId);assert.equal(r.status,200);assert.ok(Buffer.from(await r.arrayBuffer()).subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])));
 r=await request(base,agent,'GET','/api/reports/'+surveyId);assert.equal(r.status,403);
});

test('Editor role, Audit log, Public survey link, and Multi-user assignment',async t=>{
 const env=await setup();t.after(()=>env.close());const {base}=env;
 const admin=await login(base,'admin','UnitTest@2026!');
 const editor=await login(base,'redaktor1','Editor@2026!');

 // 1. Editor can manage surveys
 let r=await request(base,editor,'POST','/api/surveys',{
   title:'Editor created survey',
   status:'active',
   access:'public',
   sections:[{id:'s1',title:'Sec 1'}],
   questions:[{id:'q1',sectionId:'s1',type:'single',title:'Sual 1?',required:true,options:[{id:'o1',label:'Bəli'},{id:'o2',label:'Xeyr'}]}]
 });
 assert.equal(r.status,201);
 const surveyId=(await r.json()).survey.id;

 // 2. Editor CANNOT create users (strictly forbidden)
 r=await request(base,editor,'POST','/api/users',{username:'newuser',name:'New User',password:'Secret123456!',role:'agent'});
 assert.equal(r.status,403);

 // 3. Editor CANNOT edit users
 const usersList=(await (await request(base,editor,'GET','/api/users')).json()).users;
 const targetUser=usersList.find(u=>u.username==='operator1');
 r=await request(base,editor,'PUT','/api/users/'+targetUser.id,{name:'Changed Name'});
 assert.equal(r.status,403);

 // 4. Audit log records actions with IP
 r=await request(base,editor,'GET','/api/audit');
 assert.equal(r.status,200);
 const auditLogs=(await r.json()).audit;
 assert.ok(auditLogs.length>0);
 assert.ok(auditLogs.some(a=>a.action.includes('Yeni sorğu')&&a.ip));

 // 5. Public survey link access (No login needed!)
 r=await request(base,null,'GET','/api/public/surveys/'+surveyId);
 assert.equal(r.status,200);
 const publicSurvey=(await r.json()).survey;
 assert.equal(publicSurvey.id,surveyId);

 // 6. Public survey submission (No login needed!)
 r=await request(base,null,'POST','/api/public/surveys/'+surveyId,{
   answers:{'q1':'Bəli'},
   durationSec:30
 });
 assert.equal(r.status,201);

 // 7. Private survey rejects public access
 r=await request(base,admin,'POST','/api/surveys',{
   title:'Private survey',
   status:'active',
   access:'private',
   sections:[{id:'s1',title:'S'}],
   questions:[]
 });
 const privateSurveyId=(await r.json()).survey.id;
 r=await request(base,null,'GET','/api/public/surveys/'+privateSurveyId);
 assert.equal(r.status,403);

 // 8. Multi-user assignment ("Hamı" checkbox round-robin)
 const op1=usersList.find(u=>u.username==='operator1').id;
 const op2=usersList.find(u=>u.username==='operator2').id;
 const c1=(await (await request(base,admin,'POST','/api/contacts',{fullName:'Contact 1',phone:'+994501111111'})).json()).contact.id;
 const c2=(await (await request(base,admin,'POST','/api/contacts',{fullName:'Contact 2',phone:'+994502222222'})).json()).contact.id;
 
 r=await request(base,editor,'POST','/api/assignments',{
   surveyId,
   assignedTo:[op1,op2],
   contactIds:[c1,c2]
 });
 assert.equal(r.status,201);
 assert.equal((await r.json()).count,2);
});
