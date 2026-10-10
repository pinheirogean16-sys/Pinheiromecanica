import { prisma } from '@/lib/prisma';
import { notifyAdminsAndLeaders } from '@/lib/notificacoes';

export type StatusPreventiva = 'VENCIDO' | 'PROXIMO' | 'SAUDAVEL';

export interface AvaliacaoPreventivaResult {
  status: StatusPreventiva;
  km_atual: number;
  horimetro_atual: number;
  km_restante: number | null;
  horas_restantes: number | null;
  dias_restantes: number | null;
  isVencido: boolean;
  isProximo: boolean;
}

/**
 * Calcula o status dinâmico de uma regra preventiva com base nos limites de Data, KM e Horímetro
 */
export function avaliarStatusPreventiva(p: any, veiculo?: any): AvaliacaoPreventivaResult {
  const v = veiculo || p.Veiculo || p.veiculo;
  const kmAtual = Number(v?.quilometragem ?? p.km_atual ?? 0);
  const horimetroAtual = Number(v?.horimetro_atual ?? p.horimetro_atual ?? 0);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let isVencido = false;
  let isProximo = false;

  let kmRestante: number | null = null;
  let horasRestantes: number | null = null;
  let diasRestantes: number | null = null;

  // 1. Verificação por KM (se proximo_km ou km_limite configurado)
  const kmLimite = p.proximo_km ?? p.km_limite;
  const antecedenciaKm = Number(p.antecedencia_km ?? 1500);

  if (kmLimite !== null && kmLimite !== undefined && kmLimite > 0) {
    kmRestante = kmLimite - kmAtual;
    if (kmAtual >= kmLimite) {
      isVencido = true;
    } else if (kmRestante <= antecedenciaKm) {
      isProximo = true;
    }
  }

  // 2. Verificação por Horímetro (se proximo_horimetro configurado)
  const proximoHorimetro = p.proximo_horimetro;
  const antecedenciaHoras = Number(p.antecedencia_horas ?? 50);

  if (proximoHorimetro !== null && proximoHorimetro !== undefined && proximoHorimetro > 0) {
    horasRestantes = Number((proximoHorimetro - horimetroAtual).toFixed(1));
    if (horimetroAtual >= proximoHorimetro) {
      isVencido = true;
    } else if (horasRestantes <= antecedenciaHoras) {
      isProximo = true;
    }
  }

  // 3. Verificação por Data (se proxima_data ou data_limite configurada)
  const dataAlvo = p.proxima_data || p.data_limite;
  const antecedenciaDias = Number(p.antecedencia_dias ?? 15);

  if (dataAlvo) {
    const limite = new Date(dataAlvo);
    limite.setHours(0, 0, 0, 0);
    const diffTime = limite.getTime() - hoje.getTime();
    diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diasRestantes <= 0) {
      isVencido = true;
    } else if (diasRestantes <= antecedenciaDias) {
      isProximo = true;
    }
  }

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
    isProximo
  };
}

/**
 * Notifica administradores e líderes sobre preventivas vencidas ou próximas do vencimento (com anti-flood de 24h)
 */
export async function notificarPreventivasPendentes(empresa_id: string) {
  try {
    if (!empresa_id || empresa_id === 'default') return;

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

    const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const p of preventivas) {
      const avaliacao = avaliarStatusPreventiva(p);

      if (avaliacao.status === 'VENCIDO' || avaliacao.status === 'PROXIMO') {
        // Verificar se já existe notificação recente com a tag da preventiva
        const tag = `[PREV:${p.id}]`;
        const jaNotificado = await prisma.notificacao.findFirst({
          where: {
            empresa_id,
            mensagem: { contains: tag },
            created_at: { gte: umDiaAtras }
          }
        });

        if (!jaNotificado) {
          const identificador = p.Veiculo?.placa 
            ? `${p.Veiculo.placa} (${p.Veiculo.modelo})` 
            : p.Veiculo?.modelo || 'Veículo/Máquina';

          const titulo = avaliacao.status === 'VENCIDO' 
            ? `⚠️ Manutenção Preventiva VENCIDA` 
            : `⏳ Manutenção Preventiva Próxima`;

          let detalhes = [];
          if (avaliacao.km_restante !== null) {
            detalhes.push(avaliacao.km_restante <= 0 ? `KM Excedido (${Math.abs(avaliacao.km_restante)} KM)` : `Resta ${avaliacao.km_restante} KM`);
          }
          if (avaliacao.horas_restantes !== null) {
            detalhes.push(avaliacao.horas_restantes <= 0 ? `Horas Excedidas (${Math.abs(avaliacao.horas_restantes)} h)` : `Restam ${avaliacao.horas_restantes} h`);
          }
          if (avaliacao.dias_restantes !== null) {
            detalhes.push(avaliacao.dias_restantes <= 0 ? `Vencido há ${Math.abs(avaliacao.dias_restantes)} dias` : `Vence em ${avaliacao.dias_restantes} dias`);
          }

          const mensagem = `O plano "${p.nome || p.servico || p.componente}" para ${identificador} necessita de atenção. ${detalhes.join(' | ')}. ${tag}`;

          await notifyAdminsAndLeaders(
            titulo,
            mensagem,
            `/preventivas`,
            empresa_id
          );
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar notificações de preventivas:', error);
  }
}

/**
 * Atualiza o odômetro/horímetro do veículo e recalcula os planos preventivos quando uma OS é executada/finalizada
 */
export async function sincronizarPreventivasAposOS(os: any) {
  try {
    if (!os?.veiculo_id || !os?.empresa_id) return;

    // Se a OS registrou km_retorno ou km_saida maior que a km atual do veículo, atualiza o veículo
    const kmDaOS = Math.max(Number(os.km_retorno || 0), Number(os.km_saida || 0));
    
    if (kmDaOS > 0) {
      const veiculo = await prisma.veiculo.findUnique({
        where: { id: os.veiculo_id }
      });

      if (veiculo && kmDaOS > (veiculo.quilometragem || 0)) {
        await prisma.veiculo.update({
          where: { id: veiculo.id },
          data: { quilometragem: Math.round(kmDaOS) }
        });
      }
    }

    // Se a OS foi finalizada, verificar se concluiu algum plano preventivo expressamente
    // Caso a OS mencione uma preventiva em observações ou diagnóstico
    const preventivas = await prisma.preventiva.findMany({
      where: {
        veiculo_id: os.veiculo_id,
        empresa_id: os.empresa_id,
        ativo: true
      },
      include: {
        Veiculo: true
      }
    });

    const hoje = new Date();

    for (const p of preventivas) {
      // Se a OS foi finalizada e o diagnóstico ou observações referenciam esta preventiva ou componente
      const diagnosticoStr = (os.diagnostico || '').toLowerCase();
      const obsStr = (typeof os.observacoes === 'string' ? os.observacoes : '').toLowerCase();
      const compStr = (p.componente || '').toLowerCase();
      const servStr = (p.servico || p.nome || '').toLowerCase();

      const corresponde = (p.id && (diagnosticoStr.includes(p.id.toLowerCase()) || obsStr.includes(p.id.toLowerCase()))) ||
        (compStr && compStr.length > 2 && (diagnosticoStr.includes(compStr) || obsStr.includes(compStr))) ||
        (servStr && servStr.length > 3 && (diagnosticoStr.includes(servStr) || obsStr.includes(servStr)));

      if (os.status === 'FINALIZADA' && corresponde) {
        // Atualiza a data da última manutenção e projeta o próximo ciclo
        const kmAtual = Math.max(Number(p.Veiculo?.quilometragem || 0), kmDaOS);
        const horimetroAtual = Number(p.Veiculo?.horimetro_atual || 0);

        let novoProximoKm = p.proximo_km;
        if (p.intervalo_km) {
          novoProximoKm = kmAtual + p.intervalo_km;
        }

        let novoProximoHorimetro = p.proximo_horimetro;
        if (p.intervalo_horas) {
          novoProximoHorimetro = horimetroAtual + p.intervalo_horas;
        }

        let novaProximaData = p.proxima_data;
        if (p.intervalo_dias) {
          const prox = new Date();
          prox.setDate(prox.getDate() + p.intervalo_dias);
          novaProximaData = prox;
        }

        await prisma.preventiva.update({
          where: { id: p.id },
          data: {
            ultima_data: hoje,
            ultimo_km: kmAtual > 0 ? Math.round(kmAtual) : null,
            ultimo_horimetro: horimetroAtual > 0 ? horimetroAtual : null,
            proxima_data: novaProximaData,
            proximo_km: novoProximoKm,
            proximo_horimetro: novoProximoHorimetro,
            data_limite: novaProximaData,
            km_limite: novoProximoKm,
            status: 'SAUDAVEL',
            notificado: false
          }
        });
      } else {
        // Apenas reavalia o status com a quilometragem atualizada
        const avaliacao = avaliarStatusPreventiva(p);
        if (avaliacao.status !== p.status) {
          await prisma.preventiva.update({
            where: { id: p.id },
            data: { status: avaliacao.status }
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar preventivas após OS:', error);
  }
}
