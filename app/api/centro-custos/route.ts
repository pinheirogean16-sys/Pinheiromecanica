import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { roundDecimal } from '@/lib/utils';

// Cache em RAM para os agregados
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cacheRAM: Record<string, CacheEntry> = {};
const CACHE_DURATION_MS = 30000; // 30 segundos cache RAM

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresaId = user?.empresa_id || 'default';
    const cacheKey = `centro_custos_${empresaId}`;

    // SWR / Cache RAM check
    const now = Date.now();
    if (cacheRAM[cacheKey] && (now - cacheRAM[cacheKey].timestamp < CACHE_DURATION_MS)) {
      return NextResponse.json({ ...cacheRAM[cacheKey].data, cached: true });
    }

    // Centros de custo predefinidos
    const categoriasValidas = [
      'OFICINA', 'CAMPO', 'RESGATE', 'MOTOR', 'CAIXA', 'DIFERENCIAL', 'ELETRICA', 'INJECAO', 'BORRACHARIA'
    ];

    // Buscar todas as OS válidas (exceto as canceladas)
    const ordens = await prisma.ordemServico.findMany({
      where: {
        empresa_id: empresaId,
        status: { not: 'CANCELADA' }
      },
      select: {
        id: true,
        numero: true,
        centro_custo: true,
        valor_total: true,
        custo_real: true,
        lucro_bruto: true,
        total_liquido: true,
        data_entrada: true
      }
    });

    // Inicializar mapa de categorias
    const statsPorSetor: Record<string, any> = {};
    for (const cat of categoriasValidas) {
      statsPorSetor[cat] = {
        setor: cat,
        totalOS: 0,
        faturamentoBruto: 0,
        custoTotal: 0,
        lucroTotal: 0,
        faturamentoLiquido: 0,
        margemMedia: 0,
        porcentagemRentabilidade: 0
      };
    }

    let faturamentoGeral = 0;
    let custoGeral = 0;
    let lucroGeral = 0;

    const evolucaoMensal: Record<string, { faturamento: number; custo: number; lucro: number; totalOS: number }> = {};

    for (const os of ordens) {
      const centroRaw = (os.centro_custo || 'OFICINA').toUpperCase();
      const centro = categoriasValidas.includes(centroRaw) ? centroRaw : 'OFICINA';

      const faturamentoRaw = os.valor_total || 0;
      const custoRaw = os.custo_real || 0;
      const lucroRaw = os.lucro_bruto || 0;
      const liquidoRaw = os.total_liquido || 0;

      // Acumuladores gerais
      faturamentoGeral += faturamentoRaw;
      custoGeral += custoRaw;
      lucroGeral += lucroRaw;

      // Acumulador por setor
      statsPorSetor[centro].totalOS += 1;
      statsPorSetor[centro].faturamentoBruto += faturamentoRaw;
      statsPorSetor[centro].custoTotal += custoRaw;
      statsPorSetor[centro].lucroTotal += lucroRaw;
      statsPorSetor[centro].faturamentoLiquido += liquidoRaw;

      // Agrupamento mensal
      const dt = os.data_entrada ? new Date(os.data_entrada) : new Date();
      const mesChave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!evolucaoMensal[mesChave]) {
        evolucaoMensal[mesChave] = { faturamento: 0, custo: 0, lucro: 0, totalOS: 0 };
      }
      evolucaoMensal[mesChave].faturamento += faturamentoRaw;
      evolucaoMensal[mesChave].custo += custoRaw;
      evolucaoMensal[mesChave].lucro += lucroRaw;
      evolucaoMensal[mesChave].totalOS += 1;
    }

    // Formatar e calcular valores derivados
    const setoresArray = Object.values(statsPorSetor).map((s: any) => {
      s.faturamentoBruto = roundDecimal(s.faturamentoBruto);
      s.custoTotal = roundDecimal(s.custoTotal);
      s.lucroTotal = roundDecimal(s.lucroTotal);
      s.faturamentoLiquido = roundDecimal(s.faturamentoLiquido);
      s.margemMedia = s.faturamentoBruto > 0 ? roundDecimal((s.lucroTotal / s.faturamentoBruto) * 100) : 0;
      return s;
    });

    // Calcular share de mercado interno / share de lucro
    setoresArray.forEach((s: any) => {
      s.porcentagemRentabilidade = lucroGeral > 0 ? roundDecimal((s.lucroTotal / lucroGeral) * 100) : 0;
    });

    // Ordenar ranking de lucro por setor desc
    const rankingRentabilidade = [...setoresArray].sort((a, b) => b.lucroTotal - a.lucroTotal);

    // Formatar evolução mensal em array ordenado
    const evolucaoArray = Object.entries(evolucaoMensal).map(([mesOff, val]) => {
      // Converte YYYY-MM para MM/YYYY
      const parts = mesOff.split('-');
      const label = `${parts[1]}/${parts[0]}`;
      return {
        mes: mesOff,
        label,
        faturamento: roundDecimal(val.faturamento),
        custo: roundDecimal(val.custo),
        lucro: roundDecimal(val.lucro),
        totalOS: val.totalOS
      };
    }).sort((a, b) => a.mes.localeCompare(b.mes));

    const totalLiquidoGeral = ordens.reduce((acc, current) => acc + (current.total_liquido || 0), 0);
    const totalImpostosGeral = faturamentoGeral * 0.06; // 6% simulado

    const responseData = {
      geral: {
        faturamentoBruto: roundDecimal(faturamentoGeral),
        custoOperacionalTotal: roundDecimal(custoGeral),
        lucroBrutoTotal: roundDecimal(lucroGeral),
        impostosSimulados: roundDecimal(totalImpostosGeral),
        faturamentoLiquido: roundDecimal(totalLiquidoGeral),
        margemGeral: faturamentoGeral > 0 ? roundDecimal((lucroGeral / faturamentoGeral) * 100) : 0
      },
      setores: rankingRentabilidade,
      evolucaoMensal: evolucaoArray
    };

    // Atualiza cache RAM
    cacheRAM[cacheKey] = {
      data: responseData,
      timestamp: Date.now()
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    log('ERROR', 'FINANCEIRO_CC', 'Erro ao processar agregados do centro de custos', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao processar agregados' }, { status: 500 });
  }
}
