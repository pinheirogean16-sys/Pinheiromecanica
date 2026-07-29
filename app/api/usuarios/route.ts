import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const userSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().email().trim(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'LIDER', 'MECANICO', 'FINANCEIRO', 'ESTOQUISTA']).default('MECANICO'),
  especialidade: z.string().optional().nullable(),
  comissao: z.coerce.number().nonnegative().optional().default(0),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const where: any = {
      empresa_id: user?.empresa_id || 'default'
    };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { especialidade: { contains: q } }
      ];
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
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
          created_at: true
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ]);
    
    return NextResponse.json({
      items: users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    log('ERROR', 'USUARIOS', 'Erro ao listar usuários', { error }, 'sistema');
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user: currentUser } = await requireAuth();
    if (error) return error;

    if (!checkPermission(currentUser, 'usuarios', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }
    
    const body = userSchema.parse(await request.json());
    
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: 'E-mail em uso' }, { status: 400 });
    
    const hashedPassword = await bcrypt.hash(body.password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        empresa_id: currentUser?.empresa_id || 'default',
        name: body.name,
        email: body.email,
        password_hash: hashedPassword,
        role: body.role,
        especialidade: body.especialidade, 
        comissao: body.comissao
      },
      select: { id: true, name: true, email: true, role: true }
    });

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'CRIAR',
      entidade: 'User',
      entidade_id: newUser.id,
      usuario: currentUser?.name || currentUser?.email || 'Sistema',
      dados_depois: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });

    log('INFO', 'USUARIOS', 'Usuário criado', { id: newUser.id, email: newUser.email }, currentUser?.name);
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    log('ERROR', 'USUARIOS', 'Erro ao criar usuário', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 });
  }
}
