'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const file of ['app.js', 'server/server.js', 'server/store.js', 'server/seed.js',
  'public/index.html', 'public/style.css', 'public/app.js', 'public/favicon.svg']) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error('Çatışmayan layihə faylı:', file);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log('✓ SorğuPro: Hostinger üçün backend və statik fayllar hazırdır.');
