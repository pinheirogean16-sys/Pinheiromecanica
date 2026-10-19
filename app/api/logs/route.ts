import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const logsQuerySchema = z.object({
  modulo: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10), // 👈 Teto de 100
  // ✅ REMOVIDO: skip_pagination (DoS crítico)
});

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ CORRIGIDO: usa permissão específica de auditoria
    if (!checkPermission(user, 'auditoria', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = logsQuerySchema.parse({
      modulo: searchParams.get('modulo') || undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const { modulo, page, limit } = parsed;
    const skip = (page - 1) * limit;

    const where: any = {
      empresa_id: user.empresa_id,
    };

    if (modulo && modulo !== 'TODOS') {
      where.modulo = modulo;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'AUDITORIA', 'Erro ao buscar logs');
  }
}
