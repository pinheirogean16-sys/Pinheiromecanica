import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar o dashboard
    if (!checkPermission(user, 'dashboard', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const osEmAndamento = await prisma.ordemServico.findMany({
      where: {
        empresa_id: user.empresa_id,
        status: {
          in: ['ABERTA', 'EM_DIAGNOSTICO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'AGUARDANDO_APROVACAO']
        }
      },
      select: {
        id: true,
        numero: true,
        diagnostico: true,
        data_entrada: true,
        // ✅ NOVO: busca apenas os campos necessários
        Cliente: { select: { nome: true } },
        Veiculo: { select: { modelo: true, ano: true } },
      },
      orderBy: { data_entrada: 'desc' },
      take: 10
    });

    const formatado = osEmAndamento.map(os => ({
      id: os.id,
      numero: os.numero,
      cliente: os.Cliente?.nome || 'Cliente não encontrado',
      veiculo: os.Veiculo ? `${os.Veiculo.modelo} - ${os.Veiculo.ano}` : 'Veículo não cadastrado',
      servico: os.diagnostico || 'Não informado',
      inicio: os.data_entrada
    }));

    return NextResponse.json(formatado);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar OS em andamento');
  }
}
