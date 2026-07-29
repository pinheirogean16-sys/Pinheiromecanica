import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function bootstrapAdminUser() {
  console.log('🤖 [Bootstrap] Iniciando verificação de administrador padrão...');
  try {
    // 1. Garantir que a empresa padrão existe
    const empresaId = 'default';
    let empresa = await prisma.empresa.findUnique({
      where: { id: empresaId }
    });

    if (!empresa) {
      console.log('🤖 [Bootstrap] Empresa padrão não encontrada. Criando...');
      empresa = await prisma.empresa.create({
        data: {
          id: empresaId,
          nome: 'Empresa Padrão',
          cnpj: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log('🤖 [Bootstrap] Empresa padrão criada.');
    } else {
      console.log('🤖 [Bootstrap] Empresa padrão já existe.');
    }

    // 2. Garantir que o usuário administrador existe
    const adminEmail = 'geanzinppsc@gmail.com';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      console.log(`🤖 [Bootstrap] Usuário administrador (${adminEmail}) não encontrado. Criando...`);
      
      const hashedPassword = await bcrypt.hash('290720Be', 10);
      
      await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: 'Administrador',
          email: adminEmail,
          password_hash: hashedPassword,
          role: 'ADMIN',
          especialidade: 'Administrador do Sistema',
          comissao: 0.00,
          empresa_id: empresaId,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log('🤖 [Bootstrap] Usuário administrador criado.');
    } else {
      console.log('🤖 [Bootstrap] Usuário administrador já existe.');
    }
  } catch (error) {
    console.error('❌ [Bootstrap] Erro durante a inicialização do administrador padrão:', error);
  }
}
