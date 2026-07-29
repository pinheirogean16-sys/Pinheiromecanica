const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 200
    });
    console.log(`Scanning ${logs.length} database audit logs for exceptions...`);
    
    let foundCount = 0;
    logs.forEach((l) => {
      const logStr = JSON.stringify(l).toLowerCase();
      if (logStr.includes('error') || logStr.includes('exception') || logStr.includes('rejection') || logStr.includes('fail') || logStr.includes('null') || logStr.includes('undefined')) {
         
         // Let's filter on the ones that are likely actual code errors (not just database values being null)
         if (l.modulo === 'CLIENT' || l.modulo === 'SYSTEM' || l.modulo === 'DIAGNOSTICO' || l.modulo === 'ERROR' || logStr.includes('stack') || logStr.includes('err')) {
           foundCount++;
           console.log(`\n=== MATCHING LOG #${foundCount} ===`);
           console.log(`ID: ${l.id}`);
           console.log(`Modulo: ${l.modulo} | Acao: ${l.acao}`);
           console.log(`Created At: ${l.created_at}`);
           console.log(`Dados Antes: ${l.dados_antes ? l.dados_antes.substring(0, 500) : 'null'}`);
           console.log(`Dados Depois: ${l.dados_depois ? l.dados_depois.substring(0, 500) : 'null'}`);
         }
      }
    });

    if (foundCount === 0) {
      console.log("No explicit code errors, stack traces, or client-monitor exceptions found in the AuditLogs.");
    }
  } catch(e) {
    console.error("Database query failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
