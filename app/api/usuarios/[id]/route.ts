import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  name: z.string().min(2).trim().optional(),
  email: z.string().email().trim().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'LIDER', 'MECANICO', 'FINANCEIRO', 'ESTOQUISTA']).optional(),
  especialidade: z.string().optional().nullable(),
  comissao: z.coerce.number().nonnegative().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user: currentUser, error } = await requireAuth();
    if (error) return error;
    
    // Permitir se for ADMIN ou o próprio usuário
    const isSelf = currentUser?.id === id;
    const isAdmin = checkPermission(currentUser, 'usuarios', 'ler');

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, empresa_id: true, especialidade: true, comissao: true, created_at: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Validar empresa
    if (user.empresa_id !== (currentUser?.empresa_id || 'default') && !isSelf) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error) {
    log('ERROR', 'USUARIOS', 'Erro ao buscar usuário', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user: currentUser, error } = await requireAuth();
    if (error) return error;
    
    const isSelf = currentUser?.id === id;
    const isAdmin = checkPermission(currentUser, 'usuarios', 'editar');

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }
    
    const body = updateUserSchema.parse(await request.json());
    const antes = await prisma.user.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (currentUser?.empresa_id || 'default') && !isSelf) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const updateData: any = { 
      name: body.name, 
      email: body.email, 
      especialidade: body.especialidade 
    };

    if (body.password) {
      updateData.password_hash = await bcrypt.hash(body.password, 10);
    }
    
    // Apenas ADMIN pode mudar Role e Comissão
    if (isAdmin) {
      if (body.role) updateData.role = body.role;
      if (body.comissao !== undefined) updateData.comissao = body.comissao;
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, empresa_id: true, especialidade: true, comissao: true }
    });

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'EDITAR',
      entidade: 'User',
      entidade_id: id,
      usuario: currentUser?.name || currentUser?.email || 'Sistema',
      dados_antes: { id: antes.id, name: antes.name, email: antes.email, role: antes.role, especialidade: antes.especialidade, comissao: antes.comissao },
      dados_depois: user
    });

    log('INFO', 'USUARIOS', 'Usuário atualizado', { id }, currentUser?.name);
    
    return NextResponse.json(user);
  } catch (error) {
    log('ERROR', 'USUARIOS', 'Erro ao atualizar usuário', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário' }, { status: 403 });
    }
    
    const antes = await prisma.user.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (currentUser?.empresa_id || 'default')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      modulo: 'USUARIOS',
      acao: 'EXCLUIR',
      entidade: 'User',
      entidade_id: id,
      usuario: currentUser?.name || currentUser?.email || 'Sistema',
      dados_antes: { id: antes?.id, name: antes?.name, email: antes?.email, role: antes?.role }
    });

    log('INFO', 'USUARIOS', 'Usuário excluído', { id }, currentUser?.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'USUARIOS', 'Erro ao excluir usuário', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
