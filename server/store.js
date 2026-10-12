'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Hostinger stores each Node.js deployment in a new hbuilds directory. Data
// must live outside hbuilds/ and public_html/, otherwise redeploy loses it.
function hostingerSiteRoot() {
  const candidates = [__dirname, process.cwd()].map(p => path.resolve(p));
  for (const candidate of candidates) {
    const match = candidate.match(/^(.*\/domains\/[^/]+)\/(?:hbuilds|nodejs)(?:\/|$)/);
    if (match) return match[1];
  }
  return null;
}
const siteRoot = hostingerSiteRoot();
const isHostinger = !!siteRoot;
const isProduction = process.env.NODE_ENV === 'production' || isHostinger;
const dataFromEnv = (process.env.DATA_DIR || '').trim();
const defaultDir = siteRoot
  ? path.join(siteRoot, 'sorgupro-private-data')
  : path.resolve(__dirname, '..', 'data');
const dir = path.resolve(dataFromEnv || defaultDir);

// Data must not accidentally be written into a versioned build folder.
if (isHostinger && /\/hbuilds(?:\/|$)/.test(dir)) {
  throw new Error('DATA_DIR hbuilds daxilində ola bilməz: hər redeploy zamanı silinə bilər.');
}
if (isHostinger && /\/public_html(?:\/|$)/.test(dir)) {
  throw new Error('DATA_DIR public_html daxilində ola bilməz: məxfi sorğu məlumatları açıla bilər.');
}
try {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
} catch (err) {
  throw new Error('DATA_DIR qovluğu oxuna/yazıla bilmir (' + dir + '). hPanel > Environment Variables-də DATA_DIR-i dəyişin. Səbəb: ' + err.message);
}
const filename = path.join(dir, 'db.json');
let db = null;
if (fs.existsSync(filename)) {
  try { db = JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (e) { throw new Error('Məlumat bazası oxunmur: ' + filename + '. Bərpa etmədən yenisini yaratmayın. ' + e.message); }
}
const uid = () => crypto.randomUUID();
const iso = () => new Date().toISOString();
function write() {
  const temp = filename + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(temp, filename);
}
function get() { return db; }
function init(data) { if (db) return false; db = data; write(); return true; }
function save() { write(); }
module.exports = { get, init, save, uid, iso, dir, isHostinger, isProduction };
