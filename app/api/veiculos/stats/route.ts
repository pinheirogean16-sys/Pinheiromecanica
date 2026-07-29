import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [total, ativo, maintToday, inMaint] = await Promise.all([
      prisma.veiculo.count(),
      prisma.veiculo.count({ 
        where: { 
          OrdemServico: { 
            some: { 
              status: { notIn: ['FINALIZADA', 'ENTREGUE', 'CANCELADA'] } 
            } 
          } 
        } 
      }),
      prisma.ordemServico.count({ 
        where: { 
          data_entrada: { gte: hoje },
          status: { notIn: ['FINALIZADA', 'ENTREGUE', 'CANCELADA'] }
        } 
      }),
      prisma.ordemServico.count({ 
        where: { 
          status: { in: ['EM_EXECUCAO', 'EM_DIAGNOSTICO', 'ABERTA', 'AGUARDANDO_PECAS'] } 
        } 
      }),
    ]);

    return NextResponse.json({ total, ativo, maintToday, inMaint });
  } catch (error) {
    console.error('Erro stats veiculos:', error);
    return NextResponse.json({ total: 0, ativo: 0, maintToday: 0, inMaint: 0 });
  }
}
