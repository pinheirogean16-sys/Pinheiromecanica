import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar clientes
    if (!checkPermission(user, 'clientes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    
    const cliente = await prisma.cliente.findFirst({
      where: { id, empresa_id: user.empresa_id }
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // ✅ NOVO: Filtra OS canceladas do histórico
    const [totalOS, totalGasto, ultimaOS] = await Promise.all([
      prisma.ordemServico.count({ 
        where: { 
          cliente_id: id, 
          empresa_id: user.empresa_id,
          status: { not: 'CANCELADA' } // 👈 Exclui canceladas
        } 
      }),
      prisma.ordemServico.aggregate({
        _sum: { valor_total: true },
        where: { 
          cliente_id: id, 
          empresa_id: user.empresa_id,
          status: { not: 'CANCELADA' } // 👈 Exclui canceladas
        }
      }),
      prisma.ordemServico.findFirst({
        where: { 
          cliente_id: id, 
          empresa_id: user.empresa_id,
          status: { not: 'CANCELADA' } // 👈 Exclui canceladas
        },
        orderBy: { data_entrada: 'desc' },
        select: { numero: true, data_entrada: true }
      })
    ]);

    return NextResponse.json({
      totalOS,
      totalGasto: totalGasto._sum.valor_total || 0,
      ultimaOS: ultimaOS ? {
        numero: ultimaOS.numero,
        data: ultimaOS.data_entrada
      } : null
    });
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'CLIENTE', 'Erro ao buscar histórico');
  }
}
