import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { empresa_nome, cnpj, nome_admin, email, senha } = await request.json();

    if (!empresa_nome || !nome_admin || !email || !senha) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Verificar se o e-mail já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Este e-mail já está em uso' }, { status: 400 });
    }
  
    const result = await prisma.$transaction(async (tx) => {
      // Criar empresa
      const empresa = await tx.empresa.create({
        data: { 
          nome: empresa_nome, 
          cnpj: cnpj || null 
        }
      });
      
      // Criar admin
      const hash = await bcrypt.hash(senha, 10);
      const user = await tx.user.create({
        data: {
          name: nome_admin,
          email,
          password_hash: hash,
          role: 'ADMIN',
          empresa_id: empresa.id
        }
      });
      
      return { empresa, user };
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no registro:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
