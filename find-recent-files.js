const fs = require('fs');
const path = require('path');

function inspectDir(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(inspectDir(fullPath));
      } else {
        // Last 24 hours
        if (Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000) {
          results.push({ path: fullPath, mtime: stat.mtime });
        }
      }
    }
  } catch (err) {}
  return results;
}

console.log("Recent files modified in the last 24h:");
const recent = inspectDir('.');
recent.forEach(f => console.log(`${f.path} - ${f.mtime}`));
