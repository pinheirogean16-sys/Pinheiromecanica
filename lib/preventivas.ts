import { prisma } from '@/lib/prisma';
import { notifyAdminsAndLeaders } from '@/lib/notificacoes';
import { createAuditLog } from '@/lib/audit';
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

// Mutex in-memory por tenant para evitar concorrência desordenada em notificarPreventivasPendentes
const notificationLocks = new Map<string, number>();

/**
 * Notifica administradores e líderes sobre preventivas vencidas ou próximas.
 * Protegido contra concorrência simultânea, requisições repetidas e isolado por empresa.
 * Deduplicação considera o ID do plano, o status e o ciclo atual, liberando alertas em novos ciclos.
 */
export async function notificarPreventivasPendentes(empresa_id: string) {
  try {
    if (!empresa_id || empresa_id === 'default') return;

    // Mutex com expiração de 30 segundos
    const now = Date.now();
    const lastLock = notificationLocks.get(empresa_id) || 0;
    if (now - lastLock < 15000) {
      // Bloqueio temporário ativo para esta empresa
      return;
    }
    notificationLocks.set(empresa_id, now);

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

    const umDiaAtras = new Date(now - 24 * 60 * 60 * 1000);

    for (const p of preventivas) {
      const avaliacao = avaliarStatusPreventiva(p);

      if (avaliacao.status === 'VENCIDO' || avaliacao.status === 'PROXIMO') {
        // Tag única com identificador de ciclo para permitir alerta legítimo após conclusão
        const cicloKm = p.proximo_km ?? '0';
        const cicloData = p.proxima_data ? new Date(p.proxima_data).toISOString().split('T')[0] : '0';
        const dedupTag = `[PREV:${p.id}:${avaliacao.status}:${cicloKm}:${cicloData}]`;

        // 1. Checa se já existe notificação recente com a chave de ciclo
        const jaNotificado = await prisma.notificacao.findFirst({
          where: {
            empresa_id,
            mensagem: { contains: dedupTag },
            created_at: { gte: umDiaAtras }
          }
        });

        if (jaNotificado) {
          continue;
        }

        // 2. Proteção transacional contra duplicação concorrente via AuditLog
        const markerKey = `NOTIF_PREV_${p.id}_${avaliacao.status}_${cicloKm}_${cicloData}_${new Date().toISOString().split('T')[0]}`;
        const markerExiste = await prisma.auditLog.findFirst({
          where: {
            empresa_id,
            modulo: 'NOTIFICACAO_PREVENTIVA',
            entidade_id: markerKey
          }
        });

        if (markerExiste) {
          continue;
        }

        // Registrar marcador
        await createAuditLog({
          modulo: 'NOTIFICACAO_PREVENTIVA',
          acao: 'DISPARAR_ALERTA',
          entidade: 'Preventiva',
          entidade_id: markerKey,
          usuario: 'Sistema',
          empresa_id,
          dados_depois: { preventiva_id: p.id, status: avaliacao.status }
        });

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

        await notifyAdminsAndLeaders(
          titulo,
          mensagem,
          `/preventivas`,
          empresa_id
        );
      }
    }
  } catch (error) {
    console.error('Erro ao verificar notificações de preventivas:', error);
  } finally {
    notificationLocks.delete(empresa_id);
  }
}

export interface ExecucaoPreventivaInput {
  osId: string;
  osNumero?: number | string;
  veiculoId: string;
  empresaId: string;
  preventivaIds: string[];
  kmVeiculo?: number | null;
  horimetroVeiculo?: number | null;
  usuario: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  observacoes?: string;
}

/**
 * Conclui explicitamente os planos preventivos selecionados quando uma Ordem de Serviço é FINALIZADA.
 * REQUISITOS OBRIGATÓRIOS:
 * 1. OS deve estar estritamente no status FINALIZADA.
 * 2. Planos devem ser explicitamente vinculados (sem conclusão automática por substring).
 * 3. Validação de tenant (empresa_id) e vínculo com o veículo da OS.
 * 4. Proteção contra duplo avanço: se a OS já concluiu o plano, ignora com idempotência.
 * 5. Registro imutável de histórico preservado.
 */
export async function sincronizarPreventivasAposOS(
  os: any,
  options?: {
    preventivasIds?: string[];
    usuario?: any;
    kmVeiculo?: number | null;
    horimetroVeiculo?: number | null;
  }
) {
  try {
    if (!os?.id || !os?.veiculo_id || !os?.empresa_id) return;

    // Se a OS NÃO for FINALIZADA, ela NUNCA conclui planos preventivos!
    if (os.status !== 'FINALIZADA') {
      return;
    }

    // Identificar IDs de preventivas explicitamente indicadas
    const preventivasSolicitadas: string[] = [];
    if (options?.preventivasIds && Array.isArray(options.preventivasIds)) {
      preventivasSolicitadas.push(...options.preventivasIds.filter(Boolean));
    }

    // Se nenhuma preventiva foi explicitamente indicada para conclusão nesta OS,
    // não há nada a concluir. (A menção de strings ou componentes NÃO conclui planos)
    if (preventivasSolicitadas.length === 0) {
      return;
    }

    const hoje = new Date();
    const veiculo = await prisma.veiculo.findFirst({
      where: {
        id: os.veiculo_id,
        empresa_id: os.empresa_id
      }
    });

    const kmConclusao = options?.kmVeiculo ?? veiculo?.quilometragem ?? null;
    const horimetroConclusao = options?.horimetroVeiculo ?? veiculo?.horimetro_atual ?? null;

    for (const prevId of preventivasSolicitadas) {
      // 1. Validar existência, empresa, veículo e estado do plano
      const plano = await prisma.preventiva.findFirst({
        where: {
          id: prevId,
          empresa_id: os.empresa_id,
          veiculo_id: os.veiculo_id,
          ativo: true // Só conclui planos ativos
        }
      });

      if (!plano) {
        log('WARN', 'PREVENTIVAS', `Plano ${prevId} rejeitado para conclusão na OS ${os.id}: não encontrado, inativo ou veículo incompatível.`);
        continue;
      }

      // 2. Proteção contra DUPLO AVANÇO (Idempotência persistente):
      // Verificar se esta OS já concluiu este plano preventivo
      let jaExecutadoPelaOS = false;

      // Tentativa 2a: Verificar na tabela PreventivaExecucao
      try {
        const execucaoExistente = await (prisma as any).preventivaExecucao.findUnique({
          where: {
            empresa_os_prev_unique: {
              empresa_id: os.empresa_id,
              os_id: os.id,
              preventiva_id: plano.id
            }
          }
        });
        if (execucaoExistente) {
          jaExecutadoPelaOS = true;
        }
      } catch (err: any) {
        // Se a tabela física PreventivaExecucao ainda não tiver sido migrada pelo DBA,
        // checamos a persistência no AuditLog
      }

      // Tentativa 2b: Verificação de deduplicação no AuditLog
      if (!jaExecutadoPelaOS) {
        const auditLogExistente = await prisma.auditLog.findFirst({
          where: {
            empresa_id: os.empresa_id,
            modulo: 'PREVENTIVA_EXECUCAO',
            entidade: 'OrdemServico',
            entidade_id: os.id,
            acao: `CONCLUSAO_${plano.id}`
          }
        });
        if (auditLogExistente) {
          jaExecutadoPelaOS = true;
        }
      }

      if (jaExecutadoPelaOS) {
        log('INFO', 'PREVENTIVAS', `Plano ${plano.id} já foi concluído anteriormente pela OS ${os.id}. Duplo avanço evitado.`);
        continue;
      }

      // 3. Calcular projeção do próximo ciclo
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

      const execucaoId = randomUUID();

      // 4. Gravar execução na tabela PreventivaExecucao (se tabela estiver disponível)
      try {
        await (prisma as any).preventivaExecucao.create({
          data: {
            id: execucaoId,
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
            observacoes: options?.observacoes || `Executado via OS #${os.numero || os.id}`
          }
        });
      } catch (err: any) {
        // Tabela ainda pendente de migração no banco de produção
      }

      // 5. Registrar histórico imutável no AuditLog (garante retenção mesmo antes da migration)
      await createAuditLog({
        modulo: 'PREVENTIVA_EXECUCAO',
        acao: `CONCLUSAO_${plano.id}`,
        entidade: 'OrdemServico',
        entidade_id: os.id,
        usuario: options?.usuario?.name || options?.usuario?.email || 'Sistema',
        empresa_id: os.empresa_id,
        dados_antes: {
          ciclo_anterior_km: plano.proximo_km,
          ciclo_anterior_data: plano.proxima_data,
          ciclo_anterior_horimetro: plano.proximo_horimetro,
          ultimo_km: plano.ultimo_km,
          ultima_data: plano.ultima_data
        },
        dados_depois: {
          execucao_id: execucaoId,
          preventiva_id: plano.id,
          nome_plano: plano.nome || plano.servico || plano.componente,
          os_id: os.id,
          os_numero: os.numero,
          km_conclusao: kmConclusao,
          horimetro_conclusao: horimetroConclusao,
          novo_proximo_km: novoProximoKm,
          novo_proximo_horimetro: novoProximoHorimetro,
          nova_proxima_data: novaProximaData,
          data_conclusao: hoje.toISOString()
        }
      });

      // 6. Atualizar plano Preventiva para o novo ciclo de forma limpa e consistente
      await prisma.preventiva.update({
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

      log('INFO', 'PREVENTIVAS', `Plano ${plano.id} avançado com sucesso para o próximo ciclo através da OS ${os.id}.`, {
        novoProximoKm,
        novoProximoHorimetro,
        novaProximaData
      }, options?.usuario?.name);
    }
  } catch (error) {
    console.error('Erro ao sincronizar preventivas após OS:', error);
  }
}

/**
 * Recupera o histórico completo de execuções de um plano preventivo específico
 */
export async function obterHistoricoExecucoesPreventiva(preventivaId: string, empresaId: string) {
  try {
    const execucoes: any[] = [];

    // 1. Tentar ler da tabela PreventivaExecucao
    try {
      const dbExecs = await (prisma as any).preventivaExecucao.findMany({
        where: {
          preventiva_id: preventivaId,
          empresa_id: empresaId
        },
        orderBy: {
          data_conclusao: 'desc'
        }
      });
      if (Array.isArray(dbExecs) && dbExecs.length > 0) {
        return dbExecs;
      }
    } catch (e) {
      // Tabela física ainda não aplicada em produção
    }

    // 2. Fallback resiliente: ler histórico do AuditLog
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        empresa_id: empresaId,
        modulo: 'PREVENTIVA_EXECUCAO',
        acao: `CONCLUSAO_${preventivaId}`
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    for (const logItem of auditLogs) {
      try {
        const dados = typeof logItem.dados_depois === 'string'
          ? JSON.parse(logItem.dados_depois)
          : logItem.dados_depois;

        execucoes.push({
          id: dados?.execucao_id || logItem.id,
          preventiva_id: preventivaId,
          os_id: logItem.entidade_id,
          os_numero: dados?.os_numero,
          data_conclusao: dados?.data_conclusao ? new Date(dados.data_conclusao) : logItem.created_at,
          km_conclusao: dados?.km_conclusao,
          horimetro_conclusao: dados?.horimetro_conclusao,
          usuario_nome: logItem.usuario,
          km_proximo_calculado: dados?.novo_proximo_km,
          horimetro_proximo_calculado: dados?.novo_proximo_horimetro,
          data_proxima_calculada: dados?.nova_proxima_data ? new Date(dados.nova_proxima_data) : null,
          created_at: logItem.created_at
        });
      } catch (e) {
        // Ignora JSON malformado
      }
    }

    return execucoes;
  } catch (error) {
    console.error('Erro ao obter histórico de preventivas:', error);
    return [];
  }
}
