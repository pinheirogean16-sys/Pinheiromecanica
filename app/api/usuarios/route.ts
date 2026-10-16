import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const userSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200).trim(),
  email: z.string().email('E-mail inválido').max(200).trim().toLowerCase(),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(200),
  role: z
    .enum(['ADMIN', 'LIDER', 'MECANICO', 'FINANCEIRO', 'ESTOQUISTA'])
    .default('MECANICO'),
  especialidade: z.string().max(200).optional().nullable(),
  comissao: z.coerce.number().nonnegative().optional().default(0),
});

// ============================================================
// GET — Listar usuários da empresa
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para ver a lista
    if (!checkPermission(user, 'usuarios', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').slice(0, 100);

    const where: any = {
      empresa_id: user.empresa_id,
    };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { especialidade: { contains: q } },
      ];
    }

    // M06: limita tamanho da página
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          especialidade: true,
          comissao: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      items: users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    // B05: retorna 500 em vez de lista vazia silenciosa
    log(
      'ERROR',
      'USUARIOS',
      'Erro ao listar usuários',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

// ============================================================
// POST — Criar usuário
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user: currentUser } = await requireAuth();
    if (error) return error;

    if (!checkPermission(currentUser, 'usuarios', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = userSchema.parse(await request.json());

    // A24 (parcial): verifica e-mail DENTRO da empresa.
    // NOTA: o schema.prisma ainda tem `email @unique` GLOBAL. Isso significa
    // que o mesmo e-mail ainda NÃO pode existir em duas empresas diferentes.
    // Corrigir isso requer migration para `@@unique([email, empresa_id])`.
    const existing = await prisma.user.findFirst({
      where: { email: body.email, empresa_id: currentUser.empresa_id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso nesta empresa' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          empresa_id: currentUser.empresa_id,
          name: body.name,
          email: body.email,
          password_hash: hashedPassword,
          role: body.role,
          especialidade: body.especialidade || null,
          comissao: body.comissao,
          updated_at: new Date(),
        },
        select: { id: true, name: true, email: true, role: true },
      });
    } catch (err: any) {
      // A24 (parcial): se o e-mail já existe em OUTRA empresa, o banco rejeita
      // com P2002 porque o índice ainda é global. Mensagem clara para o usuário.
      if (err?.code === 'P2002') {
  return NextResponse.json(
    { error: 'Este e-mail já está cadastrado nesta empresa' },
    { status: 409 }
  );
}
      throw err;
    }

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'CRIAR',
      entidade: 'User',
      entidade_id: newUser.id,
      usuario: currentUser?.name || currentUser?.email || 'Sistema',
      empresa_id: currentUser.empresa_id,
      dados_depois: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });

    log(
      'INFO',
      'USUARIOS',
      'Usuário criado',
      { id: newUser.id, email: newUser.email, role: newUser.role },
      currentUser?.name
    );

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log(
      'ERROR',
      'USUARIOS',
      'Erro ao criar usuário',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
