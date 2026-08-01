import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const searchPeca = searchParams.get('q_peca') || ''; // Para buscar rápido peças específicas trocadas

    // 1. Obter Veículo detalhado com Cliente
    const veiculo = await prisma.veiculo.findUnique({
      where: { id },
      include: {
        Cliente: true
      }
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // 2. Obter Todas as Ordens de Serviço completas
    const ordens = await prisma.ordemServico.findMany({
      where: {
        veiculo_id: id,
        empresa_id: user?.empresa_id || 'default'
      },
      include: {
        ServicoOS: true,
        PecaAplicada: {
          include: {
            Peca: true
          }
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        data_entrada: 'desc'
      }
    });

    // 3. Obter Preventivas Ativas
    const preventivas = await prisma.preventiva.findMany({
      where: {
        veiculo_id: id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // 4. Calcular o KM Médio Rodado por Mês de forma inteligente
    // Filtramos ordens que registram KM de saída ou retorno de forma válida
    const ordensComKm = ordens
      .filter((o) => (o.km_saida && o.km_saida > 0) || (o.km_retorno && o.km_retorno > 0))
      .map((o) => ({
        data: o.data_entrada ? new Date(o.data_entrada) : new Date(o.created_at),
        km: Math.max(o.km_saida || 0, o.km_retorno || 0)
      }));

    // Ordenar por data asc
    ordensComKm.sort((a, b) => a.data.getTime() - b.data.getTime());

    let kmMedioPorMes = 0;
    if (ordensComKm.length >= 2) {
      const first = ordensComKm[0];
      const last = ordensComKm[ordensComKm.length - 1];
      const diffKm = last.km - first.km;

      const diffTime = Math.abs(last.data.getTime() - first.data.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30.41; // Média real de dias no mês

      if (diffMonths >= 0.1 && diffKm > 0) {
        kmMedioPorMes = Math.round(diffKm / diffMonths);
      }
    }

    // 5. Compilar lista de Peças Trocadas Historicamente
    const pecasTrocadas: any[] = [];
    ordens.forEach(os => {
      const aplicadas = os.PecaAplicada || [];
      aplicadas.forEach(p => {
        const descricaoPeca = p.Peca?.descricao || '';
        const matchesQuery = !searchPeca || descricaoPeca.toLowerCase().includes(searchPeca.toLowerCase());
        
        if (matchesQuery) {
          pecasTrocadas.push({
            id: p.id,
            os_id: os.id,
            os_numero: os.numero,
            data: os.data_entrada || os.created_at,
            descricao: descricaoPeca,
            codigo: p.Peca?.codigo || 'S/C',
            quantidade: p.quantidade,
            unidade: p.unidade || 'un',
            valor_unit: p.valor_unit,
            valor_total: p.valor_total,
            mecanico: os.User?.name || 'Não atribuído'
          });
        }
      });
    });

    const timeline = ordens.map((os) => ({
      id: os.id,
      numero: os.numero,
      status: os.status,
      data: os.data_entrada || os.created_at,
      valor_total: os.valor_total,
      diagnostico: os.diagnostico || 'Sem diagnóstico formal',
      servicos_count: (os.ServicoOS || []).length,
      pecas_count: (os.PecaAplicada || []).length,
      mecanico: os.User?.name || 'Não definido',
      comprovante: os.assinatura_cliente ? true : false
    }));

    return NextResponse.json({
      veiculo,
      stats: {
        kmMedioPorMes,
        totalOS: ordens.length,
        totalPecasTrocadas: pecasTrocadas.length,
        totalInvestido: ordens.reduce((acc, os) => acc + (os.valor_total ? Number(os.valor_total) : 0), 0),
        preventivasAtivasCount: preventivas.length,
        preventivasVencidasCount: preventivas.filter(p => p.status === 'VENCIDO').length
      },
      timeline,
      pecasTrocadas,
      preventivas
    });
  } catch (error: any) {
    log('ERROR', 'VEICULOS_HISTORICO', 'Erro ao processar linha do tempo de veículo', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao processar linha do tempo de veículo' }, { status: 500 });
  }
}
