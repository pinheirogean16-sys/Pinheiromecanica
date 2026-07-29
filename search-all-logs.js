const fs = require('fs');
const path = require('path');

function searchFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    if (data.includes('CLIENT ERROR REPORTED') || data.includes('Client error:')) {
      console.log(`FOUND LOGS IN: ${filePath}`);
      return true;
    }
  } catch (err) {}
  return false;
}

function traverseAndSearch(dir, depth = 0) {
  if (depth > 5) return;
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
         traverseAndSearch(fullPath, depth + 1);
      } else if (stat.isFile()) {
         if (searchFile(fullPath)) {
           // Display matching lines
           const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
           lines.forEach((line, idx) => {
             if (line.includes('CLIENT ERROR REPORTED') || line.includes('Client error:')) {
               console.log(`  Line ${idx + 1}: ${line}`);
             }
           });
         }
      }
    }
  } catch (err) {}
}

console.log("Searching for diagnostic logs...");
traverseAndSearch('.');
traverseAndSearch('/tmp');
traverseAndSearch('/var/log');
console.log("Search completed.");
