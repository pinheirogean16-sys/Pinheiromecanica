const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    });
    console.log("LAST 5 AUDIT LOGS IN THE SYSTEM:");
    logs.forEach((l, idx) => {
      console.log(`--- [LOG ${idx + 1}] ---`);
      console.log(`ID: ${l.id}`);
      console.log(`Modulo: ${l.modulo}`);
      console.log(`Acao: ${l.acao}`);
      console.log(`Entidade: ${l.entidade} (${l.entidade_id})`);
      console.log(`Usuario: ${l.usuario}`);
      console.log(`IP: ${l.ip}`);
      console.log(`Created At: ${l.created_at}`);
      console.log(`Dados Antes: ${l.dados_antes ? l.dados_antes.substring(0, 300) + '...' : 'null'}`);
      console.log(`Dados Depois: ${l.dados_depois ? l.dados_depois.substring(0, 300) + '...' : 'null'}`);
    });
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
