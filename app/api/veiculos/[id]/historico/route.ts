import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// ============================================================
// CONSTANTES DE SEGURANÇA / PERFORMANCE
// ============================================================
const MAX_ORDENS_HISTORICO = 200; // limita o histórico a 200 OS
const MAX_LOGS_AUDITORIA = 500; // limita o fallback de auditoria
const MAX_SEARCH_PECA = 100; // tamanho máximo do termo de busca

// ============================================================
// SERIALIZAÇÃO DE DECIMAIS
// ============================================================
function serializeDecimals(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(serializeDecimals);
  if (obj instanceof Date) return obj;
  if ('toNumber' in obj && typeof (obj as any).toNumber === 'function') {
    try {
      return (obj as any).toNumber();
    } catch {
      return obj;
    }
  }
  let keys: string[] = [];
  try {
    keys = Object.keys(obj);
  } catch {
    return obj;
  }
  const converted: Record<string, any> = {};
  for (const key of keys) {
    try {
      converted[key] = serializeDecimals((obj as any)[key]);
    } catch {
      converted[key] = (obj as any)[key];
    }
  }
  return converted;
}

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const historicoQuerySchema = z.object({
  q_peca: z.string().optional().transform((v) => v?.slice(0, MAX_SEARCH_PECA) || ''),
});

// ============================================================
// GET — Histórico completo do veículo
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar veículos
    if (!checkPermission(user, 'veiculos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = historicoQuerySchema.parse({
      q_peca: searchParams.get('q_peca') || undefined,
    });
    const searchPeca = parsed.q_peca || '';
    const searchPecaLower = searchPeca.toLowerCase();

    // ============================================================
    // 1. Veículo com Cliente
    // ============================================================
    const veiculo = await prisma.veiculo.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: {
        Cliente: true,
      },
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // ============================================================
    // 2. Ordens de Serviço (com limite de segurança)
    // ============================================================
    const ordensRaw = await prisma.ordemServico.findMany({
      where: {
        veiculo_id: id,
        empresa_id: user.empresa_id,
      },
      include: {
        ServicoOS: { select: { id: true, descricao: true, valor_total: true } },
        PecaAplicada: {
          include: {
            Peca: {
              select: {
                id: true,
                codigo: true,
                descricao: true,
                unidadeMedida: true,
                preco_custo: true,
                preco_venda: true,
              },
            },
          },
        },
        User: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { data_entrada: 'desc' },
      take: MAX_ORDENS_HISTORICO,
    });

    // ============================================================
    // 3. Preventivas do veículo
    // ============================================================
    const preventivas = await prisma.preventiva.findMany({
      where: {
        veiculo_id: id,
        empresa_id: user.empresa_id,
      },
      orderBy: { created_at: 'desc' },
    });

    const preventivasIds = new Set(preventivas.map((p) => p.id));

    // ============================================================
    // 4. Execuções de preventiva (com fallback inteligente)
    // ============================================================
    let execucoesPreventivas: any[] = [];
    try {
      execucoesPreventivas = await (prisma as any).preventivaExecucao.findMany({
        where: { veiculo_id: id, empresa_id: user.empresa_id },
        orderBy: { data_conclusao: 'desc' },
        take: MAX_LOGS_AUDITORIA,
      });
    } catch (err: any) {
      // ✅ Log do erro real (só aparece se a tabela existir mas falhar)
      log(
        'WARN',
        'VEICULOS_HISTORICO',
        'Falha ao consultar preventivaExecucao, usando fallback de auditoria',
        { error: err?.message },
        user.name
      );
    }

    // Fallback via auditLog — só quando NÃO há execuções
    if (execucoesPreventivas.length === 0 && preventivasIds.size > 0) {
      // ✅ Filtra por dados que contenham IDs das preventivas deste veículo
      // (evita carregar TODOS os logs da empresa)
      const preventivasIdsArray = Array.from(preventivasIds);
      const logs = await prisma.auditLog.findMany({
        where: {
          empresa_id: user.empresa_id,
          modulo: 'PREVENTIVA_EXECUCAO',
          // Filtra por entidade_id (os_id) OU por acao que contenha o preventiva_id
          // (o formato exato depende do createAuditLog de preventivas)
          OR: [
            { dados_depois: { contains: `"preventiva_id":"${preventivasIdsArray[0]}"` } },
            ...preventivasIdsArray.slice(1, 50).map((pid) => ({
              dados_depois: { contains: `"preventiva_id":"${pid}"` },
            })),
          ],
        },
        orderBy: { created_at: 'desc' },
        take: MAX_LOGS_AUDITORIA,
      });

      for (const l of logs) {
        try {
          const d = typeof l.dados_depois === 'string' ? JSON.parse(l.dados_depois) : l.dados_depois;
          const pid = d?.preventiva_id;
          if (!pid || !preventivasIds.has(pid)) continue;

          execucoesPreventivas.push({
            id: d?.execucao_id || l.id,
            preventiva_id: pid,
            servico: d?.nome_plano || preventivas.find((p) => p.id === pid)?.servico,
            os_id: l.entidade_id,
            os_numero: d?.os_numero,
            km_conclusao: d?.km_conclusao,
            horimetro_conclusao: d?.horimetro_conclusao,
            data_conclusao: d?.data_conclusao ? new Date(d.data_conclusao) : l.created_at,
            usuario_nome: l.usuario,
          });
        } catch {
          // ignora JSON malformado
        }
      }
    }

    // ============================================================
    // 5. Cálculo de KM médio por mês
    // ============================================================
    const ordensComKm = ordensRaw
      .filter((o) => (o.km_saida && o.km_saida > 0) || (o.km_retorno && o.km_retorno > 0))
      .map((o) => ({
        data: o.data_entrada ? new Date(o.data_entrada) : new Date(o.created_at),
        km: Math.max(o.km_saida || 0, o.km_retorno || 0),
      }));

    ordensComKm.sort((a, b) => a.data.getTime() - b.data.getTime());

    let kmMedioPorMes = 0;
    if (ordensComKm.length >= 2) {
      const first = ordensComKm[0];
      const last = ordensComKm[ordensComKm.length - 1];
      const diffKm = last.km - first.km;

      if (diffKm > 0) {
        const diffTime = Math.abs(last.data.getTime() - first.data.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = diffDays / 30.41;

        if (diffMonths >= 0.1) {
          kmMedioPorMes = Math.round(diffKm / diffMonths);
        }
      }
    }

    // ============================================================
    // 6. Peças trocadas (filtro em memória — dados já otimizados)
    // ============================================================
    const pecasTrocadas: any[] = [];
    let totalPecasTrocadasGeral = 0;

    ordensRaw.forEach((os) => {
      const aplicadas = os.PecaAplicada || [];
      aplicadas.forEach((p) => {
        totalPecasTrocadasGeral++;

        const descricaoPeca = p.Peca?.descricao || '';
        const matchesQuery = !searchPecaLower || descricaoPeca.toLowerCase().includes(searchPecaLower);

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
            mecanico: os.User?.name || 'Não atribuído',
          });
        }
      });
    });

    // ============================================================
    // 7. Timeline
    // ============================================================
    const timeline = ordensRaw.map((os) => ({
      id: os.id,
      numero: os.numero,
      status: os.status,
      data: os.data_entrada || os.created_at,
      valor_total: os.valor_total,
      diagnostico: os.diagnostico || 'Sem diagnóstico formal',
      servicos_count: (os.ServicoOS || []).length,
      pecas_count: (os.PecaAplicada || []).length,
      mecanico: os.User?.name || 'Não definido',
      comprovante: !!os.assinatura_cliente,
    }));

    // ============================================================
    // 8. Estatísticas agregadas
    // ============================================================
    const totalInvestido = ordensRaw.reduce(
      (acc, os) => acc + (os.valor_total ? Number(os.valor_total) : 0),
      0
    );

    const stats = {
      kmMedioPorMes,
      totalOS: ordensRaw.length,
      totalPecasTrocadas: totalPecasTrocadasGeral, // ✅ Sempre o total real
      totalPecasFiltradas: pecasTrocadas.length, // ✅ Quantas apareceram no filtro
      totalInvestido,
      preventivasAtivasCount: preventivas.length,
      preventivasVencidasCount: preventivas.filter((p) => p.status === 'VENCIDO').length,
    };

    // ============================================================
    // Retorno — serializa Decimal antes de enviar
    // ============================================================
    return NextResponse.json(
      serializeDecimals({
        veiculo,
        stats,
        timeline,
        pecasTrocadas,
        preventivas,
        execucoesPreventivas,
        historico_truncado: ordensRaw.length === MAX_ORDENS_HISTORICO,
      })
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'VEICULOS_HISTORICO', 'Erro ao processar linha do tempo de veículo');
  }
}
