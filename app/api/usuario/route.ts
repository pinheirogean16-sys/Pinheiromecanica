import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updatePerfilSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200).optional(),
  email: z.string().email('E-mail inválido').max(200).optional(),
  password: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres').max(200).optional(),
  senha_atual: z.string().optional(),
});

export async function GET() {
  try {
    const { error, user: authUser } = await requireAuth();
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: authUser?.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        especialidade: true,
        comissao: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    return apiError(error, 'USUARIO', 'Erro ao buscar perfil');
  }
}

export async function PUT(request: Request) {
  try {
    const { error, user: authUser } = await requireAuth();
    if (error) return error;

    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = updatePerfilSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const atual = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: true,
        empresa_id: true,
        token_version: true,
      },
    });
    if (!atual) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updateData: any = {};

    if (body.name !== undefined && body.name !== atual.name) {
      updateData.name = body.name;
    }

    if (body.email !== undefined && body.email !== atual.email) {
      // A24: checagem de email agora é POR EMPRESA.
      // O mesmo email pode existir em outra empresa sem problema.
      const outroComEmail = await prisma.user.findFirst({
        where: {
          email: body.email,
          empresa_id: atual.empresa_id,
          NOT: { id: atual.id },
        },
        select: { id: true },
      });
      if (outroComEmail) {
        return NextResponse.json(
          { error: 'Este e-mail já está em uso por outro usuário nesta empresa' },
          { status: 409 }
        );
      }
      updateData.email = body.email;
    }

    let senhaAlterada = false;

    if (body.password !== undefined) {
      if (!body.senha_atual) {
        return NextResponse.json(
          { error: 'Informe a senha atual para trocar a senha' },
          { status: 400 }
        );
      }

      const senhaAtualConfere = await bcrypt.compare(
        body.senha_atual,
        atual.password_hash
      );
      if (!senhaAtualConfere) {
        log(
          'WARN',
          'USUARIO',
          'Tentativa de troca de senha com senha atual incorreta',
          { userId: atual.id },
          atual.name
        );
        return NextResponse.json(
          { error: 'Senha atual incorreta' },
          { status: 403 }
        );
      }

      updateData.password_hash = await bcrypt.hash(body.password, 10);
      updateData.token_version = (atual.token_version ?? 0) + 1;
      senhaAlterada = true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { id: atual.id, name: atual.name, email: atual.email }
      );
    }

    const user = await prisma.user.update({
      where: { id: atual.id },
      data: updateData,
      select: { id: true, name: true, email: true },
    });

    await createAuditLog({
      modulo: 'USUARIO',
      acao: 'EDITAR_PERFIL',
      entidade: 'User',
      entidade_id: atual.id,
      usuario: atual.name || atual.email || 'Sistema',
      empresa_id: atual.empresa_id,
      dados_antes: { name: atual.name, email: atual.email },
      dados_depois: {
        name: user.name,
        email: user.email,
        senha_alterada: senhaAlterada,
      },
    });

    log(
      'INFO',
      'USUARIO',
      'Perfil atualizado',
      { userId: atual.id, senha_alterada: senhaAlterada },
      atual.name
    );

    return NextResponse.json(user);
  } catch (error: any) {
    return apiError(error, 'USUARIO', 'Erro ao atualizar perfil');
  }
}
