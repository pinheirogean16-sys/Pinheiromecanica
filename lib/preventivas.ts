import { prisma } from '@/lib/prisma';
import { notifyAdminsAndLeaders } from '@/lib/notificacoes';
import { log } from '@/lib/logger';
import { randomUUID } from 'crypto';

export type StatusPreventiva = 'VENCIDO' | 'PROXIMO' | 'SAUDAVEL' | 'DESATIVADO';

export interface AvaliacaoPreventivaResult {
  status: StatusPreventiva;
  km_atual: number;
  horimetro_atual: number;
  km_restante: number | null;
  horas_restantes: number | null;
  dias_restantes: number | null;
  isVencido: boolean;
  isProximo: boolean;
  motivo_vencimento?: string[];
}

export function avaliarStatusPreventiva(p: any, veiculo?: any): AvaliacaoPreventivaResult {
  const v = veiculo || p.Veiculo || p.veiculo;
  const kmAtual = Number(v?.quilometragem ?? p.km_atual ?? 0);
  const horimetroAtual = Number(v?.horimetro_atual ?? p.horimetro_atual ?? 0);

  if (p.ativo === false) {
    return {
      status: 'DESATIVADO',
      km_atual: kmAtual,
      horimetro_atual: horimetroAtual,
      km_restante: null,
      horas_restantes: null,
      dias_restantes: null,
      isVencido: false,
      isProximo: false
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let isKmVencido = false;
  let isKmProximo = false;
  let isHorasVencido = false;
  let isHorasProximo = false;
  let isDataVencida = false;
  let isDataProximo = false;

  let kmRestante: number | null = null;
  let horasRestantes: number | null = null;
  let diasRestantes: number | null = null;
  const motivos: string[] = [];

  // ✅ MELHORIA: Cálculo dinâmico caso o proximo_km não esteja salvo, mas o intervalo exista
  let kmLimite = p.proximo_km ?? p.km_limite;
  if (!kmLimite && p.ultimo_km && p.intervalo_km) {
    kmLimite = p.ultimo_km + p.intervalo_km;
  }

  const antecedenciaKm = p.antecedencia_km !== null && p.antecedencia_km !== undefined 
    ? Number(p.antecedencia_km) 
    : 1500;

  if (kmLimite !== null && kmLimite !== undefined && kmLimite > 0) {
    kmRestante = kmLimite - kmAtual;
    if (kmAtual >= kmLimite) {
      isKmVencido = true;
      motivos.push(`KM limite atingido (${kmAtual} >= ${kmLimite})`);
    } else if (kmRestante <= antecedenciaKm) {
      isKmProximo = true;
    }
  }

  // ✅ MELHORIA: Cálculo dinâmico para horímetro
  let proximoHorimetro = p.proximo_horimetro;
  if (!proximoHorimetro && p.ultimo_horimetro && p.intervalo_horas) {
    proximoHorimetro = p.ultimo_horimetro + p.intervalo_horas;
  }

  const antecedenciaHoras = p.antecedencia_horas !== null && p.antecedencia_horas !== undefined
    ? Number(p.antecedencia_horas)
    : 50;

  if (proximoHorimetro !== null && proximoHorimetro !== undefined && proximoHorimetro > 0) {
    horasRestantes = Number((proximoHorimetro - horimetroAtual).toFixed(1));
    if (horimetroAtual >= proximoHorimetro) {
      isHorasVencido = true;
      motivos.push(`Horímetro limite atingido (${horimetroAtual}h >= ${proximoHorimetro}h)`);
    } else if (horasRestantes <= antecedenciaHoras) {
      isHorasProximo = true;
    }
  }

  // ✅ MELHORIA: Cálculo dinâmico para data
  let dataAlvo = p.proxima_data || p.data_limite;
  if (!dataAlvo && p.ultima_data && p.intervalo_dias) {
    const d = new Date(p.ultima_data);
    d.setDate(d.getDate() + p.intervalo_dias);
    dataAlvo = d;
  }

  const antecedenciaDias = p.antecedencia_dias !== null && p.antecedencia_dias !== undefined
    ? Number(p.antecedencia_dias)
    : 15;

  if (dataAlvo) {
    const limite = new Date(dataAlvo);
    limite.setHours(0, 0, 0, 0);
    const diffTime = limite.getTime() - hoje.getTime();
    diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diasRestantes <= 0) {
      isDataVencida = true;
      motivos.push(`Data limite atingida (${limite.toLocaleDateString('pt-BR')})`);
    } else if (diasRestantes <= antecedenciaDias) {
      isDataProximo = true;
    }
  }

  const isVencido = isKmVencido || isHorasVencido || isDataVencida;
  const isProximo = !isVencido && (isKmProximo || isHorasProximo || isDataProximo);

  let status: StatusPreventiva = 'SAUDAVEL';
  if (isVencido) {
    status = 'VENCIDO';
  } else if (isProximo) {
    status = 'PROXIMO';
  }

  return {
    status,
    km_atual: kmAtual,
    horimetro_atual: horimetroAtual,
    km_restante: kmRestante,
    horas_restantes: horasRestantes,
    dias_restantes: diasRestantes,
    isVencido,
    isProximo,
    motivo_vencimento: motivos
  };
}

const notificationLocks = new Map<string, { timestamp: number; lockToken: string }>();

export async function notificarPreventivasPendentes(empresa_id: string) {
  if (!empresa_id || empresa_id === 'default') return;

  const now = Date.now();
  const lastLock = notificationLocks.get(empresa_id);

  if (lastLock && now - lastLock.timestamp < 15000) {
    return;
  }

  const currentLockToken = randomUUID();
  notificationLocks.set(empresa_id, { timestamp: now, lockToken: currentLockToken });

  try {
    const preventivas = await prisma.preventiva.findMany({
      where: {
        empresa_id,
        ativo: true
      },
      include: {
        Veiculo: {
          include: {
            Cliente: true
          }
        }
      }
    });

    const hojeYMD = new Date().toISOString().split('T')[0];

    for (const p of preventivas) {
      const avaliacao = avaliarStatusPreventiva(p);

      if (avaliacao.status === 'VENCIDO' || avaliacao.status === 'PROXIMO') {
        const cicloKm = p.proximo_km ?? '0';
        const cicloData = p.proxima_data ? new Date(p.proxima_data).toISOString().split('T')[0] : '0';
        const dedupTag = `[PREV:${p.id}:${avaliacao.status}:${cicloKm}:${cicloData}]`;
        const dedupKey = `PREV_${p.id}_${avaliacao.status}_${cicloKm}_${cicloData}_${hojeYMD}`;

        let lockAdquirido = false;
        try {
          const result = await (prisma as any).notificacaoDeduplicacao.createMany({
            data: [{
              id: randomUUID(),
              empresa_id,
              dedup_key: dedupKey
            }],
            skipDuplicates: true
          });
          lockAdquirido = result?.count === 1;
        } catch (err: any) {
          if (err.code === 'P2021' || (err.message && err.message.includes("doesn't exist"))) {
            log('WARN', 'PREVENTIVAS_NOTIF', 'Alertas preventivos suspensos: tabela NotificacaoDeduplicacao pendente de migration no banco de dados.');
            continue;
          }
          log('ERROR', 'PREVENTIVAS_NOTIF', 'Erro de banco ao verificar deduplicação de notificação', { error: err.message, empresa_id, dedupKey });
          continue;
        }

        if (!lockAdquirido) continue;

        const identificador = p.Veiculo?.placa 
          ? `${p.Veiculo.placa} (${p.Veiculo.modelo})` 
          : p.Veiculo?.modelo || 'Veículo/Máquina';

        const titulo = avaliacao.status === 'VENCIDO' 
          ? `⚠️ Manutenção Preventiva VENCIDA` 
          : `⏳ Manutenção Preventiva Próxima`;

        const detalhes: string[] = [];
        if (avaliacao.km_restante !== null) {
          detalhes.push(avaliacao.km_restante <= 0 ? `KM Excedido (${Math.abs(avaliacao.km_restante)} KM)` : `Resta ${avaliacao.km_restante} KM`);
        }
        if (avaliacao.horas_restantes !== null) {
          detalhes.push(avaliacao.horas_restantes <= 0 ? `Horas Excedidas (${Math.abs(avaliacao.horas_restantes)} h)` : `Restam ${avaliacao.horas_restantes} h`);
        }
        if (avaliacao.dias_restantes !== null) {
          detalhes.push(avaliacao.dias_restantes <= 0 ? `Vencido há ${Math.abs(avaliacao.dias_restantes)} dias` : `Vence em ${avaliacao.dias_restantes} dias`);
        }

        const mensagem = `O plano "${p.nome || p.servico || p.componente}" para ${identificador} necessita de atenção. ${detalhes.join(' | ')}. ${dedupTag}`;

        let envioSucesso = false;
        try {
          const enviados = await notifyAdminsAndLeaders(titulo, mensagem, `/preventivas`, empresa_id);
          if (enviados !== null && (!Array.isArray(enviados) || enviados.length > 0)) {
            envioSucesso = true;
          }
        } catch (dispatchErr: any) {
          log('ERROR', 'PREVENTIVAS_NOTIF', 'Falha ao despachar notificação para administradores', { error: dispatchErr?.message, empresa_id, dedupKey });
        }

        if (!envioSucesso && lockAdquirido) {
          try {
            await (prisma as any).notificacaoDeduplicacao.deleteMany({
              where: { empresa_id, dedup_key: dedupKey }
            });
          } catch {}
        }
      }
    }
  } catch (error) {
    log('ERROR', 'PREVENTIVAS_NOTIF', 'Erro ao verificar notificações de preventivas', {
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    const activeLock = notificationLocks.get(empresa_id);
    if (activeLock?.lockToken === currentLockToken) {
      notificationLocks.delete(empresa_id);
    }
  }
}

export interface SincronizarPreventivasResult {
  sucesso: boolean;
  executadas: string[];
  ignoradas: string[];
  concorrente?: boolean;
  erro?: string;
}

export async function sincronizarPreventivasAposOS(
  os: any,
  options?: {
    preventivasIds?: string[];
    usuario?: any;
    kmVeiculo?: number | null;
    horimetroVeiculo?: number | null;
    tx?: any;
    prismaClient?: any;
  }
): Promise<SincronizarPreventivasResult> {
  if (!os?.id || !os?.veiculo_id || !os?.empresa_id) {
    return { sucesso: false, executadas: [], ignoradas: [], erro: 'Dados de OS incompletos' };
  }

  if (os.status !== 'FINALIZADA') {
    return { sucesso: true, executadas: [], ignoradas: [] };
  }

  const preventivasSolicitadas: string[] = [];
  if (options?.preventivasIds && Array.isArray(options.preventivasIds)) {
    preventivasSolicitadas.push(...options.preventivasIds.filter(Boolean));
  }

  if (preventivasSolicitadas.length === 0) {
    return { sucesso: true, executadas: [], ignoradas: [] };
  }

  const hoje = new Date();

  if (options?.tx) {
    try {
      const tx = options.tx;
      const veiculo = await tx.veiculo.findFirst({ where: { id: os.veiculo_id, empresa_id: os.empresa_id } });

      const kmConclusao = options?.kmVeiculo ?? veiculo?.quilometragem ?? null;
      const horimetroConclusao = options?.horimetroVeiculo ?? veiculo?.horimetro_atual ?? null;

      const executadas: string[] = [];
      const ignoradas: string[] = [];
      let houveConcorrencia = false;

      for (const prevId of preventivasSolicitadas) {
        const plano = await tx.preventiva.findFirst({
          where: { id: prevId, empresa_id: os.empresa_id, veiculo_id: os.veiculo_id, ativo: true }
        });

        if (!plano) {
          log('WARN', 'PREVENTIVAS', `Plano ${prevId} rejeitado para conclusão na OS ${os.id}: não encontrado, inativo ou veículo incompatível.`);
          ignoradas.push(prevId);
          continue;
        }

        const execucaoExistente = await tx.preventivaExecucao.findUnique({
          where: { empresa_id_os_id_preventiva_id: { empresa_id: os.empresa_id, os_id: os.id, preventiva_id: plano.id } }
        });

        if (execucaoExistente) {
          log('INFO', 'PREVENTIVAS', `Plano ${plano.id} já foi concluído anteriormente pela OS ${os.id}. Duplo avanço evitado.`);
          ignoradas.push(prevId);
          continue;
        }

        const kmBase = kmConclusao ? Number(kmConclusao) : Number(veiculo?.quilometragem ?? plano.ultimo_km ?? 0);
        const horimetroBase = horimetroConclusao ? Number(horimetroConclusao) : Number(veiculo?.horimetro_atual ?? plano.ultimo_horimetro ?? 0);

        let novoProximoKm: number | null = plano.proximo_km;
        if (plano.intervalo_km && plano.intervalo_km > 0) {
          novoProximoKm = kmBase + plano.intervalo_km;
        }

        let novoProximoHorimetro: number | null = plano.proximo_horimetro;
        if (plano.intervalo_horas && plano.intervalo_horas > 0) {
          novoProximoHorimetro = Number((horimetroBase + plano.intervalo_horas).toFixed(1));
        }

        let novaProximaData: Date | null = plano.proxima_data;
        if (plano.intervalo_dias && plano.intervalo_dias > 0) {
          const d = new Date();
          d.setDate(d.getDate() + plano.intervalo_dias);
          novaProximaData = d;
        }

        try {
          await tx.preventivaExecucao.create({
            data: {
              id: randomUUID(),
              empresa_id: os.empresa_id,
              preventiva_id: plano.id,
              veiculo_id: os.veiculo_id,
              os_id: os.id,
              data_conclusao: hoje,
              km_conclusao: kmBase ? Math.round(Number(kmBase)) : null,
              horimetro_conclusao: horimetroBase ? Number(horimetroBase) : null,
              usuario_id: options?.usuario?.id || null,
              usuario_nome: options?.usuario?.name || options?.usuario?.email || 'Mecânico/Sistema',
              componente: plano.componente,
              servico: plano.servico || plano.nome,
              km_proximo_calculado: novoProximoKm,
              horimetro_proximo_calculado: novoProximoHorimetro,
              data_proxima_calculada: novaProximaData,
              observacoes: `Executado via OS #${os.numero || os.id}`
            }
          });

          await tx.preventiva.update({
            where: { id: plano.id },
            data: {
              ultima_data: hoje,
              ultimo_km: kmBase ? Math.round(Number(kmBase)) : plano.ultimo_km,
              ultimo_horimetro: horimetroBase ? Number(horimetroBase) : plano.ultimo_horimetro,
              proxima_data: novaProximaData,
              proximo_km: novoProximoKm,
              proximo_horimetro: novoProximoHorimetro,
              data_limite: novaProximaData,
              km_limite: novoProximoKm,
              status: 'SAUDAVEL',
              notificado: false,
              updated_at: hoje
            }
          });

          executadas.push(plano.id);
        } catch (innerErr: any) {
          const isP2002 = innerErr?.code === 'P2002' || (innerErr?.message && (innerErr.message.includes('empresa_os_prev_unique') || innerErr.message.includes('empresa_id_os_id_preventiva_id')));
          if (isP2002) {
            log('INFO', 'PREVENTIVAS', `Plano ${prevId} colidiu com P2002 em tx externa. Já registrado.`);
            ignoradas.push(prevId);
            houveConcorrencia = true;
            continue;
          }
          throw innerErr;
        }
      }

      return { sucesso: true, executadas, ignoradas, concorrente: houveConcorrencia };
    } catch (err: any) {
      const isTableMissing = err?.code === 'P2021' || (err?.message && err.message.includes("doesn't exist"));
      if (isTableMissing) {
        log('ERROR', 'PREVENTIVAS', 'A tabela PreventivaExecucao ainda não foi aplicada no banco de dados.', { error: err.message });
        return { sucesso: false, executadas: [], ignoradas: preventivasSolicitadas, erro: 'Tabela PreventivaExecucao pendente de migration no banco de dados.' };
      }
      log('ERROR', 'PREVENTIVAS', 'Falha transacional ao sincronizar preventivas após OS com tx externa', { error: err?.message });
      return { sucesso: false, executadas: [], ignoradas: preventivasSolicitadas, erro: err?.message || 'Erro transacional ao sincronizar preventivas' };
    }
  }

  const dbClient = options?.prismaClient || prisma;
  const veiculo = await dbClient.veiculo.findFirst({ where: { id: os.veiculo_id, empresa_id: os.empresa_id } });
  const kmConclusao = options?.kmVeiculo ?? veiculo?.quilometragem ?? null;
  const horimetroConclusao = options?.horimetroVeiculo ?? veiculo?.horimetro_atual ?? null;

  const executadas: string[] = [];
  const ignoradas: string[] = [];
  let concorrenciaDetectada = false;

  for (const prevId of preventivasSolicitadas) {
    try {
      let planoInvalido = false;
      let jaExecutado = false;

      await dbClient.$transaction(async (tx: any) => {
        const plano = await tx.preventiva.findFirst({
          where: { id: prevId, empresa_id: os.empresa_id, veiculo_id: os.veiculo_id, ativo: true }
        });

        if (!plano) {
          log('WARN', 'PREVENTIVAS', `Plano ${prevId} rejeitado para conclusão na OS ${os.id}: não encontrado, inativo ou veículo incompatível.`);
          planoInvalido = true;
          return;
        }

        const execucaoExistente = await tx.preventivaExecucao.findUnique({
          where: { empresa_id_os_id_preventiva_id: { empresa_id: os.empresa_id, os_id: os.id, preventiva_id: plano.id } }
        });

        if (execucaoExistente) {
          log('INFO', 'PREVENTIVAS', `Plano ${plano.id} já foi concluído anteriormente pela OS ${os.id}. Duplo avanço evitado.`);
          jaExecutado = true;
          return;
        }

        const kmBase = kmConclusao ? Number(kmConclusao) : Number(veiculo?.quilometragem ?? plano.ultimo_km ?? 0);
        const horimetroBase = horimetroConclusao ? Number(horimetroConclusao) : Number(veiculo?.horimetro_atual ?? plano.ultimo_horimetro ?? 0);

        let novoProximoKm: number | null = plano.proximo_km;
        if (plano.intervalo_km && plano.intervalo_km > 0) {
          novoProximoKm = kmBase + plano.intervalo_km;
        }

        let novoProximoHorimetro: number | null = plano.proximo_horimetro;
        if (plano.intervalo_horas && plano.intervalo_horas > 0) {
          novoProximoHorimetro = Number((horimetroBase + plano.intervalo_horas).toFixed(1));
        }

        let novaProximaData: Date | null = plano.proxima_data;
        if (plano.intervalo_dias && plano.intervalo_dias > 0) {
          const d = new Date();
          d.setDate(d.getDate() + plano.intervalo_dias);
          novaProximaData = d;
        }

        await tx.preventivaExecucao.create({
          data: {
            id: randomUUID(),
            empresa_id: os.empresa_id,
            preventiva_id: plano.id,
            veiculo_id: os.veiculo_id,
            os_id: os.id,
            data_conclusao: hoje,
            km_conclusao: kmBase ? Math.round(Number(kmBase)) : null,
            horimetro_conclusao: horimetroBase ? Number(horimetroBase) : null,
            usuario_id: options?.usuario?.id || null,
            usuario_nome: options?.usuario?.name || options?.usuario?.email || 'Mecânico/Sistema',
            componente: plano.componente,
            servico: plano.servico || plano.nome,
            km_proximo_calculado: novoProximoKm,
            horimetro_proximo_calculado: novoProximoHorimetro,
            data_proxima_calculada: novaProximaData,
            observacoes: `Executado via OS #${os.numero || os.id}`
          }
        });

        await tx.preventiva.update({
          where: { id: plano.id },
          data: {
            ultima_data: hoje,
            ultimo_km: kmBase ? Math.round(Number(kmBase)) : plano.ultimo_km,
            ultimo_horimetro: horimetroBase ? Number(horimetroBase) : plano.ultimo_horimetro,
            proxima_data: novaProximaData,
            proximo_km: novoProximoKm,
            proximo_horimetro: novoProximoHorimetro,
            data_limite: novaProximaData,
            km_limite: novoProximoKm,
            status: 'SAUDAVEL',
            notificado: false,
            updated_at: hoje
          }
        });
      });

      if (planoInvalido || jaExecutado) {
        ignoradas.push(prevId);
      } else {
        executadas.push(prevId);
      }
    } catch (err: any) {
      const isP2002 = err?.code === 'P2002' || (err?.message && (err.message.includes('empresa_os_prev_unique') || err.message.includes('empresa_id_os_id_preventiva_id')));
      if (isP2002) {
        log('INFO', 'PREVENTIVAS', `Concorrência detectada no plano ${prevId} (P2002): já registrado.`);
        ignoradas.push(prevId);
        concorrenciaDetectada = true;
        continue;
      }

      const isTableMissing = err?.code === 'P2021' || (err?.message && err.message.includes("doesn't exist"));
      if (isTableMissing) {
        log('ERROR', 'PREVENTIVAS', 'A tabela PreventivaExecucao ainda não foi aplicada no banco de dados.', { error: err.message });
        return { sucesso: false, executadas, ignoradas: [...ignoradas, prevId], erro: 'Tabela PreventivaExecucao pendente de migration no banco de dados.' };
      }

      log('ERROR', 'PREVENTIVAS', `Falha transacional ao sincronizar plano ${prevId} após OS`, { error: err?.message, osId: os.id });
      return { sucesso: false, executadas, ignoradas: [...ignoradas, prevId], erro: err?.message || 'Erro transacional ao sincronizar preventivas' };
    }
  }

  return { sucesso: true, executadas, ignoradas, concorrente: concorrenciaDetectada };
}

export interface ResultadoConsultaExecucoes {
  sucesso: boolean;
  dados: any[];
  indisponivel: boolean;
  motivo?: 'TABELA_INEXISTENTE' | 'ERRO_BANCO';
  erro?: string;
}

export async function obterHistoricoExecucoesPreventiva(
  preventivaId: string, 
  empresaId: string,
  prismaClient?: any
): Promise<ResultadoConsultaExecucoes> {
  try {
    const db = prismaClient || prisma;
    const dbExecs = await (db as any).preventivaExecucao.findMany({
      where: { preventiva_id: preventivaId, empresa_id: empresaId },
      orderBy: { data_conclusao: 'desc' }
    });

    return { sucesso: true, dados: dbExecs || [], indisponivel: false };
  } catch (e: any) {
    const isTableMissing = e?.code === 'P2021' || (e?.message && e.message.includes("doesn't exist"));
    if (isTableMissing) {
      log('WARN', 'PREVENTIVAS', 'Histórico indisponível: tabela PreventivaExecucao pendente de migration.');
      return { sucesso: false, dados: [], indisponivel: true, motivo: 'TABELA_INEXISTENTE', erro: 'Histórico indisponível: tabela PreventivaExecucao pendente de migration.' };
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao obter histórico de execuções de preventiva', { error: e?.message });
    return { sucesso: false, dados: [], indisponivel: true, motivo: 'ERRO_BANCO', erro: e?.message || 'Erro ao consultar histórico' };
  }
}

export async function obterExecucoesPreventivasDaOS(
  osId: string, 
  empresaId: string,
  prismaClient?: any
): Promise<ResultadoConsultaExecucoes> {
  try {
    const db = prismaClient || prisma;
    const execs = await (db as any).preventivaExecucao.findMany({
      where: { os_id: osId, empresa_id: empresaId },
      orderBy: { created_at: 'asc' }
    });
    return { sucesso: true, dados: execs || [], indisponivel: false };
  } catch (e: any) {
    const isTableMissing = e?.code === 'P2021' || (e?.message && e.message.includes("doesn't exist"));
    if (isTableMissing) {
      return { sucesso: false, dados: [], indisponivel: true, motivo: 'TABELA_INEXISTENTE', erro: 'Tabela PreventivaExecucao pendente de migration.' };
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao obter execuções de preventivas da OS', { osId, error: e?.message });
    return { sucesso: false, dados: [], indisponivel: true, motivo: 'ERRO_BANCO', erro: e?.message || 'Erro ao consultar execuções' };
  }
}
