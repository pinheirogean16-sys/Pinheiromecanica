import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import bcrypt from 'bcryptjs';

// ============================================================
// SCHEMA
// ============================================================
const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200).trim().optional(),
  email: z.string().email('E-mail inválido').max(200).trim().toLowerCase().optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v), 'Senha deve conter ao menos uma letra')
    .refine((v) => /\d/.test(v), 'Senha deve conter ao menos um número')
    .optional(),
  role: z.enum(['ADMIN', 'LIDER', 'MECANICO', 'FINANCEIRO', 'ESTOQUISTA']).optional(),
  especialidade: z.string().max(200).optional().nullable(),
  comissao: z.coerce.number().nonnegative().max(100, 'Comissão não pode exceder 100%').optional(),
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

    if (!currentUser?.empresa_id) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const isSelf = currentUser.id === id;
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

    if (!currentUser?.empresa_id) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const isSelf = currentUser.id === id;
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

    // Bloqueia troca de senha própria por este endpoint (use /api/usuario)
    if (body.password && isSelf) {
      return NextResponse.json(
        {
          error: 'Para trocar sua própria senha, use o menu "Meu Perfil" (exige senha atual).',
        },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;

    if (body.email !== undefined && body.email !== antes.email) {
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

    // ---------------------------------------------------------
    // RESET DE SENHA POR ADMIN — invalida sessões antigas
    // ---------------------------------------------------------
    let senhaResetada = false;
    if (body.password && !isSelf) {
      updateData.password_hash = await bcrypt.hash(body.password, 10);
      updateData.token_version = (antes.token_version ?? 0) + 1; // ✅ CRÍTICO
      senhaResetada = true;
    }

    // ---------------------------------------------------------
    // ROLE e COMISSÃO — apenas com permissão de edição
    // + TRAVA DE PRIVILÉGIO: só ADMIN mexe com papéis ADMIN
    // ---------------------------------------------------------
    if (canEdit) {
      if (body.role !== undefined) {
        // Não permite auto-alteração de papel (mantido do original)
        if (isSelf && body.role !== antes.role) {
          return NextResponse.json(
            { error: 'Você não pode alterar seu próprio papel (role).' },
            { status: 400 }
          );
        }

        // ✅ NON-ADMIN não pode promover ninguém a ADMIN
        if (body.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
          log(
            'WARN',
            'USUARIOS',
            'Tentativa de promoção a ADMIN por não-ADMIN bloqueada',
            { targetUserId: id, userId: currentUser.id },
            currentUser.name
          );
          return NextResponse.json(
            { error: 'Apenas administradores podem promover usuários a administrador.' },
            { status: 403 }
          );
        }

        // ✅ NON-ADMIN não pode alterar o papel de um ADMIN
        if (antes.role === 'ADMIN' && body.role !== 'ADMIN' && currentUser.role !== 'ADMIN') {
          log(
            'WARN',
            'USUARIOS',
            'Tentativa de rebaixar ADMIN por não-ADMIN bloqueada',
            { targetUserId: id, userId: currentUser.id },
            currentUser.name
          );
          return NextResponse.json(
            { error: 'Apenas administradores podem alterar o papel de outro administrador.' },
            { status: 403 }
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
      // ✅ Defense in Depth: empresa_id no where
      user = await prisma.user.update({
        where: {
          id,
          empresa_id: currentUser.empresa_id,
        },
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
        // Enquanto A24 não estiver migrado, o índice pode ser global
        return NextResponse.json(
          { error: 'Este e-mail já está em uso. Verifique a lista de usuários.' },
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
      },
      dados_depois: {
        ...user,
        senha_resetada: senhaResetada,
      },
    });

    log(
      'INFO',
      'USUARIOS',
      'Usuário atualizado',
      { id, senha_resetada: senhaResetada },
      currentUser?.name
    );

    return NextResponse.json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
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

    if (!currentUser?.empresa_id) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    if (!checkPermission(currentUser, 'usuarios', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    if (currentUser.id === id) {
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

    // ✅ TRAVA DE PRIVILÉGIO: NON-ADMIN não pode excluir ADMIN
    if (antes.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
      log(
        'WARN',
        'USUARIOS',
        'Tentativa de excluir ADMIN por não-ADMIN bloqueada',
        { targetUserId: id, userId: currentUser.id },
        currentUser.name
      );
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir outros administradores.' },
        { status: 403 }
      );
    }

    // Verificar dependências antes de tentar excluir
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

    // ✅ Defense in Depth: empresa_id no where
    await prisma.user.delete({
      where: {
        id,
        empresa_id: currentUser.empresa_id,
      },
    });

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

    log('INFO', 'USUARIOS', 'Usuário excluído', { id, role: antes.role }, currentUser?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'USUARIOS', 'Erro ao excluir usuário');
  }
}
