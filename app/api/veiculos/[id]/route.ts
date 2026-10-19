import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { Veiculo_tipo } from '@prisma/client';
import { validarEProcessarLeiturasVeiculo } from '@/lib/odometro-horimetro';

// ============================================================
// CONSTANTES (alinhadas com POST /api/veiculos)
// ============================================================
const ANO_MAX = new Date().getFullYear() + 1;

// ============================================================
// SCHEMA DE UPDATE
// ============================================================
const updateVeiculoSchema = z.object({
  placa: z
    .string()
    .min(3, 'Placa ou identificador deve ter no mínimo 3 caracteres')
    .max(20, 'Placa ou identificador deve ter no máximo 20 caracteres')
    .trim()
    .transform((v) => v.toUpperCase())
    .optional(),
  modelo: z.string().min(2, 'Modelo obrigatório').max(200, 'Modelo muito longo').trim().optional(),
  marca: z.string().min(2, 'Marca obrigatória').max(100, 'Marca muito longa').trim().optional(),
  ano: z.coerce
    .number()
    .int()
    .min(1900, 'Ano inválido')
    .max(ANO_MAX, `Ano inválido (máximo ${ANO_MAX})`)
    .optional(),
  tipo: z.nativeEnum(Veiculo_tipo).optional(),
  quilometragem: z.coerce.number().nonnegative().optional().nullable(),
  horimetro_atual: z.coerce.number().nonnegative().optional().nullable(),
  cliente_id: z.string().min(1).optional(),
  confirmar_salto_km: z.boolean().optional().default(false),
  confirmar_salto_horimetro: z.boolean().optional().default(false),
  autorizar_reducao_km: z.boolean().optional().default(false),
  autorizar_reducao_horimetro: z.boolean().optional().default(false),
  justificativa_ajuste_leitura: z.string().max(1000).optional().nullable(),
});

// ============================================================
// GET — Buscar veículo por ID
// ============================================================
export async function GET(
  _request: Request,
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
          // ✅ Otimização: só os campos que a tela usa
          select: {
            id: true,
            numero: true,
            status: true,
            valor_total: true,
            data_entrada: true,
            data_finalizada: true,
            diagnostico: true,
          },
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
    return apiError(error, 'VEICULO', 'Erro ao buscar veículo');
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

    // ✅ CORRIGIDO: 'veiculos' (plural)
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

    if (body.cliente_id) {
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

    if (body.placa) {
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
    // Validação de odômetro/horímetro (com as flags de confirmação)
    // ============================================================
    let leiturasRes: any = {
      kmFinalAtualizar: null,
      horimetroFinalAtualizar: null,
      sucesso: true,
    };

    if (body.quilometragem !== undefined || body.horimetro_atual !== undefined) {
      leiturasRes = await validarEProcessarLeiturasVeiculo({
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
    }

    // ============================================================
    // Whitelist explícita — impede injeção de campos
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

    // ✅ CORRIGIDO: persistir quilometragem e horímetro no update
    // (antes eram validados mas NÃO salvos explicitamente)
    if (body.quilometragem !== undefined) {
      updateData.quilometragem =
        leiturasRes.kmFinalAtualizar !== null && leiturasRes.kmFinalAtualizar !== undefined
          ? leiturasRes.kmFinalAtualizar
          : body.quilometragem;
    }
    if (body.horimetro_atual !== undefined) {
      updateData.horimetro_atual =
        leiturasRes.horimetroFinalAtualizar !== null && leiturasRes.horimetroFinalAtualizar !== undefined
          ? leiturasRes.horimetroFinalAtualizar
          : body.horimetro_atual;
    }

    // ✅ Defense in Depth: empresa_id no where
    const veiculo = await prisma.veiculo.update({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
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

    return NextResponse.json(veiculo);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'VEICULO', 'Erro ao atualizar veículo');
  }
}

// ============================================================
// DELETE — Excluir veículo
// ============================================================
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ CORRIGIDO: 'veiculos' (plural)
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

    // ✅ NOVO: verifica dependências antes de tentar deletar
    // (evita 500 por FK e dá mensagem clara ao usuário)
    const [osCount, preventivasCount] = await Promise.all([
      prisma.ordemServico.count({ where: { veiculo_id: id } }),
      prisma.preventiva.count({ where: { veiculo_id: id } }),
    ]);

    if (osCount > 0 || preventivasCount > 0) {
      const motivos: string[] = [];
      if (osCount > 0) motivos.push(`${osCount} OS vinculada(s)`);
      if (preventivasCount > 0) motivos.push(`${preventivasCount} preventiva(s) vinculada(s)`);

      return NextResponse.json(
        {
          error: `Este veículo não pode ser excluído porque possui histórico: ${motivos.join(' e ')}. Considere desativá-lo em vez de excluir.`,
        },
        { status: 409 }
      );
    }

    // ✅ Defense in Depth: empresa_id no where
    await prisma.veiculo.delete({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });

    await createAuditLog({
      modulo: 'VEICULO',
      acao: 'EXCLUIR',
      entidade: 'Veiculo',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id, // ✅ Adicionado
      dados_antes: antes,
    });

    log('INFO', 'VEICULO', 'Veículo excluído', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'VEICULO', 'Erro ao excluir veículo');
  }
}
