import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const osEmAndamento = await prisma.ordemServico.findMany({
      where: {
        status: {
          in: ['ABERTA', 'EM_DIAGNOSTICO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'AGUARDANDO_APROVACAO']
        }
      },
      include: {
        cliente: true,
        veiculo: true
      },
      orderBy: { data_entrada: 'desc' },
      take: 10
    });

    const formatado = osEmAndamento.map(os => ({
      id: os.id,
      numero: os.numero,
      cliente: os.cliente.nome,
      veiculo: `${os.veiculo.modelo} - ${os.veiculo.ano}`,
      servico: os.diagnostico || 'Não informado',
      inicio: os.data_entrada
    }));

    return NextResponse.json(formatado);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar OS em andamento' }, { status: 500 });
  }
}
