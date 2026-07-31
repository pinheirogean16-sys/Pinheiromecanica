import { PrismaClient } from '@prisma/client';

export const dbTelemetry = {
  totalQueries: 0,
  slowQueries: 0,
  failedQueries: 0,
  queriesLog: [] as { model: string; operation: string; duration: number; timestamp: string; error?: string }[]
};

if (typeof window !== 'undefined') {
  (window as any).__db_telemetry = dbTelemetry;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }: any) {
      dbTelemetry.totalQueries++;
      const startTime = Date.now();
      try {
        const result = await query(args);
        const duration = Date.now() - startTime;
        
        if (duration > 150) {
          dbTelemetry.slowQueries++;
        }

        dbTelemetry.queriesLog.unshift({
          model: model || 'Raw',
          operation,
          duration,
          timestamp: new Date().toLocaleTimeString(),
        });

        if (dbTelemetry.queriesLog.length > 50) {
          dbTelemetry.queriesLog.pop();
        }

        return result;
      } catch (err: any) {
        dbTelemetry.failedQueries++;
        const duration = Date.now() - startTime;

        dbTelemetry.queriesLog.unshift({
          model: model || 'Raw',
          operation: `${operation} (FAILED)`,
          duration,
          timestamp: new Date().toLocaleTimeString(),
          error: err.message || 'Erro de query',
        });

        if (dbTelemetry.queriesLog.length > 50) {
          dbTelemetry.queriesLog.pop();
        }

        throw err;
      }
    }
  }
});
