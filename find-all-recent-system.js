const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = [
  'node_modules', '.git', '.next', 'proc', 'sys', 'dev', 'lib', 'lib64', 'usr', 'bin', 'sbin', 'boot', 'var/lib/apt', 'etc'
];

function scanDir(dir) {
  let matched = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      // Skip exclusions
      if (EXCLUDED_DIRS.some(ex => fullPath.includes(ex))) {
        continue;
      }
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          matched = matched.concat(scanDir(fullPath));
        } else if (stat.isFile()) {
          // Changed in last 3 hours
          if (Date.now() - stat.mtimeMs < 3 * 60 * 60 * 1000) {
            matched.push({ path: fullPath, size: stat.size, mtime: stat.mtime });
          }
        }
      } catch (err) {}
    }
  } catch (err) {}
  return matched;
}

console.log("Scanning system for files modified in the last 3 hours...");
const files = scanDir('/');
files.sort((a, b) => b.mtime - a.mtime);
files.forEach(f => {
  console.log(`${f.path} - Size: ${f.size} bytes - ${f.mtime}`);
});
console.log("Done.");
