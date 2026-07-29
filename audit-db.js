const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Checking MySQL connection...");
    
    // Check tables
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: {
        created_at: 'desc'
      },
      take: 20
    });
    console.log("SUCCESSFULLY CONNECTED");
    console.log("Audit logs:", JSON.stringify(auditLogs, null, 2));

  } catch (err) {
    console.error("Database connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
