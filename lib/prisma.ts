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

const createPrismaClient = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });
  } catch (err) {
    console.warn('[AI Studio] PrismaClient initialization warning:', err);
    return new PrismaClient();
  }
};

export const basePrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

let bootstrapPromise: Promise<void> | null = null;

async function ensureBootstrap() {
  if (typeof window !== 'undefined') return;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        console.log('🤖 [Prisma Lazy Bootstrap] Verificando administrador padrão...');
        const { bootstrapAdminUser } = await import('@/lib/bootstrap');
        await bootstrapAdminUser();
        console.log('✅ [Prisma Lazy Bootstrap] Verificação concluída.');
      } catch (err) {
        console.error('❌ [Prisma Lazy Bootstrap] Erro durante o bootstrap do administrador:', err);
      }
    })();
  }
  await bootstrapPromise;
}

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }: any) {
      await ensureBootstrap();
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

        const isDbConnError = !process.env.DATABASE_URL || err.message?.includes('DATABASE_URL') || err.message?.includes("Can't reach database server") || err.message?.includes('P1001');
        if (isDbConnError) {
          console.warn(`[AI Studio DB Warning] Query ${model}.${operation} failed due to DB connection:`, err.message);
        }

        throw err;
      }
    }
  }
});
