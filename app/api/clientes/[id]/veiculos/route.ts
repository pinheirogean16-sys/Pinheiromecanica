import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// Schema de validação para paginação
const veiculosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar clientes
    if (!checkPermission(user, 'clientes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;

    // Valida se o cliente pertence à empresa (evita IDOR)
    const cliente = await prisma.cliente.findFirst({
      where: { id, empresa_id: user.empresa_id },
      select: { id: true },
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Valida paginação
    const { searchParams } = new URL(request.url);
    const parsed = veiculosQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    const { page, limit } = parsed;

    const [items, total] = await Promise.all([
      prisma.veiculo.findMany({
        where: { cliente_id: id, empresa_id: user.empresa_id },
        orderBy: { modelo: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.veiculo.count({ 
        where: { cliente_id: id, empresa_id: user.empresa_id } 
      }),
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
    return apiError(error, 'CLIENTE', 'Erro ao buscar veículos do cliente');
  }
}
