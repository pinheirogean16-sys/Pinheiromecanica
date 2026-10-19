
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { avaliarStatusPreventiva } from '@/lib/preventivas';

// ============================================================
// CONSTANTES
// ============================================================
const TIPOS_CONTROLE = ['KM', 'DIAS', 'HORAS', 'MISTO'] as const;

// ============================================================
// HELPER: parse de data seguro
// ============================================================
function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// SCHEMAS
// ============================================================
const editPreventivaSchema = z.object({
  nome: z.string().max(200).optional().nullable(),
  servico: z.string().max(200).optional().nullable(),
  componente: z.string().max(100).optional().nullable(),
  descricao: z.string().max(1000).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  tipo_controle: z.enum(TIPOS_CONTROLE).optional(),
  intervalo_dias: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  intervalo_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  intervalo_horas: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive().optional().nullable()
  ),
  ultima_data: z.string().optional().nullable(),
  ultimo_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().nonnegative().optional().nullable()
  ),
  ultimo_horimetro: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().nonnegative().optional().nullable()
  ),
  proxima_data: z.string().optional().nullable(),
  proximo_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  proximo_horimetro: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive().optional().nullable()
  ),
  antecedencia_dias: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().optional().nullable()
  ),
  antecedencia_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().optional().nullable()
  ),
  antecedencia_horas: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().optional().nullable()
  ),
  ativo: z.boolean().optional(),
  // Status: string com limite (o valor real vem de avaliarStatusPreventiva)
  status: z.string().max(50).optional(),
  // Retrocompatibilidade
  km_limite: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().optional().nullable()
  ),
  data_limite: z.string().optional().nullable(),
});

// ============================================================
// GET — Buscar preventiva por ID
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const id = (await params).id;
    const preventiva = await prisma.preventiva.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: {
        Veiculo: { include: { Cliente: true } },
      },
    });

    if (!preventiva) {
      return NextResponse.json({ error: 'Preventiva não encontrada' }, { status: 404 });
    }

    const avaliacao = avaliarStatusPreventiva(preventiva);

    // ✅ Evita sobrescrever campos do banco com undefined da avaliação
    const safeAvaliacao: any = {};
    for (const key of Object.keys(avaliacao)) {
      if ((avaliacao as any)[key] !== undefined) {
        safeAvaliacao[key] = (avaliacao as any)[key];
      }
    }

    return NextResponse.json({
      ...preventiva,
      ...safeAvaliacao,
    });
  } catch (error: any) {
    return apiError(error, 'PREVENTIVAS', 'Erro ao obter preventiva');
  }
}

// ============================================================
// PUT — Atualizar preventiva
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const id = (await params).id;
    const beforeObj = await prisma.preventiva.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: { Veiculo: true },
    });

    if (!beforeObj) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    const body = editPreventivaSchema.parse(await request.json());

    const updateData: any = {
      updated_by: user.name || user.email || 'Usuário',
    };

    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.servico !== undefined) updateData.servico = body.servico;
    if (body.componente !== undefined) updateData.componente = body.componente;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.observacoes !== undefined) updateData.observacoes = body.observacoes;
    if (body.tipo_controle !== undefined) updateData.tipo_controle = body.tipo_controle;
    if (body.intervalo_dias !== undefined) updateData.intervalo_dias = body.intervalo_dias;
    if (body.intervalo_km !== undefined) updateData.intervalo_km = body.intervalo_km;
    if (body.intervalo_horas !== undefined) updateData.intervalo_horas = body.intervalo_horas;
    if (body.ativo !== undefined) updateData.ativo = body.ativo;

    // ✅ Datas com parse seguro
    if (body.ultima_data !== undefined) {
      updateData.ultima_data = parseDate(body.ultima_data);
    }
    if (body.ultimo_km !== undefined) updateData.ultimo_km = body.ultimo_km;
    if (body.ultimo_horimetro !== undefined) updateData.ultimo_horimetro = body.ultimo_horimetro;

    // Sincronizar limites de data
    if (body.proxima_data !== undefined || body.data_limite !== undefined) {
      const dataVal = body.proxima_data || body.data_limite;
      const parsedDate = parseDate(dataVal);
      updateData.proxima_data = parsedDate;
      updateData.data_limite = parsedDate;
    }

    // Sincronizar limites de KM
    if (body.proximo_km !== undefined || body.km_limite !== undefined) {
      const kmVal = body.proximo_km !== undefined ? body.proximo_km : body.km_limite;
      updateData.proximo_km = kmVal;
      updateData.km_limite = kmVal;
    }

    if (body.proximo_horimetro !== undefined) {
      updateData.proximo_horimetro = body.proximo_horimetro;
    }

    if (body.antecedencia_dias !== undefined) updateData.antecedencia_dias = body.antecedencia_dias;
    if (body.antecedencia_km !== undefined) updateData.antecedencia_km = body.antecedencia_km;
    if (body.antecedencia_horas !== undefined) updateData.antecedencia_horas = body.antecedencia_horas;

    // Recalcular status
    const mergedObj = {
      ...beforeObj,
      ...updateData,
      Veiculo: beforeObj.Veiculo,
    };

    const avaliacao = avaliarStatusPreventiva(mergedObj);
    updateData.status = mergedObj.ativo === false
      ? 'DESATIVADO'
      : (body.status !== undefined ? body.status : avaliacao.status);

    // ✅ Redundância de segurança: empresa_id no where
    const updated = await prisma.preventiva.update({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      data: updateData,
      include: {
        Veiculo: { include: { Cliente: true } },
      },
    });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'EDITAR',
      entidade: 'Preventiva',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: beforeObj,
      dados_depois: updated,
    });

    log('INFO', 'PREVENTIVAS', 'Preventiva atualizada', { id }, user?.name);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'PREVENTIVAS', 'Erro ao editar preventiva');
  }
}

// ============================================================
// DELETE — Excluir ou arquivar preventiva
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const id = (await params).id;
    const beforeObj = await prisma.preventiva.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });

    if (!beforeObj) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    // Verificar se existem execuções históricas vinculadas a este plano
    let temExecucoes = false;
    try {
      const countExec = await (prisma as any).preventivaExecucao.count({
        where: { preventiva_id: id, empresa_id: user.empresa_id },
      });
      if (countExec > 0) temExecucoes = true;
    } catch {
      // fallback via auditoria
    }

    if (!temExecucoes) {
      const auditExec = await prisma.auditLog.findFirst({
        where: {
          empresa_id: user.empresa_id,
          modulo: 'PREVENTIVA_EXECUCAO',
          acao: `CONCLUSAO_${id}`,
        },
      });
      if (auditExec) temExecucoes = true;
    }

    if (temExecucoes) {
      // Política de retenção: planos com histórico são desativados
      await prisma.preventiva.update({
        where: {
          id,
          empresa_id: user.empresa_id, // ✅ Redundância de segurança
        },
        data: {
          ativo: false,
          status: 'DESATIVADO',
          updated_at: new Date(),
        },
      });

      await createAuditLog({
        modulo: 'PREVENTIVAS',
        acao: 'ARQUIVAR_COM_HISTORICO',
        entidade: 'Preventiva',
        entidade_id: id,
        usuario: user?.name || user?.email || 'Sistema',
        empresa_id: user.empresa_id,
        dados_antes: beforeObj,
        dados_depois: { motivo: 'Plano possui histórico de execuções. Desativado com retenção integral.' },
      });

      log('INFO', 'PREVENTIVAS', 'Preventiva arquivada com histórico', { id }, user?.name);

      return NextResponse.json({
        success: true,
        arquivado: true,
        message: 'Plano possui histórico de manutenções realizadas e foi desativado com sucesso, preservando todos os registros históricos.',
      });
    }

    // Sem histórico: exclusão física
    await prisma.preventiva.delete({
      where: {
        id,
        empresa_id: user.empresa_id, // ✅ Redundância de segurança
      },
    });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'EXCLUIR',
      entidade: 'Preventiva',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: beforeObj,
    });

    log('INFO', 'PREVENTIVAS', 'Preventiva excluída', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'PREVENTIVAS', 'Erro ao excluir preventiva');
  }
}
