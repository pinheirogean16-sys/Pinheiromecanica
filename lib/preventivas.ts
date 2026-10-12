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

/**
 * Calcula o status de um plano preventivo com suporte a Data, Quilometragem (KM) e Horímetro.
 * Regra: Quando combina múltiplos critérios, vence pelo critério que atingir o limite PRIMEIRO.
 * Se o plano estiver inativo (ativo = false), o status retornado é estritamente 'DESATIVADO'.
 */
export function avaliarStatusPreventiva(p: any, veiculo?: any): AvaliacaoPreventivaResult {
  const v = veiculo || p.Veiculo || p.veiculo;
  const kmAtual = Number(v?.quilometragem ?? p.km_atual ?? 0);
  const horimetroAtual = Number(v?.horimetro_atual ?? p.horimetro_atual ?? 0);

  // 0. Planos desativados não são vencidos nem próximos
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

  // 1. Verificação por KM (se proximo_km ou km_limite configurado)
  const kmLimite = p.proximo_km ?? p.km_limite;
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

  // 2. Verificação por Horímetro (se proximo_horimetro configurado)
  const proximoHorimetro = p.proximo_horimetro;
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

  // 3. Verificação por Data (se proxima_data ou data_limite configurada)
  const dataAlvo = p.proxima_data || p.data_limite;
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

// Mutex in-memory por tenant com token exclusivo para evitar cancelamento de bloqueio ativo
const notificationLocks = new Map<string, { timestamp: number; lockToken: string }>();

/**
 * Notifica administradores e líderes sobre preventivas vencidas ou próximas.
 * Utiliza deduplicação persistente no banco (NotificacaoDeduplicacao) com restrição única
 * por (empresa_id, dedup_key), garantindo imunidade a concorrência entre múltiplas instâncias.
 * O novo ciclo produz nova dedup_key, liberando novos alertas legítimos.
 */
export async function notificarPreventivasPendentes(empresa_id: string) {
  if (!empresa_id || empresa_id === 'default') return;

  const now = Date.now();
  const lastLock = notificationLocks.get(empresa_id);

  // Se já existe processamento em andamento ou executado há menos de 15 segundos
  // RETORNA IMEDIATAMENTE - SEM EXECUTAR O FINALLY QUE LIMPARIA O LOCK DO PROCESSADOR ATUAL!
  if (lastLock && now - lastLock.timestamp < 15000) {
    return;
  }

  const currentLockToken = randomUUID();
  notificationLocks.set(empresa_id, { timestamp: now, lockToken: currentLockToken });

  try {
    const preventivas = await prisma.preventiva.findMany({
      where: {
        empresa_id,
        ativo: true // Planos inativos NUNCA geram notificação
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

        // 1. Tentar registrar a chave persistente com restrição de unicidade
        let lockAdquirido = false;
        try {
          await (prisma as any).notificacaoDeduplicacao.create({
            data: {
              id: randomUUID(),
              empresa_id,
              dedup_key: dedupKey
            }
          });
          lockAdquirido = true;
        } catch (err: any) {
          // Violação de constraint única (P2002 no Prisma ou ER_DUP_ENTRY no MySQL):
          // Outra requisição/instância já gerou a notificação deste ciclo hoje.
          if (err.code === 'P2002' || (err.message && (err.message.includes('unique') || err.message.includes('dedup_unique')))) {
            continue;
          }

          // Se a tabela física NotificacaoDeduplicacao ainda não foi migrada pelo DBA (P2021)
          if (err.code === 'P2021' || (err.message && err.message.includes("doesn't exist"))) {
            // REGRA DE INTEGRIDADE: Eliminar fallback que enviaria sem deduplicação persistente.
            // Sem a tabela de deduplicação física, não enviamos para evitar disparos concorrentes entre instâncias.
            log('WARN', 'PREVENTIVAS_NOTIF', 'Alertas preventivos suspensos: tabela NotificacaoDeduplicacao pendente de migration no banco de dados.');
            continue;
          }

          // Erro real de banco (conexão, timeout, etc.) -> registrar e não ignorar silenciosamente
          log('ERROR', 'PREVENTIVAS_NOTIF', 'Erro de banco ao verificar deduplicação de notificação', {
            error: err.message,
            empresa_id,
            dedupKey
          });
          continue;
        }

        if (!lockAdquirido) {
          continue;
        }

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
          const enviados = await notifyAdminsAndLeaders(
            titulo,
            mensagem,
            `/preventivas`,
            empresa_id
          );
          if (enviados !== null && (!Array.isArray(enviados) || enviados.length > 0)) {
            envioSucesso = true;
          }
        } catch (dispatchErr: any) {
          log('ERROR', 'PREVENTIVAS_NOTIF', 'Falha ao despachar notificação para administradores', {
            error: dispatchErr?.message,
            empresa_id,
            dedupKey
          });
        }

        // Se o envio falhou (retornou null, lista vazia ou lançou erro),
        // remove o registro de NotificacaoDeduplicacao para garantir que uma nova tentativa
        // seja executada no próximo ciclo e o alerta não seja perdido.
        if (!envioSucesso && lockAdquirido) {
          try {
            await (prisma as any).notificacaoDeduplicacao.deleteMany({
              where: {
                empresa_id,
                dedup_key: dedupKey
              }
            });
            log('INFO', 'PREVENTIVAS_NOTIF', 'Chave de deduplicação liberada para permitir nova tentativa de envio', {
              empresa_id,
              dedupKey
            });
          } catch {}
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar notificações de preventivas:', error);
  } finally {
    // SÓ remove o lock se ele ainda pertencer à chamada atual (token idêntico)
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

/**
 * Conclui explicitamente os planos preventivos selecionados quando uma Ordem de Serviço é FINALIZADA.
 * REQUISITOS OBRIGATÓRIOS DE INTEGRIDADE:
 * 1. OS deve estar estritamente no status FINALIZADA.
 * 2. Planos devem ser explicitamente vinculados (sem conclusão automática por substring).
 * 3. Validação de tenant (empresa_id) e vínculo com o veículo da OS.
 * 4. Proteção contra duplo avanço: se a OS já concluiu o plano, ignora com idempotência.
 * 5. Atomicidade: inserção de PreventivaExecucao e avanço de Preventiva ocorrem dentro
 *    da MESMA transação Prisma interativa tx.
 * 6. Tratamento de concorrência: violação P2002 na chave (empresa_id, os_id, preventiva_id)
 *    aborta a transação e impede duplo avanço.
 */
export async function sincronizarPreventivasAposOS(
  os: any,
  options?: {
    preventivasIds?: string[];
    usuario?: any;
    kmVeiculo?: number | null;
    horimetroVeiculo?: number | null;
    tx?: any; // Suporte a cliente transacional externo
    prismaClient?: any; // Suporte a cliente Prisma injetado (ex: testes de integração em banco isolado)
  }
): Promise<SincronizarPreventivasResult> {
  if (!os?.id || !os?.veiculo_id || !os?.empresa_id) {
    return { sucesso: false, executadas: [], ignoradas: [], erro: 'Dados de OS incompletos' };
  }

  // Se a OS NÃO for FINALIZADA, ela NUNCA conclui planos preventivos!
  if (os.status !== 'FINALIZADA') {
    return { sucesso: true, executadas: [], ignoradas: [] };
  }

  // Identificar IDs de preventivas explicitamente indicadas
  const preventivasSolicitadas: string[] = [];
  if (options?.preventivasIds && Array.isArray(options.preventivasIds)) {
    preventivasSolicitadas.push(...options.preventivasIds.filter(Boolean));
  }

  // Sem preventivas explicitamente selecionadas, não há nada a concluir
  if (preventivasSolicitadas.length === 0) {
    return { sucesso: true, executadas: [], ignoradas: [] };
  }

  const hoje = new Date();

  // Se o chamador já forneceu um tx externo (ex: transação atômica da finalização de OS)
  if (options?.tx) {
    try {
      const tx = options.tx;
      const veiculo = await tx.veiculo.findFirst({
        where: {
          id: os.veiculo_id,
          empresa_id: os.empresa_id
        }
      });

      const kmConclusao = options?.kmVeiculo ?? veiculo?.quilometragem ?? null;
      const horimetroConclusao = options?.horimetroVeiculo ?? veiculo?.horimetro_atual ?? null;

      const executadas: string[] = [];
      const ignoradas: string[] = [];
      let houveConcorrencia = false;

      for (const prevId of preventivasSolicitadas) {
        // 1. Validar plano
        const plano = await tx.preventiva.findFirst({
          where: {
            id: prevId,
            empresa_id: os.empresa_id,
            veiculo_id: os.veiculo_id,
            ativo: true
          }
        });

        if (!plano) {
          log('WARN', 'PREVENTIVAS', `Plano ${prevId} rejeitado para conclusão na OS ${os.id}: não encontrado, inativo ou veículo incompatível.`);
          ignoradas.push(prevId);
          continue;
        }

        // 2. Proteção contra duplo avanço
        const execucaoExistente = await tx.preventivaExecucao.findUnique({
          where: {
            empresa_id_os_id_preventiva_id: {
              empresa_id: os.empresa_id,
              os_id: os.id,
              preventiva_id: plano.id
            }
          }
        });

        if (execucaoExistente) {
          log('INFO', 'PREVENTIVAS', `Plano ${plano.id} já foi concluído anteriormente pela OS ${os.id}. Duplo avanço evitado.`);
          ignoradas.push(prevId);
          continue;
        }

        // 3. Projeção de ciclos
        const kmBase = kmConclusao ? Number(kmConclusao) : Number(plano.ultimo_km ?? veiculo?.quilometragem ?? 0);
        const horimetroBase = horimetroConclusao ? Number(horimetroConclusao) : Number(plano.ultimo_horimetro ?? veiculo?.horimetro_atual ?? 0);

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
          // 4. Inserir PreventivaExecucao (atômico com tx)
          await tx.preventivaExecucao.create({
            data: {
              id: randomUUID(),
              empresa_id: os.empresa_id,
              preventiva_id: plano.id,
              veiculo_id: os.veiculo_id,
              os_id: os.id,
              data_conclusao: hoje,
              km_conclusao: kmConclusao ? Math.round(Number(kmConclusao)) : null,
              horimetro_conclusao: horimetroConclusao ? Number(horimetroConclusao) : null,
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

          // 5. Atualizar Preventiva (atômico com tx)
          await tx.preventiva.update({
            where: { id: plano.id },
            data: {
              ultima_data: hoje,
              ultimo_km: kmConclusao ? Math.round(Number(kmConclusao)) : plano.ultimo_km,
              ultimo_horimetro: horimetroConclusao ? Number(horimetroConclusao) : plano.ultimo_horimetro,
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
        return {
          sucesso: false,
          executadas: [],
          ignoradas: preventivasSolicitadas,
          erro: 'Tabela PreventivaExecucao pendente de migration no banco de dados.'
        };
      }
      log('ERROR', 'PREVENTIVAS', 'Falha transacional ao sincronizar preventivas após OS com tx externa', { error: err?.message });
      return {
        sucesso: false,
        executadas: [],
        ignoradas: preventivasSolicitadas,
        erro: err?.message || 'Erro transacional ao sincronizar preventivas'
      };
    }
  }

  // Execução isolada (sem tx externa):
  // Cada preventiva é processada de forma atômica individual para que a colisão de concorrência
  // em um plano específico (P2002) NÃO aborte nem marque falsamente os outros planos como finalizados.
  const dbClient = options?.prismaClient || prisma;
  const veiculo = await dbClient.veiculo.findFirst({
    where: {
      id: os.veiculo_id,
      empresa_id: os.empresa_id
    }
  });

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
        // 1. Validar plano dentro de tx
        const plano = await tx.preventiva.findFirst({
          where: {
            id: prevId,
            empresa_id: os.empresa_id,
            veiculo_id: os.veiculo_id,
            ativo: true
          }
        });

        if (!plano) {
          log('WARN', 'PREVENTIVAS', `Plano ${prevId} rejeitado para conclusão na OS ${os.id}: não encontrado, inativo ou veículo incompatível.`);
          planoInvalido = true;
          return;
        }

        // 2. Proteção contra duplo avanço
        const execucaoExistente = await tx.preventivaExecucao.findUnique({
          where: {
            empresa_id_os_id_preventiva_id: {
              empresa_id: os.empresa_id,
              os_id: os.id,
              preventiva_id: plano.id
            }
          }
        });

        if (execucaoExistente) {
          log('INFO', 'PREVENTIVAS', `Plano ${plano.id} já foi concluído anteriormente pela OS ${os.id}. Duplo avanço evitado.`);
          jaExecutado = true;
          return;
        }

        // 3. Projeção de ciclos
        const kmBase = kmConclusao ? Number(kmConclusao) : Number(plano.ultimo_km ?? veiculo?.quilometragem ?? 0);
        const horimetroBase = horimetroConclusao ? Number(horimetroConclusao) : Number(plano.ultimo_horimetro ?? veiculo?.horimetro_atual ?? 0);

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

        // 4. Inserir PreventivaExecucao (atômico)
        await tx.preventivaExecucao.create({
          data: {
            id: randomUUID(),
            empresa_id: os.empresa_id,
            preventiva_id: plano.id,
            veiculo_id: os.veiculo_id,
            os_id: os.id,
            data_conclusao: hoje,
            km_conclusao: kmConclusao ? Math.round(Number(kmConclusao)) : null,
            horimetro_conclusao: horimetroConclusao ? Number(horimetroConclusao) : null,
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

        // 5. Atualizar Preventiva (atômico)
        await tx.preventiva.update({
          where: { id: plano.id },
          data: {
            ultima_data: hoje,
            ultimo_km: kmConclusao ? Math.round(Number(kmConclusao)) : plano.ultimo_km,
            ultimo_horimetro: horimetroConclusao ? Number(horimetroConclusao) : plano.ultimo_horimetro,
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
        // Concorrência atômica: outra requisição concluiu este plano específico.
        // Consideramos este plano concluído (sem duplo avanço) e CONTINUAMOS o processamento das demais!
        log('INFO', 'PREVENTIVAS', `Concorrência detectada no plano ${prevId} (P2002): já registrado por requisição paralela. O plano não foi duplicado.`);
        ignoradas.push(prevId);
        concorrenciaDetectada = true;
        continue;
      }

      const isTableMissing = err?.code === 'P2021' || (err?.message && err.message.includes("doesn't exist"));
      if (isTableMissing) {
        log('ERROR', 'PREVENTIVAS', 'A tabela PreventivaExecucao ainda não foi aplicada no banco de dados. A integridade de preventivas requer a aplicação da migration 20261011120000_add_preventiva_execucao_historico.', {
          error: err.message
        });
        return {
          sucesso: false,
          executadas,
          ignoradas: [...ignoradas, prevId],
          erro: 'Tabela PreventivaExecucao pendente de migration no banco de dados.'
        };
      }

      log('ERROR', 'PREVENTIVAS', `Falha transacional ao sincronizar plano ${prevId} após OS`, {
        error: err?.message,
        osId: os.id
      });
      return {
        sucesso: false,
        executadas,
        ignoradas: [...ignoradas, prevId],
        erro: err?.message || 'Erro transacional ao sincronizar preventivas'
      };
    }
  }

  return {
    sucesso: true,
    executadas,
    ignoradas,
    concorrente: concorrenciaDetectada
  };
}

export interface ResultadoConsultaExecucoes {
  sucesso: boolean;
  dados: any[];
  indisponivel: boolean;
  motivo?: 'TABELA_INEXISTENTE' | 'ERRO_BANCO';
  erro?: string;
}

/**
 * Recupera o histórico completo de execuções de um plano preventivo específico
 * Busca diretamente da tabela relacional PreventivaExecucao (sem simulações em logs).
 * Diferencia histórico vazio legítimo de indisponibilidade por ausência da tabela ou erro de banco.
 */
export async function obterHistoricoExecucoesPreventiva(
  preventivaId: string, 
  empresaId: string,
  prismaClient?: any
): Promise<ResultadoConsultaExecucoes> {
  try {
    const db = prismaClient || prisma;
    const dbExecs = await (db as any).preventivaExecucao.findMany({
      where: {
        preventiva_id: preventivaId,
        empresa_id: empresaId
      },
      orderBy: {
        data_conclusao: 'desc'
      }
    });

    return {
      sucesso: true,
      dados: dbExecs || [],
      indisponivel: false
    };
  } catch (e: any) {
    const isTableMissing = e?.code === 'P2021' || (e?.message && e.message.includes("doesn't exist"));
    if (isTableMissing) {
      log('WARN', 'PREVENTIVAS', 'Histórico de execuções indisponível: tabela PreventivaExecucao pendente de migration.');
      return {
        sucesso: false,
        dados: [],
        indisponivel: true,
        motivo: 'TABELA_INEXISTENTE',
        erro: 'Histórico indisponível: tabela PreventivaExecucao pendente de migration no banco de dados.'
      };
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao obter histórico de execuções de preventiva', { error: e?.message });
    return {
      sucesso: false,
      dados: [],
      indisponivel: true,
      motivo: 'ERRO_BANCO',
      erro: e?.message || 'Erro ao consultar histórico de execuções'
    };
  }
}

/**
 * Recupera as execuções de preventivas vinculadas a uma Ordem de Serviço específica
 * Diferencia lista vazia legítima de indisponibilidade por ausência da tabela ou falha de banco.
 */
export async function obterExecucoesPreventivasDaOS(
  osId: string, 
  empresaId: string,
  prismaClient?: any
): Promise<ResultadoConsultaExecucoes> {
  try {
    const db = prismaClient || prisma;
    const execs = await (db as any).preventivaExecucao.findMany({
      where: {
        os_id: osId,
        empresa_id: empresaId
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    return {
      sucesso: true,
      dados: execs || [],
      indisponivel: false
    };
  } catch (e: any) {
    const isTableMissing = e?.code === 'P2021' || (e?.message && e.message.includes("doesn't exist"));
    if (isTableMissing) {
      return {
        sucesso: false,
        dados: [],
        indisponivel: true,
        motivo: 'TABELA_INEXISTENTE',
        erro: 'Tabela PreventivaExecucao pendente de migration no banco de dados.'
      };
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao obter execuções de preventivas da OS', { osId, error: e?.message });
    return {
      sucesso: false,
      dados: [],
      indisponivel: true,
      motivo: 'ERRO_BANCO',
      erro: e?.message || 'Erro ao consultar execuções de preventivas da OS'
    };
  }
}
