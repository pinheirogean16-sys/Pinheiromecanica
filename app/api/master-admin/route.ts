import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

// ==========================================
// GET: Buscar dados para o Painel Master
// ==========================================
export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // 🔒 TRAVA DE SEGURANÇA MÁXIMA
    if (user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acesso negado. Área restrita.' }, { status: 403 });
    }

    // Busca todas as empresas (Inquilinos)
    const empresas = await prisma.empresa.findMany({
      include: {
        _count: {
          select: { User: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Estatísticas Globais
    const totalEmpresas = await prisma.empresa.count();
    const totalUsuarios = await prisma.user.count();
    const totalOS = await prisma.ordemServico.count();
    
    // Simulação de MRR (Faturamento Mensal Recorrente)
    let mrr = 0;
    empresas.forEach(emp => {
      if (emp.plano === 'PRO') mrr += 149.90;
      if (emp.plano === 'BASICO') mrr += 89.90;
    });

    // Últimos logs críticos de todo o sistema
    const logsRecentes = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalEmpresas,
        totalUsuarios,
        totalOS,
        mrr
      },
      empresas,
      logsRecentes
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno no servidor master' }, { status: 500 });
  }
}

// ==========================================
// PATCH: Atualizar Plano ou Status da Empresa
// ==========================================
export async function PATCH(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // 🔒 TRAVA DE SEGURANÇA MÁXIMA
    if (user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const { empresa_id, status, plano } = body;

    if (!empresa_id) {
      return NextResponse.json({ error: 'ID da empresa não enviado.' }, { status: 400 });
    }

    // Atualiza a empresa no banco de dados
    const updated = await prisma.empresa.update({
      where: { id: empresa_id },
      data: { 
        ...(status && { status }),
        ...(plano && { plano })
      }
    });

    return NextResponse.json(updated);
    
  } catch (error: any) {
    // 👇 ISSO VAI MOSTRAR O ERRO REAL NO TOAST SE ALGO FALHAR
    console.error("ERRO NO PATCH MASTER:", error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar empresa.' }, { status: 500 });
  }
}
