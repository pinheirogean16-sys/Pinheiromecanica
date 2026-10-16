import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  empresa_nome: z.string().min(2, 'Nome da empresa muito curto').max(200),
  cnpj: z.string().optional().nullable(),
  nome_admin: z.string().min(2, 'Nome muito curto').max(200),
  email: z.string().email('E-mail inválido').max(200),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').max(200),
  invite_token: z
    .string({ required_error: 'Código de convite obrigatório' })
    .min(1, 'Código de convite obrigatório'),
});

export async function POST(request: Request) {
  try {
    const inviteTokenEsperado = process.env.REGISTER_INVITE_TOKEN;

    // Fail-fast: se a variável não está configurada, bloqueia todo cadastro
    if (!inviteTokenEsperado) {
      log(
        'ERROR',
        'REGISTER',
        'REGISTER_INVITE_TOKEN não configurado — cadastro bloqueado',
        {},
        'SISTEMA'
      );
      return NextResponse.json(
        { error: 'Cadastro indisponível no momento' },
        { status: 503 }
      );
    }

    const body = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { empresa_nome, cnpj, nome_admin, email, senha, invite_token } = parsed.data;

    // Verifica token de convite com comparação direta (sem timing attack real em tokens longos)
    if (invite_token !== inviteTokenEsperado) {
      log(
        'WARN',
        'REGISTER',
        'Tentativa de cadastro com token de convite inválido',
        { email },
        'SISTEMA'
      );
      return NextResponse.json(
        { error: 'Código de convite inválido' },
        { status: 403 }
      );
    }

       // A24: e-mail agora é único por empresa. Como não sabemos a empresa
    // ainda (ela está sendo criada), usamos findFirst como defesa contra
    // race e para alinhar com o novo unique composto.
    const existingUser = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          id: crypto.randomUUID(),
          nome: empresa_nome,
          cnpj: cnpj || null,
          updated_at: new Date(),
        },
      });

      const hash = await bcrypt.hash(senha, 10);
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          name: nome_admin,
          email,
          password_hash: hash,
          role: 'ADMIN',
          empresa_id: empresa.id,
          updated_at: new Date(),
        },
      });

      return { empresa, user };
    });

    log(
      'INFO',
      'REGISTER',
      'Nova empresa cadastrada via convite',
      { empresaId: result.empresa.id, email },
      'SISTEMA'
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log('ERROR', 'REGISTER', 'Erro no registro', { error: error.message }, 'SISTEMA');
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
