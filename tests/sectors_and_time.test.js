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

  // 5. Check Excel export puts questions and matrix criteria in column headers at top, and answers underneath
  const excelExp = await fetch(`${base}/api/export/${sId}?format=excel`, {
    headers: { Cookie: adminAuth.cookie }
  });
  assert.equal(excelExp.status, 200);
  const html = await excelExp.text();
  assert.ok(html.includes('Meyar 1: Sürət'), 'Criterion 1 is listed in column header');
  assert.ok(html.includes('Meyar 2: Keyfiyyət'), 'Criterion 2 is listed in column header');
  assert.ok(html.includes('Meyar 3: Dəstək'), 'Criterion 3 is listed in column header');
  assert.ok(html.includes('Kamil Vəliyev (Düzəliş)'), 'Modified response name appears in Excel data row');
  assert.ok(html.includes('2 dəq 15 san'), 'Updated duration formatted appears in Excel data row');
  assert.ok(html.includes('Əla'), 'Answer appears in data row beneath the criterion column');

  // 6. Verify logging in with unified 1234567890 password for all roles
  const login123Admin = await login(base, 'admin', '1234567890');
  assert.ok(login123Admin.cookie, 'Admin logs in with 1234567890');
  const login123Editor = await login(base, 'redaktor1', '1234567890');
  assert.ok(login123Editor.cookie, 'Editor logs in with 1234567890');
  const login123Operator = await login(base, 'operator1', '1234567890');
  assert.ok(login123Operator.cookie, 'Operator logs in with 1234567890');
});

test('Survey deletion (DELETE /api/surveys/:id): admin/editor can delete survey, operator cannot, and audit logs event', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgu-delete-survey-test-'));
  t.after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const { base, stop } = await startServer(tmpDir);
  t.after(() => stop());

  const adminAuth = await login(base, 'admin', 'UnitTest@2026!');
  const editorAuth = await login(base, 'redaktor1', 'Editor@2026!');
  const opAuth = await login(base, 'operator1', 'Agent@2026!');

  // 1. Create a survey to test deletion
  const createRes = await fetch(`${base}/api/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminAuth.cookie },
    body: JSON.stringify({
      title: 'Silinəcək Sorğu Əsas Test',
      category: 'Test',
      status: 'active',
      access: 'public',
      sections: [{ id: 'sec-del', title: 'Bölmə 1' }],
      questions: [{ id: 'q-del', sectionId: 'sec-del', type: 'single', title: 'Sual 1', options: [{ id: 'o1', label: 'Bəli' }] }]
    })
  });
  assert.equal(createRes.status, 201);
  const surveyId = (await createRes.json()).survey.id;

  // 2. Operator attempt to delete must be forbidden (403)
  const opDelRes = await fetch(`${base}/api/surveys/${surveyId}`, {
    method: 'DELETE',
    headers: { Cookie: opAuth.cookie }
  });
  assert.equal(opDelRes.status, 403);

  // 3. Editor deletes survey successfully (200)
  const edDelRes = await fetch(`${base}/api/surveys/${surveyId}`, {
    method: 'DELETE',
    headers: { Cookie: editorAuth.cookie }
  });
  assert.equal(edDelRes.status, 200);
  const edDelJson = await edDelRes.json();
  assert.equal(edDelJson.ok, true);
  assert.equal(edDelJson.deleted, surveyId);

  // 4. Survey should not be found (404)
  const getRes = await fetch(`${base}/api/surveys/${surveyId}`, {
    headers: { Cookie: adminAuth.cookie }
  });
  assert.equal(getRes.status, 404);

  // 5. Audit log records 'Sorğunu sildi'
  const auditRes = await fetch(`${base}/api/audit`, {
    headers: { Cookie: adminAuth.cookie }
  });
  assert.equal(auditRes.status, 200);
  const auditList = (await auditRes.json()).audit;
  const delAudit = auditList.find(a => a.action === 'Sorğunu sildi' && a.entity === 'Silinəcək Sorğu Əsas Test');
  assert.ok(delAudit, 'Deletion audit event is logged');
  assert.equal(delAudit.userName, 'Samir Babayev (Redaktor)');
});

test('Matrix question large round inputs, builder scroll freeze, and draft recovery resilience', async () => {
  const appJs = fs.readFileSync(path.join(project, 'public/app.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(project, 'public/style.css'), 'utf8');

  // 1. Matrix choice label and round inputs exist in template & styling
  assert.ok(appJs.includes('matrix-choice-label'), 'Matrix cells wrapped in clickable label');
  assert.ok(appJs.includes('matrix-round-input'), 'Matrix inputs have matrix-round-input class');
  assert.ok(styleCss.includes('.matrix-choice-label'), 'Matrix choice label has CSS');
  assert.ok(styleCss.includes('.matrix-round-input'), 'Matrix round input has CSS');
  assert.ok(styleCss.includes('transform: scale('), 'Matrix round inputs are scaled larger');

  // 2. Builder scroll retention exists in render & select-question
  assert.ok(appJs.includes('prevStageScroll'), 'render() preserves builder stage scroll');
  assert.ok(appJs.includes('prevLibScroll'), 'render() preserves question library scroll');
  assert.ok(appJs.includes('requestAnimationFrame'), 'Scroll positions restored via rAF');

  // 3. Draft persistence and recovery helpers exist
  assert.ok(appJs.includes('saveInterviewDraft'), 'Interview auto-save draft function exists');
  assert.ok(appJs.includes('restoreInterviewDraft'), 'Interview auto-recovery draft function exists');
  assert.ok(appJs.includes('savePublicSurveyDraft'), 'Public survey auto-save draft function exists');
  assert.ok(appJs.includes('restorePublicSurveyDraft'), 'Public survey auto-recovery draft function exists');
  assert.ok(appJs.includes("window.addEventListener('online'"), 'Online network listener registered');
  assert.ok(appJs.includes("window.addEventListener('offline'"), 'Offline network listener registered');
});

test('Report leader definition fix, measurement units, numeric thresholds, and text criteria validation', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgu-units-'));
  const { base, stop } = await startServer(dataDir);
  try {
    const appJs = fs.readFileSync(path.join(project, 'public/app.js'), 'utf8');
    const styleCss = fs.readFileSync(path.join(project, 'public/style.css'), 'utf8');

    // 1. Verify "leader is not defined" fix in reportDetail()
    assert.ok(appJs.includes('function reportDetail(){\n  const leader=isLeader();'), 'reportDetail defines leader=isLeader()');
    assert.ok(styleCss.includes('.unit-input-group'), 'CSS contains unit-input-group');
    assert.ok(styleCss.includes('.input-unit-badge'), 'CSS contains input-unit-badge');
    assert.ok(styleCss.includes('.prop-section-title'), 'CSS contains prop-section-title');

    // 2. Login as admin and create a survey with measurement units (ton, min 1000) and text criteria (phone, only_letters, fin, min_words)
    const admin = await login(base, 'admin', '1234567890');

    const surveyData = {
      title: 'Ölçü Vahidləri və Meyarlar Testi',
      category: 'Kənd təsərrüfatı və Ticarət',
      status: 'active',
      access: 'public',
      sections: [{ id: 'sec-val', title: 'Əsas göstəricilər' }],
      questions: [
        {
          id: 'q-ton',
          sectionId: 'sec-val',
          type: 'number',
          title: 'Məhsulun çəkisi (ton)',
          required: true,
          settings: { unit: 'ton', min: 1000, max: 50000, errorMessage: 'Tonaj 1000 tondan aşağı ola bilməz.' }
        },
        {
          id: 'q-name',
          sectionId: 'sec-val',
          type: 'short_text',
          title: 'Təchizatçının adı',
          required: true,
          settings: { textRule: 'only_letters' }
        },
        {
          id: 'q-phone',
          sectionId: 'sec-val',
          type: 'phone',
          title: 'Əlaqə nömrəsi',
          required: true,
          settings: { textRule: 'phone_az' }
        },
        {
          id: 'q-fin',
          sectionId: 'sec-val',
          type: 'short_text',
          title: 'FİN kod',
          required: true,
          settings: { textRule: 'fin' }
        },
        {
          id: 'q-desc',
          sectionId: 'sec-val',
          type: 'paragraph',
          title: 'Təsvir və Qeydlər',
          required: false,
          settings: { textRule: 'min_words', minWords: 3 }
        }
      ]
    };

    const sRes = await fetch(`${base}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify(surveyData)
    });
    assert.equal(sRes.status, 201);
    const createdSurvey = (await sRes.json()).survey;
    const surveyId = createdSurvey.id;

    // 3. Test failure: submitting number below min 1000 ton
    const failMinRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-ton': 500, // Invalid: < 1000
          'q-name': 'Ramin Əliyev',
          'q-phone': '+994501234567',
          'q-fin': '7ABC123',
          'q-desc': 'Bir iki üç'
        },
        durationSec: 45
      })
    });
    assert.equal(failMinRes.status, 400);
    const failMinJson = await failMinRes.json();
    assert.ok(failMinJson.error.includes('1000') || failMinJson.error.includes('Tonaj'), 'Custom or numeric min error triggered');

    // 4. Test failure: submitting invalid characters into only_letters field
    const failLetterRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-ton': 1500,
          'q-name': 'Ramin 123!', // Invalid: numbers & symbols
          'q-phone': '+994501234567',
          'q-fin': '7ABC123'
        },
        durationSec: 45
      })
    });
    assert.equal(failLetterRes.status, 400);
    const failLetterJson = await failLetterRes.json();
    assert.ok(failLetterJson.error.includes('hərflərdən ibarət olmalıdır'), 'Only letters error triggered');

    // 5. Test failure: submitting invalid mobile phone format
    const failPhoneRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-ton': 1500,
          'q-name': 'Ramin Əliyev',
          'q-phone': '12345', // Invalid phone
          'q-fin': '7ABC123'
        },
        durationSec: 45
      })
    });
    assert.equal(failPhoneRes.status, 400);
    const failPhoneJson = await failPhoneRes.json();
    assert.ok(failPhoneJson.error.includes('Azərbaycan mobil nömrəsi'), 'Azerbaijan mobile phone format error triggered');

    // 6. Test failure: submitting invalid FIN (less than 7 chars)
    const failFinRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-ton': 1500,
          'q-name': 'Ramin Əliyev',
          'q-phone': '+994501234567',
          'q-fin': 'ABC12' // 5 chars instead of 7
        },
        durationSec: 45
      })
    });
    assert.equal(failFinRes.status, 400);
    const failFinJson = await failFinRes.json();
    assert.ok(failFinJson.error.includes('FİN kod 7 simvol'), 'FIN format error triggered');

    // 7. Test failure: min words constraint (only 2 words when 3 required)
    const failWordsRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-ton': 1500,
          'q-name': 'Ramin Əliyev',
          'q-phone': '+994501234567',
          'q-fin': '7ABC123',
          'q-desc': 'İki söz' // Only 2 words
        },
        durationSec: 45
      })
    });
    assert.equal(failWordsRes.status, 400);
    const failWordsJson = await failWordsRes.json();
    assert.ok(failWordsJson.error.includes('ən azı 3 söz'), 'Min words error triggered');

    // 8. Test success: all criteria satisfied!
    const successRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-ton': 1250, // >= 1000 ton
          'q-name': 'Ramin Əliyev', // Only letters
          'q-phone': '+994501234567', // Valid AZ mobile
          'q-fin': '7XYZ999', // 7 chars FIN
          'q-desc': 'Bu tam ətraflı məhsul təsviridir və qəbul olunmalıdır.' // > 3 words
        },
        durationSec: 62
      })
    });
    assert.equal(successRes.status, 201);
    const successJson = await successRes.json();
    assert.equal(successJson.ok, true);

    // 9. Verify report endpoint returns data successfully
    const reportRes = await fetch(`${base}/api/reports/${surveyId}`, {
      headers: { Cookie: admin.cookie }
    });
    assert.equal(reportRes.status, 200);
    const repData = await reportRes.json();
    assert.equal(repData.completed, 1);
  } finally {
    stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('New question types: Fill-in-the-blank (Boşluq doldurma) and Matrix Text Grid (Mətnli matris cədvəli)', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgu-newtypes-'));
  const { base, stop } = await startServer(dataDir);
  try {
    const appJs = fs.readFileSync(path.join(project, 'public/app.js'), 'utf8');
    const styleCss = fs.readFileSync(path.join(project, 'public/style.css'), 'utf8');

    // 1. Verify UI library and styling registrations
    assert.ok(appJs.includes("'fill_blank'"), 'app.js includes fill_blank type in TYPES');
    assert.ok(appJs.includes("'matrix_text'"), 'app.js includes matrix_text type in TYPES');
    assert.ok(styleCss.includes('.fillblank-input'), 'style.css includes .fillblank-input');
    assert.ok(styleCss.includes('.matrix-cell-input'), 'style.css includes .matrix-cell-input');

    const admin = await login(base, 'admin', '1234567890');

    // 2. Create survey with both new types
    const opt1Id = 'opt-kartof-yaz';
    const opt2Id = 'opt-kartof-payiz';
    const surveyPayload = {
      title: 'Kartof Əkini və Məhsuldarlıq Sorğusu',
      category: 'Kənd təsərrüfatı',
      status: 'active',
      access: 'public',
      sections: [{ id: 'sec-agri', title: 'Əkin Statistikası' }],
      questions: [
        {
          id: 'q-blank',
          sectionId: 'sec-agri',
          type: 'fill_blank',
          title: 'Əkin cümlələrini tamamlayın',
          required: true,
          options: [
            { id: opt1Id, label: 'Yaz zamanı ____ kq kartof əkmişəm.' },
            { id: opt2Id, label: 'Payız yığımında ____ ton məhsul yığmışam.' }
          ]
        },
        {
          id: 'q-grid',
          sectionId: 'sec-agri',
          type: 'matrix_text',
          title: 'Hansı sort kartoflardan əkmisiniz?',
          required: true,
          rows: ['Bakı kartofu', 'Cəlilabad kartofu', 'Gədəbəy kartofu'],
          columns: ['0-100', '100-200', '200-300']
        }
      ]
    };

    const sRes = await fetch(`${base}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify(surveyPayload)
    });
    assert.equal(sRes.status, 201);
    const sJson = await sRes.json();
    const surveyId = sJson.survey.id;
    assert.equal(sJson.survey.questions[0].type, 'fill_blank');
    assert.equal(sJson.survey.questions[1].type, 'matrix_text');

    // 3. Validation failure: blank missing in required fill_blank
    const failBlankRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-blank': { [opt1Id]: '450' }, // missing opt2Id
          'q-grid': {
            'Bakı kartofu': { '0-100': '50', '100-200': '80', '200-300': '110' },
            'Cəlilabad kartofu': { '0-100': '20', '100-200': '40', '200-300': '60' },
            'Gədəbəy kartofu': { '0-100': '90', '100-200': '120', '200-300': '150' }
          }
        },
        durationSec: 35
      })
    });
    assert.equal(failBlankRes.status, 400);
    const failBlankJson = await failBlankRes.json();
    assert.ok(failBlankJson.error.includes('bütün boşluqları doldurun'), 'Blank validation triggered');

    // 4. Validation failure: required matrix_text row empty
    const failGridRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        answers: {
          'q-blank': { [opt1Id]: '450', [opt2Id]: '15' },
          'q-grid': {
            'Bakı kartofu': { '0-100': '50' },
            'Cəlilabad kartofu': { '100-200': '70' }
            // 'Gədəbəy kartofu' missing
          }
        },
        durationSec: 40
      })
    });
    assert.equal(failGridRes.status, 400);
    const failGridJson = await failGridRes.json();
    assert.ok(failGridJson.error.includes('bütün matris sətirlərini cavablandırın'), 'Matrix row validation triggered');

    // 5. Successful submission with complete answers
    const okRes = await fetch(`${base}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        status: 'completed',
        respondentName: 'Həsən Qasımov',
        respondentPhone: '+994503332211',
        answers: {
          'q-blank': {
            [opt1Id]: '1200',
            [opt2Id]: '35'
          },
          'q-grid': {
            'Bakı kartofu': { '0-100': '500', '100-200': '850', '200-300': '1200' },
            'Cəlilabad kartofu': { '0-100': '300', '100-200': '600', '200-300': '900' },
            'Gədəbəy kartofu': { '0-100': '700', '100-200': '1100', '200-300': '1500' }
          }
        },
        durationSec: 75
      })
    });
    assert.equal(okRes.status, 201);
    const okJson = await okRes.json();
    assert.equal(okJson.ok, true);
    const respId = okJson.response.id;

    // 6. Verify Excel / CSV export includes separate columns for each matrix cell and blank option
    const expRes = await fetch(`${base}/api/export/${surveyId}?format=excel`, {
      headers: { Cookie: admin.cookie }
    });
    assert.equal(expRes.status, 200);
    const expText = await expRes.text();
    assert.ok(expText.includes('Bakı kartofu - 0-100'), 'Excel contains Bakı kartofu - 0-100 column');
    assert.ok(expText.includes('Gədəbəy kartofu - 200-300'), 'Excel contains Gədəbəy kartofu - 200-300 column');
    assert.ok(expText.includes('1500'), 'Excel contains value 1500 for Gədəbəy cell');
    assert.ok(expText.includes('Yaz zamanı ____ kq kartof əkmişəm.'), 'Excel contains fill blank column title');
    assert.ok(expText.includes('1200'), 'Excel contains filled value 1200');

    // 7. Verify Admin/Editor can modify response sheet (PUT /api/responses/:id)
    const updateRes = await fetch(`${base}/api/responses/${respId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        respondentName: 'Həsən Qasımov (Redaktə edildi)',
        answers: {
          'q-blank': {
            [opt1Id]: '1500',
            [opt2Id]: '45'
          },
          'q-grid': {
            'Bakı kartofu': { '0-100': '550', '100-200': '900', '200-300': '1300' },
            'Cəlilabad kartofu': { '0-100': '350', '100-200': '650', '200-300': '950' },
            'Gədəbəy kartofu': { '0-100': '750', '100-200': '1150', '200-300': '1600' }
          }
        }
      })
    });
    assert.equal(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.equal(updateJson.response.contactName, 'Həsən Qasımov (Redaktə edildi)');
    assert.equal(updateJson.response.answers['q-blank'][opt1Id], '1500');
    assert.equal(updateJson.response.answers['q-grid']['Gədəbəy kartofu']['200-300'], '1600');

    // 8. Verify public survey submission works without auth token
    const publicSubmitRes = await fetch(`${base}/api/public/surveys/${surveyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondentName: 'İctimai İştirakçı',
        answers: {
          'q-blank': {
            [opt1Id]: '900',
            [opt2Id]: '22'
          },
          'q-grid': {
            'Bakı kartofu': { '0-100': '100', '100-200': '200', '200-300': '300' },
            'Cəlilabad kartofu': { '0-100': '400', '100-200': '500', '200-300': '600' },
            'Gədəbəy kartofu': { '0-100': '700', '100-200': '800', '200-300': '900' }
          }
        },
        durationSec: 45
      })
    });
    assert.equal(publicSubmitRes.status, 201);
    const pubJson = await publicSubmitRes.json();
    assert.equal(pubJson.ok, true);
  } finally {
    stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('Question Library complete audit (all 34 types), Image A/B vs Text A/B tests, real-time draft syncing and inline uploads', async () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

  // 1. Verify all 34 question types exist in TYPES array
  const expectedTypes = [
    'single', 'multiple', 'dropdown', 'yesno', 'image_choice',
    'rating', 'stars', 'slider', 'ranking', 'bestworst', 'matrix', 'matrix_multi', 'matrix_dropdown', 'matrix_text', 'nps', 'likert',
    'short_text', 'paragraph', 'fill_blank', 'number', 'currency', 'percentage', 'multitext',
    'name', 'email', 'phone', 'address', 'date', 'time', 'datetime', 'file',
    'consent', 'text_ab', 'image_ab'
  ];
  assert.equal(expectedTypes.length, 34, 'Expected exactly 34 question types in library');
  expectedTypes.forEach(t => {
    assert.ok(appJs.includes(`'${t}'`), `Type '${t}' must be registered in app.js`);
  });

  // 2. Evaluate newQuestion logic from app.js in isolated sandbox
  const vm = require('vm');
  const sandbox = {
    mkId: () => 'test-' + Math.random().toString(36).slice(2),
    typeLabel: (t) => t,
    MEASURE_UNITS: [],
    TEXT_RULES: [],
    DEMO_IMG_A: 'data:image/svg+xml;demoA',
    DEMO_IMG_B: 'data:image/svg+xml;demoB',
    DEMO_IMG_C: 'data:image/svg+xml;demoC',
    state: { builder: null },
    document: null,
    localStorage: null
  };
  // Extract newQuestion function from app.js
  const nqMatch = appJs.match(/function newQuestion\(type,sectionId\)\{[\s\S]*?\n\}/);
  assert.ok(nqMatch, 'newQuestion function found in app.js');
  vm.createContext(sandbox);
  vm.runInContext(nqMatch[0], sandbox);

  // Check every single type creates a tailored question without generic title
  expectedTypes.forEach(type => {
    const q = sandbox.newQuestion(type, 'sec-1');
    assert.ok(q, `newQuestion returned object for ${type}`);
    assert.notEqual(q.title, 'Yeni sual', `Question type '${type}' must NOT have generic title 'Yeni sual'`);
    assert.ok(q.title.length > 5, `Question type '${type}' must have descriptive title`);

    // Specific structural checks
    if (type === 'text_ab') {
      assert.ok(q.title.includes('şüar') || q.title.includes('A/B'), 'text_ab title mentions slogan or A/B');
      assert.equal(q.options.length, 2, 'text_ab has 2 options');
      assert.equal(q.options[0].image, '', 'text_ab options have no default image');
    }
    if (type === 'image_ab') {
      assert.ok(q.title.includes('vizual') || q.title.includes('dizayn'), 'image_ab title mentions visual design');
      assert.equal(q.options.length, 2, 'image_ab has 2 visual options');
      assert.ok(q.options[0].image.startsWith('data:image/svg'), 'image_ab has visual demo image');
      assert.ok(q.options[1].image.startsWith('data:image/svg'), 'image_ab has visual demo image');
    }
    if (type === 'image_choice') {
      assert.ok(q.options.length >= 3, 'image_choice has multiple options');
      assert.ok(q.options[0].image.startsWith('data:image/svg'), 'image_choice option 0 has image');
      assert.ok(q.options[1].image.startsWith('data:image/svg'), 'image_choice option 1 has image');
    }
    if (type === 'currency') {
      assert.equal(q.settings.unit, 'azn', 'currency defaults to AZN unit');
    }
    if (type === 'percentage') {
      assert.equal(q.settings.unit, 'percent', 'percentage defaults to percent unit');
    }
    if (type === 'phone') {
      assert.equal(q.settings.textRule, 'phone', 'phone defaults to phone validation rule');
    }
    if (type === 'matrix_text') {
      assert.ok(q.rows.length >= 3, 'matrix_text has default criteria rows');
      assert.ok(q.columns.length >= 3, 'matrix_text has default interval columns');
    }
    if (type === 'fill_blank') {
      assert.ok(q.options.length >= 2, 'fill_blank has sentence options with blanks');
    }
  });

  // 3. Verify builder live sync & draft auto-saving functions
  assert.ok(appJs.includes('function saveBuilderDraft'), 'saveBuilderDraft exists in app.js');
  assert.ok(appJs.includes('function restoreBuilderDraft'), 'restoreBuilderDraft exists in app.js');
  assert.ok(appJs.includes('function clearBuilderDraft'), 'clearBuilderDraft exists in app.js');
  assert.ok(appJs.includes('function syncBuilderLive'), 'syncBuilderLive exists in app.js');
  assert.ok(appJs.includes('syncBuilderLive(q)'), 'updateBuilderField calls syncBuilderLive(q)');
  assert.ok(appJs.includes('clearBuilderDraft(state.builder.id)'), 'save-builder clears local draft on save');
  assert.ok(appJs.includes('opt-img-file-input'), 'Per-option image file input upload exists');
  assert.ok(appJs.includes('clear-opt-img'), 'Clear option image action exists');

  // 4. Server Integration: Upload an image file and test public inline access
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-ab-and-library-'));
  const { base, stop } = await startServer(tmpDir);

  try {
    const admin = await login(base, 'admin', 'UnitTest@2026!');

    // Upload an image as admin
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await fetch(`${base}/api/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        name: 'test-product.png',
        mime: 'image/png',
        data: pngBase64
      })
    });
    assert.equal(uploadRes.status, 201, 'Image upload succeeded');
    const uploadJson = await uploadRes.json();
    assert.ok(uploadJson.id, 'Upload returned file id');
    assert.equal(uploadJson.url, `/api/uploads/${uploadJson.id}`);

    // Verify public unauthenticated access to the image for respondents
    const publicImgRes = await fetch(`${base}/api/uploads/${uploadJson.id}`);
    assert.equal(publicImgRes.status, 200, 'Public image fetch returns 200');
    assert.equal(publicImgRes.headers.get('content-type'), 'image/png');
    assert.ok(publicImgRes.headers.get('content-disposition')?.includes('inline'), 'Image is served inline');

    // Create a survey with image_ab test using the uploaded image
    const sPayload = {
      title: 'Məhsul Qablaşdırması A/B Testi',
      category: 'Marketinq',
      status: 'active',
      access: 'public',
      sections: [{ id: 'sec-ab', title: 'Vizual Seçim' }],
      questions: [
        {
          id: 'q-img-ab',
          sectionId: 'sec-ab',
          type: 'image_ab',
          title: 'Yeni etiket dizaynı A/B testi',
          required: true,
          options: [
            { id: 'opt-a', label: 'Dizayn A', image: uploadJson.url },
            { id: 'opt-b', label: 'Dizayn B', image: uploadJson.url }
          ]
        }
      ]
    };
    const sRes = await fetch(`${base}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify(sPayload)
    });
    assert.equal(sRes.status, 201);
    const sJson = await sRes.json();
    const surveyId = sJson.survey.id;

    // Submit response to the image A/B test
    const submitRes = await fetch(`${base}/api/public/surveys/${surveyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondentName: 'Test Müştəri',
        answers: {
          'q-img-ab': { variant: 'Dizayn A', answer: 'Bəli' }
        },
        durationSec: 20
      })
    });
    assert.equal(submitRes.status, 201);
    const subJson = await submitRes.json();
    assert.equal(subJson.ok, true);

    // Verify report reflects the answer
    const repRes = await fetch(`${base}/api/reports/${surveyId}`, {
      headers: { Cookie: admin.cookie }
    });
    assert.equal(repRes.status, 200);
    const repJson = await repRes.json();
    assert.equal(repJson.completed, 1);
    assert.equal(repJson.responses[0].answers['q-img-ab'].variant, 'Dizayn A');
    assert.equal(repJson.responses[0].answers['q-img-ab'].answer, 'Bəli');
  } finally {
    stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Builder scroll freeze, in-place updates, and default required: false for newly added questions', async t => {
  const appJsPath = path.join(project, 'public/app.js');
  const cssPath = path.join(project, 'public/style.css');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Verify CSS sets scroll-behavior: auto to prevent bouncy gliding in builder
  assert.ok(css.includes('.builder-panel'), 'CSS has .builder-panel');
  assert.ok(css.includes('.builder-stage'), 'CSS has .builder-stage');
  assert.ok(css.includes('scroll-behavior: auto !important'), 'CSS specifies scroll-behavior: auto !important');

  // 2. Evaluate newQuestion in sandbox and verify required: false for all types
  const vm = require('vm');
  const sandbox = {
    mkId: () => 'test-' + Math.random().toString(36).slice(2),
    typeLabel: (t) => t,
    MEASURE_UNITS: [],
    TEXT_RULES: [],
    DEMO_IMG_A: 'demoA',
    DEMO_IMG_B: 'demoB',
    DEMO_IMG_C: 'demoC',
    state: { builder: null },
    document: null,
    localStorage: null
  };
  const nqMatch = appJs.match(/function newQuestion\(type,sectionId\)\{[\s\S]*?\n\}/);
  assert.ok(nqMatch, 'newQuestion function found in app.js');
  vm.createContext(sandbox);
  vm.runInContext(nqMatch[0], sandbox);

  const all34Types = [
    'short_text','paragraph','numeric','currency','percentage','phone',
    'single','multiple','dropdown','yesno','image_choice',
    'rating','stars','nps','slider','ranking','constant_sum',
    'matrix_radio','matrix_checkbox','matrix_scale','matrix_text',
    'date','time','datetime','duration',
    'email','url','file','location','consent','hidden','signature',
    'text_ab','image_ab'
  ];

  for (const type of all34Types) {
    const q = sandbox.newQuestion(type, 'sec-1');
    assert.strictEqual(
      q.required,
      false,
      `Question type '${type}' must default to required: false so user can choose when to make it mandatory`
    );
  }

  // 3. Verify in-place builder update architecture in app.js
  assert.ok(appJs.includes('function builderStageContent()'), 'builderStageContent function exists');
  assert.ok(appJs.includes('function builderPropertyContent()'), 'builderPropertyContent function exists');
  assert.ok(appJs.includes('function updateBuilderStage('), 'updateBuilderStage function exists');

  // 4. Verify actions add-question, clone-question, delete-question, move-question call updateBuilderStage
  assert.ok(appJs.includes("updateBuilderStage(q.id, true)"), 'add-question calls updateBuilderStage');
  assert.ok(appJs.includes("updateBuilderStage(clone.id, false, true)"), 'clone-question calls updateBuilderStage');
  assert.ok(appJs.includes("updateBuilderStage(state.builderQ, false, true)"), 'delete-question/save-builder calls updateBuilderStage');

  // 5. Verify checkbox toggle in builder properties does not call render()
  assert.ok(appJs.includes("if(el.type==='checkbox'){\n      return;"), 'builderField explicitly avoids re-render on checkbox');
  assert.ok(!appJs.includes("if(el.tagName==='SELECT'||el.type==='checkbox')render()"), 'No full render on checkbox toggle');
});





