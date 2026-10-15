import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200).trim().optional(),
  email: z
    .string()
    .email('E-mail inválido')
    .max(200)
    .trim()
    .toLowerCase()
    .optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(200)
    .optional(),
  role: z
    .enum(['ADMIN', 'LIDER', 'MECANICO', 'FINANCEIRO', 'ESTOQUISTA'])
    .optional(),
  especialidade: z.string().max(200).optional().nullable(),
  comissao: z.coerce.number().nonnegative().optional(),
});

// ============================================================
// GET — Buscar um usuário
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user: currentUser, error } = await requireAuth();
    if (error) return error;

    // GET: autoriza se for o próprio usuário OU se tem permissão de visualizar
    // (corrigido: antes usava 'ler', que não existe no RBAC)
    const isSelf = currentUser?.id === id;
    const canView = checkPermission(currentUser, 'usuarios', 'visualizar');

    if (!canView && !isSelf) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        empresa_id: currentUser.empresa_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        empresa_id: true,
        especialidade: true,
        comissao: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return apiError(error, 'USUARIOS', 'Erro ao buscar usuário');
  }
}

// ============================================================
// PUT — Atualizar usuário
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user: currentUser, error } = await requireAuth();
    if (error) return error;

    const isSelf = currentUser?.id === id;
    const canEdit = checkPermission(currentUser, 'usuarios', 'editar');

    if (!canEdit && !isSelf) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = updateUserSchema.parse(await request.json());

    const antes = await prisma.user.findFirst({
      where: {
        id,
        empresa_id: currentUser.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    // Correção (M08): bloquear troca de senha própria por este endpoint.
    // A troca correta é via /api/usuario, que exige senha_atual.
    if (body.password && isSelf) {
      return NextResponse.json(
        {
          error:
            'Para trocar sua própria senha, use o menu "Meu Perfil" (exige senha atual).',
        },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;

    if (body.email !== undefined && body.email !== antes.email) {
      // Verifica duplicidade dentro da empresa antes de tentar
      const outro = await prisma.user.findFirst({
        where: {
          email: body.email,
          empresa_id: currentUser.empresa_id,
          NOT: { id },
        },
        select: { id: true },
      });
      if (outro) {
        return NextResponse.json(
          { error: 'Este e-mail já está em uso nesta empresa' },
          { status: 409 }
        );
      }
      updateData.email = body.email;
    }

    if (body.especialidade !== undefined) {
      updateData.especialidade = body.especialidade;
    }

    if (body.password && !isSelf) {
      updateData.password_hash = await bcrypt.hash(body.password, 10);
    }

    // Apenas quem tem permissão pode mudar role e comissão
    if (canEdit) {
      if (body.role !== undefined) {
        // Correção: não permitir que um ADMIN rebaixe a si mesmo
        if (isSelf && body.role !== antes.role) {
          return NextResponse.json(
            { error: 'Você não pode alterar seu próprio papel (role).' },
            { status: 400 }
          );
        }
        updateData.role = body.role;
      }
      if (body.comissao !== undefined) updateData.comissao = body.comissao;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualizar' },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          empresa_id: true,
          especialidade: true,
          comissao: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado no sistema' },
          { status: 409 }
        );
      }
      throw err;
    }

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'EDITAR',
      entidade: 'User',
      entidade_id: id,
      usuario: currentUser?.name || currentUser?.email || 'Sistema',
      empresa_id: currentUser.empresa_id,
      dados_antes: {
        id: antes.id,
        name: antes.name,
        email: antes.email,
        role: antes.role,
        especialidade: antes.especialidade,
        comissao: antes.comissao,
        senha_alterada: !!body.password,
      },
      dados_depois: user,
    });

    log(
      'INFO',
      'USUARIOS',
      'Usuário atualizado',
      { id, senha_alterada: !!body.password },
      currentUser?.name
    );

    return NextResponse.json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'USUARIOS', 'Erro ao atualizar usuário');
  }
}

// ============================================================
// DELETE — Excluir usuário
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user: currentUser, error } = await requireAuth();
    if (error) return error;

    if (!checkPermission(currentUser, 'usuarios', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    if (currentUser?.id === id) {
      return NextResponse.json(
        { error: 'Você não pode excluir seu próprio usuário' },
        { status: 403 }
      );
    }

    const antes = await prisma.user.findFirst({
      where: {
        id,
        empresa_id: currentUser.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    // Verificar dependências antes de tentar excluir.
    // Evita 500 causado por violação de FK (EventoAgenda.usuario_id é obrigatório).
    const [osCount, eventosUsuarioCount, eventosMecanicoCount] = await Promise.all([
      prisma.ordemServico.count({ where: { mecanico_id: id } }),
      prisma.eventoAgenda.count({ where: { usuario_id: id } }),
      prisma.eventoAgenda.count({ where: { mecanico_id: id } }),
    ]);

    if (osCount > 0 || eventosUsuarioCount > 0 || eventosMecanicoCount > 0) {
      return NextResponse.json(
        {
          error:
            'Este usuário possui histórico (OS ou eventos) e não pode ser excluído. Considere reatribuir os registros antes.',
        },
        { status: 409 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'EXCLUIR',
      entidade: 'User',
      entidade_id: id,
      usuario: currentUser?.name || currentUser?.email || 'Sistema',
      empresa_id: currentUser.empresa_id,
      dados_antes: {
        id: antes.id,
        name: antes.name,
        email: antes.email,
        role: antes.role,
      },
    });

    log('INFO', 'USUARIOS', 'Usuário excluído', { id }, currentUser?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'USUARIOS', 'Erro ao excluir usuário');
  }
}
