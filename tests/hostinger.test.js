'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const project = path.resolve(__dirname, '..');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

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
async function launch(root, env) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, 'app.js')], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production', DATA_DIR: '',
      SEED_DEMO: 'false', ADMIN_PASSWORD: 'StrongTestPassword42!', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', d => { errors += d.toString(); });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 85));
    try { if ((await fetch(base + '/api/health')).ok) return { child, base, stop: () => child.kill() }; } catch { }
    if (child.exitCode !== null) throw new Error('Server exited: ' + errors);
  }
  child.kill();
  throw new Error('Server did not start: ' + errors);
}
async function login(base, username, password) {
  return fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
}
test('Hostinger: new deployments share stable, nonpublic data directory and production has no demo accounts', async t => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sorgupro-hostinger-'));
  const site = path.join(sandbox, 'domains', 'example.az');
  t.after(() => {
    try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch { }
  });
  let previous = null;
  for (const version of ['version-A', 'version-B']) {
    const build = path.join(site, 'hbuilds', 'versions', version, 'nodejs');
    fs.mkdirSync(build, { recursive: true });
    copyDir(path.join(project, 'server'), path.join(build, 'server'));
    fs.copyFileSync(path.join(project, 'app.js'), path.join(build, 'app.js'));
    copyDir(path.join(project, 'public'), path.join(build, 'public'));
    const running = await launch(build);
    t.after(() => running.stop());
    const prodData = path.join(site, 'sorgupro-private-data', 'db.json');
    assert.ok(fs.existsSync(prodData), 'permanent database exists outside hbuilds');
    const db = JSON.parse(fs.readFileSync(prodData, 'utf8'));
    assert.equal(db.users.length, 1, 'only admin seeded');
    assert.equal(db.surveys.length, 0, 'no example surveys in production');
    assert.equal(db.contacts.length, version === 'version-A' ? 0 : 1);
    assert.equal((await login(running.base, 'operator1', 'Agent@2026!')).status, 401);
    const auth = await login(running.base, 'admin', 'StrongTestPassword42!');
    assert.equal(auth.status, 200);
    const cookie = auth.headers.get('set-cookie').split(';')[0];
    if (version === 'version-A') {
      const created = await fetch(running.base + '/api/contacts', { method: 'POST', headers: {
        'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ fullName: 'Saved across redeploy', phone: '+994505555555' }) });
      assert.equal(created.status, 201);
      assert.equal(JSON.parse(fs.readFileSync(prodData, 'utf8')).contacts.length, 1);
    }
    await new Promise(r => setTimeout(r, 80));
    running.stop();
    if (previous) assert.equal(previous, prodData);
    previous = prodData;
  }
});
