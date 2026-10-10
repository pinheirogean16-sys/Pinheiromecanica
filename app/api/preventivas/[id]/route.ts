import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { avaliarStatusPreventiva } from '@/lib/preventivas';

const editPreventivaSchema = z.object({
  nome: z.string().optional().nullable(),
  servico: z.string().optional().nullable(),
  componente: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  tipo_controle: z.string().optional(),
  intervalo_dias: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  intervalo_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  intervalo_horas: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().optional().nullable()),
  ultima_data: z.string().optional().nullable(),
  ultimo_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().nonnegative().optional().nullable()),
  ultimo_horimetro: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().nonnegative().optional().nullable()),
  proxima_data: z.string().optional().nullable(),
  proximo_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  proximo_horimetro: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().optional().nullable()),
  antecedencia_dias: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().optional().nullable()),
  antecedencia_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().optional().nullable()),
  antecedencia_horas: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().optional().nullable()),
  ativo: z.boolean().optional(),
  status: z.string().optional(),
  // Retrocompatibilidade
  km_limite: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().optional().nullable()),
  data_limite: z.string().optional().nullable()
});

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
        empresa_id: user.empresa_id
      },
      include: {
        Veiculo: {
          include: {
            Cliente: true
          }
        }
      }
    });

    if (!preventiva) {
      return NextResponse.json({ error: 'Preventiva não encontrada' }, { status: 404 });
    }

    const avaliacao = avaliarStatusPreventiva(preventiva);

    return NextResponse.json({
      ...preventiva,
      ...avaliacao
    });
  } catch (error) {
    log('ERROR', 'PREVENTIVAS', 'Erro ao obter preventiva por id', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao obter preventiva' }, { status: 500 });
  }
}

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
        empresa_id: user.empresa_id 
      },
      include: {
        Veiculo: true
      }
    });

    if (!beforeObj) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    const body = editPreventivaSchema.parse(await request.json());

    const updateData: any = {
      updated_by: user.name || user.email || 'Usuário'
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

    if (body.ultima_data !== undefined) {
      updateData.ultima_data = body.ultima_data ? new Date(body.ultima_data) : null;
    }
    if (body.ultimo_km !== undefined) updateData.ultimo_km = body.ultimo_km;
    if (body.ultimo_horimetro !== undefined) updateData.ultimo_horimetro = body.ultimo_horimetro;

    // Sincronizar limites de data
    if (body.proxima_data !== undefined || body.data_limite !== undefined) {
      const dataVal = body.proxima_data || body.data_limite;
      updateData.proxima_data = dataVal ? new Date(dataVal) : null;
      updateData.data_limite = dataVal ? new Date(dataVal) : null;
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

    // Recalcular status com base nos novos valores
    const mergedObj = {
      ...beforeObj,
      ...updateData,
      Veiculo: beforeObj.Veiculo
    };

    const avaliacao = avaliarStatusPreventiva(mergedObj);
    updateData.status = body.status !== undefined ? body.status : avaliacao.status;

    const updated = await prisma.preventiva.update({
      where: { id },
      data: updateData,
      include: {
        Veiculo: {
          include: {
            Cliente: true
          }
        }
      }
    });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'EDITAR',
      entidade: 'Preventiva',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: beforeObj,
      dados_depois: updated
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao editar preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao editar preventiva' }, { status: 500 });
  }
}

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
        empresa_id: user.empresa_id 
      } 
    });

    if (!beforeObj) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    await prisma.preventiva.delete({ where: { id } });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'EXCLUIR',
      entidade: 'Preventiva',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: beforeObj
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log('ERROR', 'PREVENTIVAS', 'Erro ao excluir preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir preventiva' }, { status: 500 });
  }
}
