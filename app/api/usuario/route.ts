import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const updatePerfilSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200).trim().optional(),
  email: z.string().email('E-mail inválido').max(200).toLowerCase().trim().optional(),
  password: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v), 'Senha deve conter ao menos uma letra')
    .refine((v) => /\d/.test(v), 'Senha deve conter ao menos um número')
    .optional(),
  senha_atual: z.string().optional(),
});

// ============================================================
// GET — Buscar perfil do usuário logado
// ============================================================
export async function GET() {
  try {
    const { error, user: authUser } = await requireAuth();
    if (error) return error;

    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: authUser.id,
        empresa_id: authUser.empresa_id, // ✅ Defense in Depth
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        especialidade: true,
        comissao: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return apiError(error, 'USUARIO', 'Erro ao buscar perfil');
  }
}

// ============================================================
// PUT — Atualizar perfil do usuário logado
// ============================================================
export async function PUT(request: Request) {
  try {
    const { error, user: authUser } = await requireAuth();
    if (error) return error;

    if (!authUser?.id || !authUser.empresa_id) {
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

    const atual = await prisma.user.findFirst({
      where: {
        id: authUser.id,
        empresa_id: authUser.empresa_id, // ✅ Defense in Depth
      },
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
    let senhaAlterada = false;
    let emailAlterado = false;

    // ---------------------------------------------------------
    // Valida senha atual se for trocar e-mail OU senha
    // (mesma proteção para ações sensíveis)
    // ---------------------------------------------------------
    const vaiMudarEmail = body.email !== undefined && body.email !== atual.email;
    const vaiMudarSenha = body.password !== undefined;
    const precisaDeSenhaAtual = vaiMudarEmail || vaiMudarSenha;

    if (precisaDeSenhaAtual) {
      if (!body.senha_atual) {
        return NextResponse.json(
          {
            error: vaiMudarEmail
              ? 'Informe a senha atual para alterar o e-mail'
              : 'Informe a senha atual para trocar a senha',
          },
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
          'Tentativa de alteração sensível com senha atual incorreta',
          { userId: atual.id, tipo: vaiMudarEmail ? 'EMAIL' : 'SENHA' },
          authUser.name
        );
        return NextResponse.json(
          { error: 'Senha atual incorreta' },
          { status: 403 }
        );
      }
    }

    // ---------------------------------------------------------
    // Nome
    // ---------------------------------------------------------
    if (body.name !== undefined && body.name !== atual.name) {
      updateData.name = body.name;
    }

    // ---------------------------------------------------------
    // E-mail — unicidade POR EMPRESA
    // (consistente com @@unique([email, empresa_id]) do banco)
    // ---------------------------------------------------------
    if (vaiMudarEmail) {
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
      emailAlterado = true;
    }

    // ---------------------------------------------------------
    // Senha
    // ---------------------------------------------------------
    if (vaiMudarSenha) {
      updateData.password_hash = await bcrypt.hash(body.password!, 10);
      updateData.token_version = (atual.token_version ?? 0) + 1;
      senhaAlterada = true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        id: atual.id,
        name: atual.name,
        email: atual.email,
      });
    }

    // ✅ Redundância de segurança: empresa_id no where
    const user = await prisma.user.update({
      where: {
        id: atual.id,
        empresa_id: authUser.empresa_id,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        especialidade: true,
        comissao: true,
      },
    });

    await createAuditLog({
      modulo: 'USUARIO',
      acao: 'EDITAR_PERFIL',
      entidade: 'User',
      entidade_id: atual.id,
      usuario: authUser.name || authUser.email || 'Sistema',
      empresa_id: atual.empresa_id,
      dados_antes: { name: atual.name, email: atual.email },
      dados_depois: {
        name: user.name,
        email: user.email,
        email_alterado: emailAlterado,
        senha_alterada: senhaAlterada,
      },
    });

    // ✅ Log com o operador (authUser), não com o estado antigo (atual)
    log(
      'INFO',
      'USUARIO',
      'Perfil atualizado',
      {
        userId: atual.id,
        email_alterado: emailAlterado,
        senha_alterada: senhaAlterada,
      },
      authUser.name
    );

    return NextResponse.json(user);
  } catch (error: any) {
    return apiError(error, 'USUARIO', 'Erro ao atualizar perfil');
  }
}
