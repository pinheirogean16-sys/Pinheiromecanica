import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { Veiculo_tipo } from '@prisma/client';
import { validarEProcessarLeiturasVeiculo } from '@/lib/odometro-horimetro';

const updateVeiculoSchema = z.object({
  placa: z.string().min(7).max(8).trim().transform(v => v.toUpperCase()).optional(),
  modelo: z.string().min(2).trim().optional(),
  marca: z.string().min(2).trim().optional(),
  ano: z.coerce.number().int().min(1900).max(2030).optional(),
  tipo: z.nativeEnum(Veiculo_tipo).optional(),
  quilometragem: z.coerce.number().optional().nullable(),
  horimetro_atual: z.coerce.number().optional().nullable(),
  cliente_id: z.string().min(1).optional(),
  confirmar_salto_km: z.boolean().optional().default(false),
  confirmar_salto_horimetro: z.boolean().optional().default(false),
  autorizar_reducao_km: z.boolean().optional().default(false),
  autorizar_reducao_horimetro: z.boolean().optional().default(false),
  justificativa_ajuste_leitura: z.string().optional().nullable()
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawVeiculo = await prisma.veiculo.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: {
        Cliente: true,
        OrdemServico: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    if (!rawVeiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const { Cliente, OrdemServico, ...rest } = rawVeiculo;
    const veiculo = {
      ...rest,
      cliente: Cliente,
      ordens: OrdemServico
    };

    return NextResponse.json(veiculo);
  } catch (error) {
    log('ERROR', 'VEICULO', 'Erro ao buscar veículo', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar veículo' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculo', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = updateVeiculoSchema.parse(await request.json());

    const antes = await prisma.veiculo.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    if (body.cliente_id) {
      const clienteExistente = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id: user.empresa_id }
      });
      if (!clienteExistente) {
        return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
      }
    }

    if (body.placa) {
      const existing = await prisma.veiculo.findFirst({
        where: {
          placa: body.placa,
          empresa_id: user.empresa_id,
          id: { not: id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'Placa já cadastrada em outro veículo nesta empresa' }, { status: 400 });
      }
    }

    // 1. Processar validação de odômetro e horímetro de forma protegida
    if (body.quilometragem !== undefined || body.horimetro_atual !== undefined) {
      const leiturasRes = await validarEProcessarLeiturasVeiculo({
        veiculoId: id,
        empresaId: user.empresa_id,
        kmInformado: body.quilometragem,
        horimetroInformado: body.horimetro_atual,
        confirmarSaltoKm: body.confirmar_salto_km,
        confirmarSaltoHorimetro: body.confirmar_salto_horimetro,
        autorizarReducaoKm: body.autorizar_reducao_km,
        autorizarReducaoHorimetro: body.autorizar_reducao_horimetro,
        justificativa: body.justificativa_ajuste_leitura,
        usuario: user,
        contexto: 'EDICAO_VEICULO'
      });

      if (!leiturasRes.sucesso) {
        return NextResponse.json({ error: leiturasRes.erro }, { status: 400 });
      }
    }

    // 2. Whitelist explícita de campos cadastrais (impede injeção e mutação arbitrária de campos de sistema)
    const updateData: any = {
      updated_by: user?.name || user?.email || 'Sistema'
    };

    if (body.placa !== undefined) updateData.placa = body.placa;
    if (body.modelo !== undefined) updateData.modelo = body.modelo;
    if (body.marca !== undefined) updateData.marca = body.marca;
    if (body.ano !== undefined) updateData.ano = body.ano;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id;

    const veiculo = await prisma.veiculo.update({
      where: { id },
      data: updateData
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EDITAR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: veiculo
    });

    log('INFO', 'VEICULO', 'Veículo atualizado', { id }, user?.name);

    return NextResponse.json(veiculo);
  } catch (error) {
    log('ERROR', 'VEICULO', 'Erro ao atualizar veículo', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar veículo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculo', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.veiculo.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }
    
    await prisma.veiculo.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EXCLUIR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'VEICULO', 'Veículo excluído', { id }, user?.name);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'VEICULO', 'Erro ao excluir veículo', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir veículo. Verifique se não há OS vinculadas.' }, { status: 500 });
  }
}
