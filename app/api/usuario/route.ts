import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';

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
        comissao: true
      }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro GET /api/usuario:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { error, user: authUser } = await requireAuth();
    if (error) return error;
    
    const body = await request.json();
    const { name, email, password } = body;
    
    const updateData: any = { name, email };
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
    
    // Versão simplificada - apenas nome e email, sem senha
    const user = await prisma.user.update({
      where: { id: authUser?.id },
      data: updateData,
      select: { id: true, name: true, email: true }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro PUT /api/usuario:', error);
    return NextResponse.json({ 
      error: 'Erro ao atualizar perfil',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
