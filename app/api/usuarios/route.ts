import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';

// ============================================================
// SCHEMAS
// ============================================================
const userSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200).trim(),
  email: z.string().email('E-mail inválido').max(200).trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v), 'Senha deve conter ao menos uma letra')
    .refine((v) => /\d/.test(v), 'Senha deve conter ao menos um número'),
  role: z
    .enum(['ADMIN', 'LIDER', 'MECANICO', 'FINANCEIRO', 'ESTOQUISTA'])
    .default('MECANICO'),
  especialidade: z.string().max(200).optional().nullable(),
  comissao: z.coerce.number().nonnegative().max(100, 'Comissão não pode exceder 100%').optional().default(0),
});

// ✅ CORRIGIDO: Blindagem do Zod para nulos/zeros e limite máximo de 1000
const listarUsuariosQuerySchema = z.object({
  q: z.string().nullish().transform((v) => v?.slice(0, 100) || ''),
  page: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 1 : val),
    z.coerce.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || val === 0 ? 10 : val),
    z.coerce.number().int().min(1).max(1000).default(10) // Aumentado para aceitar limit=1000
  ),
});

// ============================================================
// GET — Listar usuários
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'usuarios', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // ✅ CORRIGIDO: `|| undefined` previne o erro "Expected string, received null"
    const parsed = listarUsuariosQuerySchema.parse({
      q: searchParams.get('q') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const { q, page, limit } = parsed;
    const skip = (page - 1) * limit;

    const where: any = { empresa_id: user.empresa_id };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { especialidade: { contains: q } },
      ];
    }

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
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'USUARIOS', 'Erro ao listar usuários');
  }
}

// ============================================================
// POST — Criar usuário
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user: currentUser } = await requireAuth();
    if (error) return error;

    if (!checkPermission(currentUser, 'usuarios', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = userSchema.parse(await request.json());

    // ✅ NOVO: previne escalada de privilégio — só ADMIN pode criar ADMIN
    if (body.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
      log(
        'WARN',
        'USUARIOS',
        'Tentativa de criar ADMIN por não-ADMIN bloqueada',
        { userId: currentUser.id, tentouCriar: body.email },
        currentUser.name
      );
      return NextResponse.json(
        { error: 'Apenas administradores podem criar outros administradores' },
        { status: 403 }
      );
    }

    // Verifica e-mail na empresa
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
          id: globalThis.crypto.randomUUID(),
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
      if (err?.code === 'P2002') {
        log(
          'WARN',
          'USUARIOS',
          'Race condition ou e-mail duplicado ao criar usuário',
          {
            email: body.email,
            empresa_id: currentUser.empresa_id,
            target: err?.meta?.target,
          },
          currentUser.name
        );

        return NextResponse.json(
          { error: 'Este e-mail já está em uso. Verifique a lista de usuários.' },
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
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'USUARIOS', 'Erro ao criar usuário');
  }
}
