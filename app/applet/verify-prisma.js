const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- SYSTEM CHECK ---');

// 1. Verify existence of prisma/schema.prisma and package.json
const schemaExists = fs.existsSync('/app/applet/prisma/schema.prisma');
const packageExists = fs.existsSync('/app/applet/package.json');
console.log('schema.prisma exists:', schemaExists);
console.log('package.json exists:', packageExists);

// 2. Execute prisma generate
console.log('\n--- EXECUTING PRISMA GENERATE ---');
try {
  const genOutput = execSync('npx prisma generate', { encoding: 'utf8' });
  console.log('Prisma generate output:', genOutput);
} catch (e) {
  console.error('Error running prisma generate:', e.message);
}

// Check node_modules/.prisma and node_modules/@prisma/client
const dotPrismaExists = fs.existsSync('/app/applet/node_modules/.prisma');
const clientExists = fs.existsSync('/app/applet/node_modules/@prisma/client');
console.log('.prisma folder exists:', dotPrismaExists);
if (dotPrismaExists) {
  console.log('Contents of .prisma:', fs.readdirSync('/app/applet/node_modules/.prisma'));
}
console.log('@prisma/client folder exists:', clientExists);
if (clientExists) {
  console.log('Contents of @prisma/client:', fs.readdirSync('/app/applet/node_modules/@prisma/client').filter(f => !f.startsWith('.')));
}

// 4. Verify prisma and @prisma/client installation status using npm list
console.log('\n--- VERIFYING INSTALLATION STATUS ---');
try {
  const prismaList = execSync('npm list prisma', { encoding: 'utf8' });
  console.log(prismaList);
} catch (e) {
  if (e.stdout) console.log(e.stdout);
}

try {
  const clientList = execSync('npm list @prisma/client', { encoding: 'utf8' });
  console.log(clientList);
} catch (e) {
  if (e.stdout) console.log(e.stdout);
}

// 6. Search for imports of Prisma
console.log('\n--- SEARCHING FOR PRISMA IMPORTS IN THE CODEBASE ---');
function scanImports(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === 'node_modules' || f === '.next' || f === '.git') continue;
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanImports(fullPath);
      } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('PrismaClient') || content.includes('@prisma/client')) {
          console.log(`FOUND Prisma reference in: ${fullPath}`);
          // Print the lines containing imports
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('PrismaClient') || line.includes('@prisma/client')) {
              console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

scanImports('/lib');
scanImports('/app/api');
scanImports('/app');

console.log('Done scanning.');
