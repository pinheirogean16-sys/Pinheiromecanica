import { PrismaClient } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

export interface QueryLogEntry {
  model: string;
  operation: string;
  duration: number;
  timestamp: string;
  error?: string;
}

export const dbTelemetry = {
  totalQueries: 0,
  slowQueries: 0,
  failedQueries: 0,
  queriesLog: [] as QueryLogEntry[],
};

if (isDev && typeof window !== 'undefined') {
  (window as any).__db_telemetry = dbTelemetry;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ⚡ OTIMIZAÇÃO: só erros em produção, sem 'query' nem 'warn'
const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['error', 'warn'] : ['error'],
  });

if (isDev) {
  globalForPrisma.prisma = basePrisma;
}

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }: any) {
      // ⚡ Em produção: apenas executa (zero overhead)
      if (!isDev) {
        return query(args);
      }

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
          timestamp: new Date().toISOString(),
        });

        if (dbTelemetry.queriesLog.length > 50) {
          dbTelemetry.queriesLog.length = 50;
        }

        return result;
      } catch (err: any) {
        dbTelemetry.failedQueries++;
        const duration = Date.now() - startTime;

        dbTelemetry.queriesLog.unshift({
          model: model || 'Raw',
          operation: `${operation} (FAILED)`,
          duration,
          timestamp: new Date().toISOString(),
          error: err.message || 'Erro de query',
        });

        if (dbTelemetry.queriesLog.length > 50) {
          dbTelemetry.queriesLog.length = 50;
        }

        throw err;
      }
    },
  },
});
