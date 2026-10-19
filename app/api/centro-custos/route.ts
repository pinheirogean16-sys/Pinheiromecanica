import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { roundDecimal } from '@/lib/utils';
import { z } from 'zod';

// Cache em RAM para os agregados
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cacheRAM: Record<string, CacheEntry> = {};
const CACHE_DURATION_MS = 30000; // 30 segundos

// Schema de validação para filtros de data
const centroCustosQuerySchema = z.object({
  data_inicio: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de início inválida' }
  ),
  data_fim: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de fim inválida' }
  ),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // A25: dashboard/centro de custos é dado financeiro — exige permissão
    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresaId = user.empresa_id;

    // Valida filtros de data
    const { searchParams } = new URL(request.url);
    const parsed = centroCustosQuerySchema.parse({
      data_inicio: searchParams.get('data_inicio'),
      data_fim: searchParams.get('data_fim'),
    });
    const { data_inicio, data_fim } = parsed;

    // Chave do cache inclui filtros de data para evitar retornar dados errados
    const cacheKey = `centro_custos_${empresaId}_${data_inicio || 'all'}_${data_fim || 'all'}`;

    const now = Date.now();
    if (cacheRAM[cacheKey] && (now - cacheRAM[cacheKey].timestamp < CACHE_DURATION_MS)) {
      return NextResponse.json({ ...cacheRAM[cacheKey].data, cached: true });
    }

    const categoriasValidas = [
      'OFICINA', 'CAMPO', 'RESGATE', 'MOTOR', 'CAIXA', 'DIFERENCIAL', 'ELETRICA', 'INJECAO', 'BORRACHARIA'
    ];

    // Monta o where com filtros de data
    const where: any = {
      empresa_id: empresaId,
      status: { not: 'CANCELADA' },
    };

    if (data_inicio || data_fim) {
      where.data_entrada = {};
      if (data_inicio) {
        where.data_entrada.gte = new Date(data_inicio);
      }
      if (data_fim) {
        const fim = new Date(data_fim);
        fim.setUTCHours(23, 59, 59, 999);
        where.data_entrada.lte = fim;
      }
    }

    const ordens = await prisma.ordemServico.findMany({
      where,
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

      const faturamentoRaw = Number(os.valor_total || 0);
      const custoRaw = Number(os.custo_real || 0);
      const lucroRaw = Number(os.lucro_bruto || 0);
      const liquidoRaw = Number(os.total_liquido || 0);

      faturamentoGeral += faturamentoRaw;
      custoGeral += custoRaw;
      lucroGeral += lucroRaw;

      statsPorSetor[centro].totalOS += 1;
      statsPorSetor[centro].faturamentoBruto += faturamentoRaw;
      statsPorSetor[centro].custoTotal += custoRaw;
      statsPorSetor[centro].lucroTotal += lucroRaw;
      statsPorSetor[centro].faturamentoLiquido += liquidoRaw;

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

    const setoresArray = Object.values(statsPorSetor).map((s: any) => {
      s.faturamentoBruto = roundDecimal(s.faturamentoBruto);
      s.custoTotal = roundDecimal(s.custoTotal);
      s.lucroTotal = roundDecimal(s.lucroTotal);
      s.faturamentoLiquido = roundDecimal(s.faturamentoLiquido);
      s.margemMedia = s.faturamentoBruto > 0 ? roundDecimal((s.lucroTotal / s.faturamentoBruto) * 100) : 0;
      return s;
    });

    setoresArray.forEach((s: any) => {
      s.porcentagemRentabilidade = lucroGeral > 0 ? roundDecimal((s.lucroTotal / lucroGeral) * 100) : 0;
    });

    const rankingRentabilidade = [...setoresArray].sort((a, b) => b.lucroTotal - a.lucroTotal);

    const evolucaoArray = Object.entries(evolucaoMensal).map(([mesOff, val]) => {
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

    const totalLiquidoGeral = ordens.reduce((acc, current) => acc + Number(current.total_liquido || 0), 0);
    const totalImpostosGeral = faturamentoGeral * 0.06;

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

    cacheRAM[cacheKey] = {
      data: responseData,
      timestamp: Date.now()
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log('ERROR', 'FINANCEIRO_CC', 'Erro ao processar agregados do centro de custos', { error: error?.message }, 'sistema');
    return NextResponse.json({ error: 'Erro ao processar agregados' }, { status: 500 });
  }
}
