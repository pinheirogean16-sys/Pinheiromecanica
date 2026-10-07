import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { verificarContasAtrasadas, verificarContasAVencer } from '@/lib/notificacoes-financeiras';

const notificacaoSchema = z.object({
  titulo: z.string().min(1).trim(),
  mensagem: z.string().min(1).trim(),
  link: z.string().optional().nullable(),
  usuario_id: z.string().min(1)
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const triggerCheck = searchParams.get('triggerCheck') === 'true';

    // Trigger financial check for admin/financial roles if requested
    if (triggerCheck && (user.role === 'ADMIN' || user.role === 'FINANCEIRO')) {
      // Essas funções já criam notificações no banco para os admins
      await verificarContasAtrasadas(user.empresa_id);
      await verificarContasAVencer(3, user.empresa_id);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = { 
      usuario_id: user.id,
      empresa_id: user.empresa_id
    };

    const [items, total] = await Promise.all([
      prisma.notificacao.findMany({
        where,
        orderBy: [
          { lida: 'asc' },
          { created_at: 'desc' }
        ],
        skip,
        take: limit,
      }),
      prisma.notificacao.count({ where })
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    log('ERROR', 'NOTIFICACAO', 'Erro ao buscar notificações', { error }, 'sistema');
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // Apenas ADMIN ou LIDER costumam criar notificações manuais para outros
    if (!checkPermission(user, 'notificacao', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = notificacaoSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    const notificacao = await prisma.notificacao.create({
      data: {
        id: globalThis.crypto.randomUUID(),
        empresa_id,
        titulo: body.titulo,
        mensagem: body.mensagem,
        link: body.link,
        usuario_id: body.usuario_id
      }
    });

    log('INFO', 'NOTIFICACAO', 'Notificação criada', { id: notificacao.id, para: body.usuario_id }, user?.name);

    return NextResponse.json(notificacao);
  } catch (error) {
    log('ERROR', 'NOTIFICACAO', 'Erro ao criar notificação', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar notificação' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type');

    if (deleteType === 'todas') {
      await prisma.notificacao.deleteMany({
        where: { 
          usuario_id: user.id,
          empresa_id: user.empresa_id
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tipo de exclusão inválido' }, { status: 400 });
  } catch (error) {
    log('ERROR', 'NOTIFICACAO', 'Erro ao excluir notificações', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir notificações' }, { status: 500 });
  }
}
