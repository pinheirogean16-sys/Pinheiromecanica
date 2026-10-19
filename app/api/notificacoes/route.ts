import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const notificacaoSchema = z.object({
  titulo: z.string().min(1).max(200).trim(),
  mensagem: z.string().min(1).max(2000).trim(),
  link: z.string().max(500).optional().nullable().refine(
    (val) => !val || val.startsWith('/') || val.startsWith('https://') || val.startsWith('http://'),
    { message: 'Link inválido. Use caminho relativo ou URL http(s).' }
  ),
  usuario_id: z.string().min(1),
});

const listarQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 1 : val),
    z.coerce.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 10 : val),
    z.coerce.number().int().min(1).max(100).default(10)
  ),
  lida: z.enum(['true', 'false']).optional(),
  triggerCheck: z.string().optional(), // Ignora o parâmetro enviado pelo front
});

// ============================================================
// GET — Listar notificações do usuário
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);

    // ✅ O `|| undefined` garante que valores nulos da URL não quebrem o Zod
    const parsed = listarQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || searchParams.get('limite') || undefined,
      lida: searchParams.get('lida') || undefined,
      triggerCheck: searchParams.get('triggerCheck') || undefined,
    });

    const { page, limit, lida } = parsed;
    const skip = (page - 1) * limit;

    const where: any = {
      usuario_id: user.id,
      empresa_id: user.empresa_id,
    };

    if (lida !== undefined) {
      where.lida = lida === 'true';
    }

    const [items, total, naoLidas] = await Promise.all([
      prisma.notificacao.findMany({
        where,
        orderBy: [{ lida: 'asc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.notificacao.count({ where }),
      prisma.notificacao.count({
        where: { usuario_id: user.id, empresa_id: user.empresa_id, lida: false },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      naoLidas,
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
    return apiError(error, 'NOTIFICACAO', 'Erro ao buscar notificações');
  }
}

// ============================================================
// POST — Criar notificação manual
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'notificacao', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = notificacaoSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    const destinatario = await prisma.user.findFirst({
      where: { id: body.usuario_id, empresa_id },
      select: { id: true, name: true },
    });

    if (!destinatario) {
      return NextResponse.json(
        { error: 'Usuário destinatário não encontrado nesta empresa.' },
        { status: 400 }
      );
    }

    const notificacao = await prisma.notificacao.create({
      data: {
        id: globalThis.crypto.randomUUID(),
        empresa_id,
        titulo: body.titulo,
        mensagem: body.mensagem,
        link: body.link || null,
        usuario_id: body.usuario_id,
      },
    });

    await createAuditLog({
      modulo: 'NOTIFICACAO',
      acao: 'CRIAR',
      entidade: 'Notificacao',
      entidade_id: notificacao.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id,
      dados_depois: {
        titulo: body.titulo,
        destinatario: destinatario.name,
      },
    });

    log(
      'INFO',
      'NOTIFICACAO',
      'Notificação criada',
      { id: notificacao.id, para: body.usuario_id },
      user?.name
    );

    return NextResponse.json(notificacao);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'NOTIFICACAO', 'Erro ao criar notificação');
  }
}

// ============================================================
// DELETE — Excluir notificações do usuário
// ============================================================
export async function DELETE(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type');

    if (deleteType === 'todas') {
      const result = await prisma.notificacao.deleteMany({
        where: {
          usuario_id: user.id,
          empresa_id: user.empresa_id,
        },
      });

      await createAuditLog({
        modulo: 'NOTIFICACAO',
        acao: 'EXCLUIR',
        entidade: 'Notificacao',
        entidade_id: 'TODAS',
        usuario: user?.name || user?.email || 'Sistema',
        empresa_id: user.empresa_id,
        dados_antes: { deletadas: result.count },
      });

      log(
        'INFO',
        'NOTIFICACAO',
        'Notificações excluídas em massa',
        { quantidade: result.count },
        user?.name
      );

      return NextResponse.json({ success: true, deleted: result.count });
    }

    return NextResponse.json({ error: 'Tipo de exclusão inválido' }, { status: 400 });
  } catch (error: any) {
    return apiError(error, 'NOTIFICACAO', 'Erro ao excluir notificações');
  }
}
