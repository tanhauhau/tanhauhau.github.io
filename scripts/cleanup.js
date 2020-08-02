const path = require('path');
const fs = require('fs').promises;

async function cleanup(folder) {
  try {
    const files = await fs.readdir(folder);
    await Promise.all(
      files.map(async file => {
        const filepath = path.join(folder, file);
        if ((await fs.stat(filepath)).isDirectory()) {
          await cleanup(filepath);
        } else {
          await fs.unlink(filepath);
        }
      })
    );
    await fs.rmdir(folder);
  } catch {}
}
exports.cleanup = cleanup;
