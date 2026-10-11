import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { log } from '@/lib/logger';

export const LIMITE_MAX_KM_PLAUSIVEL = 5000000;
export const LIMITE_MAX_HORAS_PLAUSIVEL = 100000;
export const SALTO_SUSPEITO_KM = 50000;
export const SALTO_SUSPEITO_HORAS = 1000;

export interface ValidacaoLeituraParams {
  veiculoId: string;
  empresaId: string;
  kmInformado?: number | null;
  horimetroInformado?: number | null;
  confirmarSaltoKm?: boolean;
  confirmarSaltoHorimetro?: boolean;
  autorizarReducaoKm?: boolean;
  autorizarReducaoHorimetro?: boolean;
  justificativa?: string | null;
  usuario: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    empresa_id?: string;
  };
  contexto?: string; // ex: 'CRIACAO_OS', 'EDICAO_OS', 'FINALIZACAO_OS'
  osId?: string;
}

export interface ValidacaoLeituraResult {
  sucesso: boolean;
  erro?: string;
  kmFinalAtualizar: number | null;
  horimetroFinalAtualizar: number | null;
  kmAnterior: number;
  horimetroAnterior: number;
  aviso?: string;
}

/**
 * Valida com rigor odômetro e horímetro de veículos pesados e equipamentos diesel.
 * Impede redução silenciosa, detecta saltos anômalos e audita alterações.
 */
export async function validarEProcessarLeiturasVeiculo(
  params: ValidacaoLeituraParams
): Promise<ValidacaoLeituraResult> {
  const {
    veiculoId,
    empresaId,
    kmInformado,
    horimetroInformado,
    confirmarSaltoKm,
    confirmarSaltoHorimetro,
    autorizarReducaoKm,
    autorizarReducaoHorimetro,
    justificativa,
    usuario,
    contexto = 'OS',
    osId
  } = params;

  const veiculo = await prisma.veiculo.findFirst({
    where: {
      id: veiculoId,
      empresa_id: empresaId
    }
  });

  if (!veiculo) {
    return {
      sucesso: false,
      erro: 'Veículo não encontrado nesta empresa',
      kmFinalAtualizar: null,
      horimetroFinalAtualizar: null,
      kmAnterior: 0,
      horimetroAnterior: 0
    };
  }

  const kmAnterior = Number(veiculo.quilometragem || 0);
  const horimetroAnterior = Number(veiculo.horimetro_atual || 0);

  let kmFinalAtualizar: number | null = null;
  let horimetroFinalAtualizar: number | null = null;
  const avisos: string[] = [];

  // ==========================================
  // 1. VALIDAÇÃO DE QUILOMETRAGEM (ODÔMETRO)
  // ==========================================
  if (kmInformado !== undefined && kmInformado !== null) {
    const kmNum = Number(kmInformado);

    if (isNaN(kmNum)) {
      return {
        sucesso: false,
        erro: 'Formato de quilometragem inválido.',
        kmFinalAtualizar: null,
        horimetroFinalAtualizar: null,
        kmAnterior,
        horimetroAnterior
      };
    }

    if (kmNum < 0) {
      return {
        sucesso: false,
        erro: 'Quilometragem não pode ser negativa.',
        kmFinalAtualizar: null,
        horimetroFinalAtualizar: null,
        kmAnterior,
        horimetroAnterior
      };
    }

    if (kmNum > LIMITE_MAX_KM_PLAUSIVEL) {
      return {
        sucesso: false,
        erro: `Quilometragem informada (${kmNum.toLocaleString('pt-BR')} KM) ultrapassa o limite físico plausível de 5.000.000 KM.`,
        kmFinalAtualizar: null,
        horimetroFinalAtualizar: null,
        kmAnterior,
        horimetroAnterior
      };
    }

    if (kmNum > 0) {
      if (kmNum < kmAnterior) {
        // Leitura menor que o odômetro atual
        if (autorizarReducaoKm) {
          // Correção autorizada (ex: troca de painel, erro de digitação anterior comprovado)
          const isAdminOrLider = usuario.role === 'ADMIN' || usuario.role === 'LIDER';
          if (!isAdminOrLider) {
            return {
              sucesso: false,
              erro: 'Redução de quilometragem requer autorização de um Administrador ou Líder.',
              kmFinalAtualizar: null,
              horimetroFinalAtualizar: null,
              kmAnterior,
              horimetroAnterior
            };
          }

          if (!justificativa || justificativa.trim().length < 5) {
            return {
              sucesso: false,
              erro: 'Justificativa formal é obrigatória para redução de odômetro (troca de painel/correção).',
              kmFinalAtualizar: null,
              horimetroFinalAtualizar: null,
              kmAnterior,
              horimetroAnterior
            };
          }

          kmFinalAtualizar = Math.round(kmNum);
          await createAuditLog({
            modulo: 'VEICULO',
            acao: 'REDUCAO_ODOMETRO_AUTORIZADA',
            entidade: 'Veiculo',
            entidade_id: veiculo.id,
            usuario: usuario.name || usuario.email || 'Usuário',
            empresa_id: empresaId,
            dados_antes: { quilometragem: kmAnterior },
            dados_depois: {
              quilometragem: kmFinalAtualizar,
              justificativa,
              contexto,
              osId
            }
          });
        } else {
          // Não reduz silenciosamente o odômetro do veículo
          avisos.push(
            `Quilometragem informada (${kmNum} KM) é menor que a cadastrada no veículo (${kmAnterior} KM). O valor anterior foi preservado para segurança.`
          );
          kmFinalAtualizar = null; // Mantém o do veículo inalterado
        }
      } else if (kmNum - kmAnterior > SALTO_SUSPEITO_KM && kmAnterior > 0) {
        // Salto expressivo
        const salto = kmNum - kmAnterior;
        if (!confirmarSaltoKm) {
          return {
            sucesso: false,
            erro: `Salto expressivo de quilometragem detectado (+${salto.toLocaleString('pt-BR')} KM em relação à leitura de ${kmAnterior.toLocaleString('pt-BR')} KM). Confirmação explícita obrigatória.`,
            kmFinalAtualizar: null,
            horimetroFinalAtualizar: null,
            kmAnterior,
            horimetroAnterior
          };
        }

        kmFinalAtualizar = Math.round(kmNum);
        await createAuditLog({
          modulo: 'VEICULO',
          acao: 'SALTO_ODOMETRO_CONFIRMADO',
          entidade: 'Veiculo',
          entidade_id: veiculo.id,
          usuario: usuario.name || usuario.email || 'Usuário',
          empresa_id: empresaId,
          dados_antes: { quilometragem: kmAnterior },
          dados_depois: {
            quilometragem: kmFinalAtualizar,
            salto,
            contexto,
            osId
          }
        });
      } else if (kmNum > kmAnterior) {
        kmFinalAtualizar = Math.round(kmNum);
      }
    }
  }

  // ==========================================
  // 2. VALIDAÇÃO DE HORÍMETRO
  // ==========================================
  if (horimetroInformado !== undefined && horimetroInformado !== null) {
    const hNum = Number(horimetroInformado);

    if (isNaN(hNum)) {
      return {
        sucesso: false,
        erro: 'Formato de horímetro inválido.',
        kmFinalAtualizar: null,
        horimetroFinalAtualizar: null,
        kmAnterior,
        horimetroAnterior
      };
    }

    if (hNum < 0) {
      return {
        sucesso: false,
        erro: 'Horímetro não pode ser negativo.',
        kmFinalAtualizar: null,
        horimetroFinalAtualizar: null,
        kmAnterior,
        horimetroAnterior
      };
    }

    if (hNum > LIMITE_MAX_HORAS_PLAUSIVEL) {
      return {
        sucesso: false,
        erro: `Horímetro informado (${hNum.toLocaleString('pt-BR')} h) ultrapassa o limite físico plausível de 100.000 horas.`,
        kmFinalAtualizar: null,
        horimetroFinalAtualizar: null,
        kmAnterior,
        horimetroAnterior
      };
    }

    if (hNum > 0) {
      if (hNum < horimetroAnterior) {
        // Redução de horímetro
        if (autorizarReducaoHorimetro) {
          const isAdminOrLider = usuario.role === 'ADMIN' || usuario.role === 'LIDER';
          if (!isAdminOrLider) {
            return {
              sucesso: false,
              erro: 'Redução de horímetro requer autorização de um Administrador ou Líder.',
              kmFinalAtualizar: null,
              horimetroFinalAtualizar: null,
              kmAnterior,
              horimetroAnterior
            };
          }

          if (!justificativa || justificativa.trim().length < 5) {
            return {
              sucesso: false,
              erro: 'Justificativa formal é obrigatória para redução de horímetro (troca de relógio/correção).',
              kmFinalAtualizar: null,
              horimetroFinalAtualizar: null,
              kmAnterior,
              horimetroAnterior
            };
          }

          horimetroFinalAtualizar = Number(hNum.toFixed(1));
          await createAuditLog({
            modulo: 'VEICULO',
            acao: 'REDUCAO_HORIMETRO_AUTORIZADA',
            entidade: 'Veiculo',
            entidade_id: veiculo.id,
            usuario: usuario.name || usuario.email || 'Usuário',
            empresa_id: empresaId,
            dados_antes: { horimetro_atual: horimetroAnterior },
            dados_depois: {
              horimetro_atual: horimetroFinalAtualizar,
              justificativa,
              contexto,
              osId
            }
          });
        } else {
          avisos.push(
            `Horímetro informado (${hNum} h) é menor que o atual do equipamento (${horimetroAnterior} h). O valor anterior foi preservado para segurança.`
          );
          horimetroFinalAtualizar = null; // Mantém inalterado
        }
      } else if (hNum - horimetroAnterior > SALTO_SUSPEITO_HORAS && horimetroAnterior > 0) {
        // Salto expressivo de horas
        const salto = Number((hNum - horimetroAnterior).toFixed(1));
        if (!confirmarSaltoHorimetro) {
          return {
            sucesso: false,
            erro: `Salto expressivo de horímetro detectado (+${salto.toLocaleString('pt-BR')} horas em relação à leitura de ${horimetroAnterior.toLocaleString('pt-BR')} h). Confirmação explícita obrigatória.`,
            kmFinalAtualizar: null,
            horimetroFinalAtualizar: null,
            kmAnterior,
            horimetroAnterior
          };
        }

        horimetroFinalAtualizar = Number(hNum.toFixed(1));
        await createAuditLog({
          modulo: 'VEICULO',
          acao: 'SALTO_HORIMETRO_CONFIRMADO',
          entidade: 'Veiculo',
          entidade_id: veiculo.id,
          usuario: usuario.name || usuario.email || 'Usuário',
          empresa_id: empresaId,
          dados_antes: { horimetro_atual: horimetroAnterior },
          dados_depois: {
            horimetro_atual: horimetroFinalAtualizar,
            salto,
            contexto,
            osId
          }
        });
      } else if (hNum > horimetroAnterior) {
        horimetroFinalAtualizar = Number(hNum.toFixed(1));
      }
    }
  }

  // Se houver campos a atualizar no veículo, efetua a atualização com auditoria
  const dataUpdate: any = {};
  if (kmFinalAtualizar !== null && kmFinalAtualizar > kmAnterior) {
    dataUpdate.quilometragem = kmFinalAtualizar;
  } else if (kmFinalAtualizar !== null && autorizarReducaoKm) {
    dataUpdate.quilometragem = kmFinalAtualizar;
  }

  if (horimetroFinalAtualizar !== null && horimetroFinalAtualizar > horimetroAnterior) {
    dataUpdate.horimetro_atual = horimetroFinalAtualizar;
  } else if (horimetroFinalAtualizar !== null && autorizarReducaoHorimetro) {
    dataUpdate.horimetro_atual = horimetroFinalAtualizar;
  }

  if (Object.keys(dataUpdate).length > 0) {
    await prisma.veiculo.update({
      where: { id: veiculo.id },
      data: {
        ...dataUpdate,
        updated_by: usuario.name || usuario.email || 'Sistema'
      }
    });

    log('INFO', 'VEICULO', 'Odômetro/Horímetro atualizado com validação de integridade', {
      veiculo_id: veiculo.id,
      ...dataUpdate,
      contexto,
      osId
    }, usuario.name);
  }

  return {
    sucesso: true,
    kmFinalAtualizar,
    horimetroFinalAtualizar,
    kmAnterior,
    horimetroAnterior,
    aviso: avisos.length > 0 ? avisos.join(' ') : undefined
  };
}
