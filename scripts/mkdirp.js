const path = require('path');
const fs = require('fs').promises;

async function mkdirp(folder) {
  if (folder === '/') return;
  try {
    await mkdirp(path.dirname(folder));
    await fs.mkdir(folder);
  } catch {}
}
exports.mkdirp = mkdirp;
