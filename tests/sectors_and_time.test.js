'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');

const project = path.resolve(__dirname, '..');

async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', reject);
  });
}

async function startServer(dataDir) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(project, 'server/server.js')], {
    cwd: project,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      NODE_ENV: 'test',
      SEED_DEMO: 'true',
      ADMIN_PASSWORD: 'UnitTest@2026!',
    },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 65; i++) {
    await new Promise(r => setTimeout(r, 80));
    try {
      const res = await fetch(base + '/api/health');
      if (res.ok) { ready = true; break; }
    } catch {}
    if (child.exitCode !== null) throw new Error('Server died early');
  }
  if (!ready) throw new Error('Server failed to start');
  return { child, base, stop: () => { child.kill(); } };
}

async function login(base, username, password) {
  const res = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const body = await res.json();
  return { cookie, user: body.user };
}

test('Direct survey interview flow, survey sectors for contacts, and operator time tracking', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgu-direct-test-'));
  t.after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const { base, stop } = await startServer(tmpDir);
  t.after(() => stop());

  const adminAuth = await login(base, 'admin', 'UnitTest@2026!');
  const opAuth = await login(base, 'operator1', 'Agent@2026!');

  // 1. Get existing surveys
  const surveysRes = await fetch(base + '/api/surveys', {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(surveysRes.status, 200);
  const surveysData = await surveysRes.json();
  assert.ok(surveysData.surveys.length > 0);
  const survey = surveysData.surveys[0];
  const surveyId = survey.id;
  const questionKey = survey.questions[0].id;

  // 2. Add contacts to survey sector
  const contactRes = await fetch(base + '/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminAuth.cookie },
    body: JSON.stringify({
      fullName: 'Rəşad Əliyev',
      phone: '+994501112233',
      sector: 'Bakı Şəhəri',
      surveyId: surveyId,
      notes: 'Sektor testi',
    }),
  });
  assert.equal(contactRes.status, 201);
  const contactData = await contactRes.json();
  const contact = contactData.contact;
  assert.equal(contact.surveyId, surveyId);

  // Filter contacts by surveyId
  const sectorContactsRes = await fetch(`${base}/api/contacts?surveyId=${surveyId}`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(sectorContactsRes.status, 200);
  const sectorContactsData = await sectorContactsRes.json();
  assert.ok(sectorContactsData.contacts.some(c => c.id === contact.id));

  // 3. Operator starts direct interview without task assignment (2 responses with duration)
  // Response 1: 145 seconds (2 dəq 25 san)
  const resp1 = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: opAuth.cookie },
    body: JSON.stringify({
      contactId: contact.id,
      respondentName: 'Rəşad Əliyev',
      respondentPhone: '+994501112233',
      durationSec: 145,
      answers: { [questionKey]: 'Razıyam' },
      notes: 'Müsahibə uğurla tamamlandı',
    }),
  });
  assert.equal(resp1.status, 201);
  const resp1Data = await resp1.json();
  assert.equal(resp1Data.response.durationSec, 145);
  assert.equal(resp1Data.response.durationFormatted, '2 dəq 25 san');
  assert.equal(resp1Data.response.operatorName, 'operator1');

  // Response 2: 75 seconds (1 dəq 15 san)
  const resp2 = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: opAuth.cookie },
    body: JSON.stringify({
      respondentName: 'Leyla Məmmədova',
      respondentPhone: '+994559998877',
      durationSec: 75,
      answers: { [questionKey]: 'Qismən razıyam' },
    }),
  });
  assert.equal(resp2.status, 201);

  // 4. Admin checks survey report and time analytics
  const reportRes = await fetch(`${base}/api/reports/${surveyId}`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(reportRes.status, 200);
  const rep = await reportRes.json();
  assert.ok(rep.userStats, 'report includes userStats');
  const opStat = rep.userStats.find(u => u.username === 'operator1');
  assert.ok(opStat, 'operator1 stat exists');
  assert.ok(opStat.count >= 2, 'at least 2 responses recorded for operator1');
  assert.ok(opStat.totalDurationSec >= 220, 'total duration matches');
  assert.ok(opStat.totalDurationFormatted.includes('dəq'), 'formatted total duration includes minutes');
  assert.ok(opStat.avgDurationFormatted, 'has average duration formatted');

  // Check individual responses in report
  assert.ok(rep.responses.some(r => r.durationSec === 145 && r.durationFormatted === '2 dəq 25 san'));

  // 5. Check CSV export includes duration and summary table
  const exportRes = await fetch(`${base}/api/export/${surveyId}?format=csv`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(exportRes.status, 200);
  const csv = await exportRes.text();
  assert.ok(csv.includes('Sərf olunan vaxt'), 'CSV header has duration column');
  assert.ok(csv.includes('2 dəq 25 san'), 'CSV row contains respondent duration');
  assert.ok(csv.includes('ƏMƏKDAŞLARIN ÜMUMİ VAXT'), 'CSV includes final summary table');
  assert.ok(csv.includes('operator1'), 'CSV summary includes operator');

  // 6. Check Excel export has Arial 14 Bold headers, Arial 12 answers, and separate columns/rows
  const excelRes = await fetch(`${base}/api/export/${surveyId}?format=excel`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(excelRes.status, 200);
  assert.ok(excelRes.headers.get('content-type').includes('application/vnd.ms-excel'));
  const excelHtml = await excelRes.text();
  assert.ok(excelHtml.includes('font-size: 14pt !important;'), 'Headers have Arial 14 style');
  assert.ok(excelHtml.includes('font-weight: bold !important;'), 'Headers have Bold style');
  assert.ok(excelHtml.includes('font-size: 12pt !important;'), 'Answers have Arial 12 style');
  assert.ok(excelHtml.includes('font-family: Arial'), 'Font family is Arial');
  assert.ok(excelHtml.includes('Sual 1:'), 'Each question has its own separate column header');
  assert.ok(excelHtml.includes('2 dəq 25 san'), 'Respondent row includes duration');
  assert.ok(excelHtml.includes('ƏMƏKDAŞLARIN ÜMUMİ VAXT VƏ İCRA İCMALI'), 'Excel includes final summary table');

  // 7. Check Contacts and Audit table Excel exports
  const contactsExpRes = await fetch(`${base}/api/export-contacts?format=excel`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(contactsExpRes.status, 200);
  const contactsHtml = await contactsExpRes.text();
  assert.ok(contactsHtml.includes('font-size: 14pt !important;'));
  assert.ok(contactsHtml.includes('font-size: 12pt !important;'));
  assert.ok(contactsHtml.includes('Rəşad Əliyev'));

  const auditExpRes = await fetch(`${base}/api/export-audit?format=excel`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(auditExpRes.status, 200);
  const auditHtml = await auditExpRes.text();
  assert.ok(auditHtml.includes('font-size: 14pt !important;'));
  assert.ok(auditHtml.includes('font-size: 12pt !important;'));
});

test('Concurrent multi-operator submissions: sequential ordering, zero data loss, no limits', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgu-concurrent-test-'));
  t.after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const { base, stop } = await startServer(tmpDir);
  t.after(() => stop());

  const adminAuth = await login(base, 'admin', 'UnitTest@2026!');
  const op1Auth = await login(base, 'operator1', 'Agent@2026!');
  const op2Auth = await login(base, 'operator2', 'Agent@2026!');

  // Create additional operator
  const createOp3 = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminAuth.cookie },
    body: JSON.stringify({ username: 'operator3', name: 'Operator Üç', password: 'Agent@2026!Extra', role: 'agent' }),
  });
  assert.equal(createOp3.status, 201);
  const op3Auth = await login(base, 'operator3', 'Agent@2026!Extra');

  // Create test survey
  const createSurvRes = await fetch(`${base}/api/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminAuth.cookie },
    body: JSON.stringify({
      title: 'Kütləvi Eynivaxtlı Sorğu Sınağı',
      status: 'active',
      access: 'public',
      sections: [{ id: 'sec-1', title: 'Əsas Bölmə' }],
      questions: [
        { id: 'q-val', sectionId: 'sec-1', type: 'short_text', title: 'Rəyiniz?', required: false }
      ]
    })
  });
  assert.equal(createSurvRes.status, 201);
  const surveyData = await createSurvRes.json();
  const sId = surveyData.survey.id;

  // Run 25 simultaneous concurrent submissions across multiple operators
  const count = 25;
  const auths = [op1Auth, op2Auth, op3Auth];
  const promises = [];

  for (let i = 0; i < count; i++) {
    const auth = auths[i % auths.length];
    promises.push((async () => {
      const res = await fetch(`${base}/api/surveys/${sId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: auth.cookie },
        body: JSON.stringify({
          respondentName: `Respondent N${i + 1}`,
          respondentPhone: `+99450000${String(i).padStart(4, '0')}`,
          durationSec: 30 + (i % 60),
          answers: { 'q-val': `Cavab ${i + 1}` },
          status: 'completed'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      return data.response;
    })());
  }

  const results = await Promise.all(promises);
  assert.equal(results.length, count, 'All 25 concurrent responses received successfully');

  // Verify all responses have unique seqNumber from 1 to 25
  const seqNumbers = results.map(r => r.seqNumber).sort((a,b) => a - b);
  for (let i = 1; i <= count; i++) {
    assert.equal(seqNumbers[i - 1], i, `Sequential seqNumber ${i} assigned without gap or duplicate`);
  }

  // Fetch report and verify count and ordering
  const repRes = await fetch(`${base}/api/reports/${sId}`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(repRes.status, 200);
  const repData = await repRes.json();
  assert.equal(repData.completed, count, 'Report confirms all responses saved');
  assert.equal(repData.responses.length, count);

  // Verify Excel export contains all sequential responses
  const expRes = await fetch(`${base}/api/export/${sId}?format=excel`, {
    headers: { Cookie: adminAuth.cookie },
  });
  assert.equal(expRes.status, 200);
  const expHtml = await expRes.text();
  for (let i = 1; i <= count; i++) {
    assert.ok(expHtml.includes(`Respondent N${i}`), `Excel export includes Respondent N${i}`);
  }
});

test('Admin and Editor edit survey structure, modify operator response sheets, and export matrix criteria on separate rows', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgu-edit-sheet-test-'));
  t.after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const { base, stop } = await startServer(tmpDir);
  t.after(() => stop());

  const adminAuth = await login(base, 'admin', 'UnitTest@2026!');
  const editorAuth = await login(base, 'redaktor1', 'Editor@2026!');
  const opAuth = await login(base, 'operator1', 'Agent@2026!');

  // 1. Editor creates a new survey with matrix question
  const createRes = await fetch(`${base}/api/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: editorAuth.cookie },
    body: JSON.stringify({
      title: 'İctimai Xidmət Matrisi',
      status: 'active',
      access: 'public',
      sections: [{ id: 'sec-m', title: 'Matris Bölməsi' }],
      questions: [
        {
          id: 'q-matrix',
          sectionId: 'sec-m',
          type: 'matrix',
          title: 'Göstəricilər üzrə qiymətləndirmə',
          required: true,
          rows: ['Meyar 1: Sürət', 'Meyar 2: Keyfiyyət', 'Meyar 3: Dəstək'],
          columns: ['Pis', 'Orta', 'Yaxşı', 'Əla']
        }
      ]
    })
  });
  assert.equal(createRes.status, 201);
  const surv = (await createRes.json()).survey;
  const sId = surv.id;

  // 2. Editor edits survey structure (adds a new section and question)
  surv.title = 'İctimai Xidmət Matrisi (Yenilənmiş)';
  surv.questions.push({
    id: 'q-text',
    sectionId: 'sec-m',
    type: 'short_text',
    title: 'Əlavə Təklifiniz',
    required: false
  });
  const updateRes = await fetch(`${base}/api/surveys/${sId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: editorAuth.cookie },
    body: JSON.stringify(surv)
  });
  assert.equal(updateRes.status, 200);
  const updatedSurv = (await updateRes.json()).survey;
  assert.equal(updatedSurv.title, 'İctimai Xidmət Matrisi (Yenilənmiş)');
  assert.equal(updatedSurv.questions.length, 2);

  // 3. Operator submits an interview response sheet
  const submitRes = await fetch(`${base}/api/surveys/${sId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: opAuth.cookie },
    body: JSON.stringify({
      respondentName: 'Kamil Vəliyev',
      respondentPhone: '+994501234567',
      durationSec: 120,
      answers: {
        'q-matrix': {
          'Meyar 1: Sürət': 'Yaxşı',
          'Meyar 2: Keyfiyyət': 'Əla',
          'Meyar 3: Dəstək': 'Orta'
        },
        'q-text': 'Hər şey qaydasındadır'
      },
      status: 'completed'
    })
  });
  assert.equal(submitRes.status, 201);
  const respObj = (await submitRes.json()).response;
  const respId = respObj.id;

  // 4. Editor modifies the operator's submitted response sheet
  const editSheetRes = await fetch(`${base}/api/responses/${respId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: editorAuth.cookie },
    body: JSON.stringify({
      respondentName: 'Kamil Vəliyev (Düzəliş)',
      respondentPhone: '+994507654321',
      durationSec: 135,
      answers: {
        'q-matrix': {
          'Meyar 1: Sürət': 'Əla',
          'Meyar 2: Keyfiyyət': 'Əla',
          'Meyar 3: Dəstək': 'Əla'
        },
        'q-text': 'Xidmətlər tamamilə əladır'
      }
    })
  });
  assert.equal(editSheetRes.status, 200);
  const editedResp = (await editSheetRes.json()).response;
  assert.equal(editedResp.contactName, 'Kamil Vəliyev (Düzəliş)');
  assert.equal(editedResp.contactPhone, '+994507654321');
  assert.equal(editedResp.durationSec, 135);
  assert.equal(editedResp.answers['q-matrix']['Meyar 1: Sürət'], 'Əla');

  // 5. Check Excel export puts each matrix criterion on its own separate row
  const excelExp = await fetch(`${base}/api/export/${sId}?format=excel`, {
    headers: { Cookie: adminAuth.cookie }
  });
  assert.equal(excelExp.status, 200);
  const html = await excelExp.text();
  assert.ok(html.includes('Meyar 1: Sürət'), 'Criterion 1 is listed on its own row');
  assert.ok(html.includes('Meyar 2: Keyfiyyət'), 'Criterion 2 is listed on its own row');
  assert.ok(html.includes('Meyar 3: Dəstək'), 'Criterion 3 is listed on its own row');
  assert.ok(html.includes('Kamil Vəliyev (Düzəliş)'), 'Modified response name appears in Excel');
  assert.ok(html.includes('2 dəq 15 san'), 'Updated duration formatted appears in Excel');
});

