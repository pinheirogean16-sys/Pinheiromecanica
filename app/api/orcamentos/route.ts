import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { Veiculo_tipo } from '@prisma/client';
import { validarEProcessarLeiturasVeiculo } from '@/lib/odometro-horimetro';

// A22: alinhado com o schema de POST (placa 3-20, ano ≤2035)
const updateVeiculoSchema = z.object({
  placa: z
    .string()
    .min(3, 'Placa/identificador muito curto')
    .max(20, 'Placa/identificador muito longo')
    .trim()
    .transform((v) => v.toUpperCase())
    .optional(),
  modelo: z.string().min(2, 'Modelo muito curto').trim().optional(),
  marca: z.string().min(2, 'Marca muito curta').trim().optional(),
  ano: z.coerce
    .number()
    .int()
    .min(1900, 'Ano inválido')
    .max(2035, 'Ano inválido')
    .optional(),
  tipo: z.nativeEnum(Veiculo_tipo).optional(),
  quilometragem: z.coerce.number().nonnegative().optional().nullable(),
  horimetro_atual: z.coerce.number().nonnegative().optional().nullable(),
  cliente_id: z.string().min(1).optional(),
  confirmar_salto_km: z.boolean().optional().default(false),
  confirmar_salto_horimetro: z.boolean().optional().default(false),
  autorizar_reducao_km: z.boolean().optional().default(false),
  autorizar_reducao_horimetro: z.boolean().optional().default(false),
  justificativa_ajuste_leitura: z.string().max(500).optional().nullable(),
});

// ============================================================
// GET — Buscar veículo
// ============================================================
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
        empresa_id: user.empresa_id,
      },
      include: {
        Cliente: true,
        OrdemServico: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!rawVeiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const { Cliente, OrdemServico, ...rest } = rawVeiculo;
    const veiculo = {
      ...rest,
      cliente: Cliente,
      ordens: OrdemServico,
    };

    return NextResponse.json(veiculo);
  } catch (error: any) {
    log(
      'ERROR',
      'VEICULO',
      'Erro ao buscar veículo',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao buscar veículo' }, { status: 500 });
  }
}

// ============================================================
// PUT — Atualizar veículo
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = updateVeiculoSchema.parse(await request.json());

    const antes = await prisma.veiculo.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    if (body.cliente_id && body.cliente_id !== antes.cliente_id) {
      const clienteExistente = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id: user.empresa_id },
        select: { id: true },
      });
      if (!clienteExistente) {
        return NextResponse.json(
          { error: 'Cliente não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    if (body.placa && body.placa !== antes.placa) {
      const existing = await prisma.veiculo.findFirst({
        where: {
          placa: body.placa,
          empresa_id: user.empresa_id,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Placa já cadastrada em outro veículo nesta empresa' },
          { status: 409 }
        );
      }
    }

    // ============================================================
    // A22: validação de leituras e uso do valor efetivo retornado
    // ============================================================
    let kmEfetivo: number | undefined = undefined;
    let horimetroEfetivo: number | undefined = undefined;
    let avisoLeitura: string | null = null;

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
        contexto: 'EDICAO_VEICULO',
      });

      if (!leiturasRes.sucesso) {
        return NextResponse.json({ error: leiturasRes.erro }, { status: 400 });
      }

      // A22: usa o valor efetivo calculado pela lib de validação.
      // Isso garante que autorizações de redução/salto são persistidas.
      if (leiturasRes.kmFinalAtualizar !== undefined && leiturasRes.kmFinalAtualizar !== null) {
        kmEfetivo = Number(leiturasRes.kmFinalAtualizar);
      }
      if (
        leiturasRes.horimetroFinalAtualizar !== undefined &&
        leiturasRes.horimetroFinalAtualizar !== null
      ) {
        horimetroEfetivo = Number(leiturasRes.horimetroFinalAtualizar);
      }

      // A22: se a lib devolveu algum aviso, propaga ao front
      if ((leiturasRes as any).aviso) {
        avisoLeitura = String((leiturasRes as any).aviso);
      }
    }

    // ============================================================
    // Whitelist de campos cadastrais (impede injeção de campos de sistema)
    // ============================================================
    const updateData: any = {
      updated_by: user?.name || user?.email || 'Sistema',
    };

    if (body.placa !== undefined) updateData.placa = body.placa;
    if (body.modelo !== undefined) updateData.modelo = body.modelo;
    if (body.marca !== undefined) updateData.marca = body.marca;
    if (body.ano !== undefined) updateData.ano = body.ano;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id;

    // A22: só grava km/horímetro se a validação retornou valor efetivo
    if (kmEfetivo !== undefined) updateData.quilometragem = kmEfetivo;
    if (horimetroEfetivo !== undefined) updateData.horimetro_atual = horimetroEfetivo;

    const veiculo = await prisma.veiculo.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EDITAR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: veiculo,
    });

    log('INFO', 'VEICULO', 'Veículo atualizado', { id }, user?.name);

    return NextResponse.json({
      ...veiculo,
      ...(avisoLeitura ? { aviso: avisoLeitura } : {}),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log(
      'ERROR',
      'VEICULO',
      'Erro ao atualizar veículo',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao atualizar veículo' }, { status: 500 });
  }
}

// ============================================================
// DELETE — Excluir veículo (somente se sem vínculos)
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'veiculos', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.veiculo.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    // A22: verificar vínculos antes de excluir (evita 500 por FK)
    const [osCount, orcamentosCount, preventivasCount, checklistsCount] = await Promise.all([
      prisma.ordemServico.count({ where: { veiculo_id: id } }),
      prisma.orcamento.count({ where: { veiculo_id: id } }),
      prisma.preventiva.count({ where: { veiculo_id: id } }),
      prisma.checklistExecucao.count({ where: { veiculo_id: id } }),
    ]);

    if (osCount > 0 || orcamentosCount > 0 || preventivasCount > 0 || checklistsCount > 0) {
      return NextResponse.json(
        {
          error:
            'Este veículo possui histórico (OS, orçamentos, preventivas ou checklists) e não pode ser excluído.',
        },
        { status: 409 }
      );
    }

    await prisma.veiculo.delete({
      where: { id },
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EXCLUIR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
    });

    log('INFO', 'VEICULO', 'Veículo excluído', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log(
      'ERROR',
      'VEICULO',
      'Erro ao excluir veículo',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao excluir veículo' }, { status: 500 });
  }
}
