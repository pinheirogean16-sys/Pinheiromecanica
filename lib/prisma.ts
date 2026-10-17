import { PrismaClient, Prisma } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

export interface QueryLogEntry {
  model: string;
  operation: string;
  duration: number;
  timestamp: string;
  error?: string;
}

// ============================================================
// M07: telemetria só é populada em desenvolvimento.
// Em produção, o objeto fica vazio (não é escrito por ninguém).
// ============================================================
export const dbTelemetry = {
  totalQueries: 0,
  slowQueries: 0,
  failedQueries: 0,
  queriesLog: [] as QueryLogEntry[],
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ⚡ Logs do Prisma: só 'error' em produção (sem 'query' nem 'warn')
const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['error', 'warn'] : ['error'],
  });

if (isDev) {
  globalForPrisma.prisma = basePrisma;
}

// ============================================================
// M07: extensão de telemetria definida separadamente.
// Só é aplicada em desenvolvimento — em produção, o client
// exportado é o `basePrisma` puro, sem overhead por query.
// ============================================================
const telemetryExtension = Prisma.defineExtension({
  name: 'query-telemetry',
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
          error: err?.message || 'Erro de query',
        });

        if (dbTelemetry.queriesLog.length > 50) {
          dbTelemetry.queriesLog.length = 50;
        }

        throw err;
      }
    },
  },
});

// ============================================================
// Export: em dev aplica extensão (telemetria ativa).
// Em produção retorna o client puro (zero overhead por query).
// O tipo é forçado a ExtendedClient para o autocomplete do IDE
// continuar funcionando — em produção, todos os métodos do
// basePrisma continuam disponíveis (a extensão só adiciona).
// ============================================================
export const prisma: PrismaClient = (
  isDev ? basePrisma.$extends(telemetryExtension) : basePrisma
) as PrismaClient;
