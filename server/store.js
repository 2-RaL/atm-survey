'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Hostinger stores each Node.js deployment in a new hbuilds directory. Data
// must live outside hbuilds/ and public_html/, otherwise redeploy loses it.
function hostingerSiteRoot() {
  const candidates = [__dirname, process.cwd()].map(p => path.resolve(p));
  for (const candidate of candidates) {
    const norm = candidate.replace(/\\/g, '/');
    const match = norm.match(/^(.*\/domains\/[^/]+)\/(?:hbuilds|nodejs)(?:\/|$)/);
    if (match) return path.normalize(match[1]);
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
let dir = path.resolve(dataFromEnv || defaultDir);

// Data warning if inside build folder
const normDir = dir.replace(/\\/g, '/');
if (isHostinger && /\/hbuilds(?:\/|$)/.test(normDir)) {
  console.warn('⚠️ [XƏBƏRDARLIQ] DATA_DIR hbuilds daxilindədir. Redeploy zamanı məlumatların silinməməsi üçün hPanel-də DATA_DIR-i xarici qovluq təyin edin.');
}
if (isHostinger && /\/public_html(?:\/|$)/.test(normDir)) {
  console.warn('⚠️ [XƏBƏRDARLIQ] DATA_DIR public_html daxilindədir. Təhlükəsizlik üçün DATA_DIR-i public_html xaricinə çıxarın.');
}
try {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
} catch (err) {
  console.warn('⚠️ DATA_DIR qovluğu oxuna/yazıla bilmədi (' + dir + '). Yerli data/ qovluğuna keçilir: ' + err.message);
  const fallback = path.resolve(__dirname, '..', 'data');
  try {
    fs.mkdirSync(fallback, { recursive: true });
    dir = fallback;
  } catch {
    const os = require('os');
    dir = os.tmpdir();
  }
}
let filename = path.join(dir, 'db.json');
let db = null;
if (fs.existsSync(filename)) {
  try { db = JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (e) { console.error('Məlumat bazası oxunmur: ' + filename + '. ' + e.message); }
}
const uid = () => crypto.randomUUID();
const iso = () => new Date().toISOString();

function write() {
  const unique = crypto.randomBytes(6).toString('hex');
  const temp = filename + '.' + process.pid + '.' + unique + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { mode: 0o600 });
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      fs.renameSync(temp, filename);
      return;
    } catch (err) {
      if (attempt === 9) {
        try {
          fs.copyFileSync(temp, filename);
          fs.unlinkSync(temp);
          return;
        } catch {
          try { fs.unlinkSync(temp); } catch {}
          throw err;
        }
      }
      const waitTil = Date.now() + 10 * (attempt + 1);
      while (Date.now() < waitTil) {}
    }
  }
}
function get() { return db; }
function init(data) { if (db) return false; db = data; write(); return true; }
function save() { write(); }
module.exports = { get, init, save, uid, iso, dir, isHostinger, isProduction };
