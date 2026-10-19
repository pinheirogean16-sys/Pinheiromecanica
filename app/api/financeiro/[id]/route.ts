import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// A17: status como enum (não texto livre)
const STATUS_VALIDOS = ['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'] as const;

const updateFinanceiroSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  descricao: z.string().min(3).trim().optional(),
  valor: z.coerce.number().positive().optional(),
  data: z.string().optional().nullable(),
  data_vencimento: z.string().optional().nullable(),
  data_pagamento: z.string().optional().nullable(),
  status: z.enum(STATUS_VALIDOS).optional(),
  forma_pagamento: z.enum(['DINHEIRO', 'PIX', 'BOLETO', 'CARTAO', 'PARCELADO']).optional().nullable(), // 👈 ENUM
  categoria: z.string().max(100).optional().nullable(),
  centro_custo: z.enum(['OFICINA', 'CAMPO', 'RESGATE', 'MOTOR', 'CAIXA', 'DIFERENCIAL', 'ELETRICA', 'INJECAO', 'BORRACHARIA']).optional().nullable(), // 👈 ENUM
  numero_documento: z.string().max(100).optional().nullable(),
  os_id: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  comprovante_url: z.string().max(500).optional().nullable(),
});

// A16: grava data no meio-dia UTC para evitar deslocamento de fuso (UTC-3)
function parseDateMeioDiaUTC(valor: string | null | undefined): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  const d = new Date(valor);
  if (isNaN(d.getTime())) return undefined;
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

// ============================================================
// GET — Buscar movimentação
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const movimentacaoRaw = await prisma.movimentacaoFinanceira.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: {
        OrdemServico: {
          select: {
            id: true,
            numero: true,
            Cliente: { select: { nome: true } },
          },
        },
        Cliente: {
          select: { id: true, nome: true },
        },
      },
    });

    if (!movimentacaoRaw) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      );
    }

    const movimentacao = {
      ...movimentacaoRaw,
      os: movimentacaoRaw.OrdemServico
        ? {
            id: movimentacaoRaw.OrdemServico.id,
            numero: movimentacaoRaw.OrdemServico.numero,
            cliente: movimentacaoRaw.OrdemServico.Cliente,
          }
        : null,
      cliente: movimentacaoRaw.Cliente,
      OrdemServico: undefined,
      Cliente: undefined,
    };

    return NextResponse.json(movimentacao);
  } catch (error: any) {
    return apiError(error, 'FINANCEIRO', 'Erro ao buscar movimentação');
  }
}

// ============================================================
// PUT — Atualizar movimentação
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawBody = await request.json();

    if (rawBody.valor !== undefined && rawBody.valor !== null) {
      rawBody.valor = Number(rawBody.valor);
    }

    const body = updateFinanceiroSchema.parse(rawBody);

    const antes = await prisma.movimentacaoFinanceira.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    // A09: bloqueia edição de lançamento já PAGO
    if (antes.status === 'PAGO') {
      return NextResponse.json(
        {
          error:
            'Lançamento já pago não pode ser editado. Registre um estorno para corrigir.',
        },
        { status: 400 }
      );
    }

    // A27: bloqueia transição de status para PAGO via PUT.
    if (body.status === 'PAGO' && antes.status !== 'PAGO') {
      log(
        'WARN',
        'FINANCEIRO',
        'Tentativa de baixa via PUT bloqueada (A27)',
        { movimentacaoId: id, statusAnterior: antes.status },
        user?.name
      );
      return NextResponse.json(
        {
          error:
            'Para dar baixa em um lançamento, use o botão "Pagar" da tela de alertas. A edição via PUT não registra a baixa corretamente e desvincula a OS.',
        },
        { status: 400 }
      );
    }

    // M09: valida que os_id e cliente_id pertencem à empresa
    if (body.os_id) {
      const osOk = await prisma.ordemServico.findFirst({
        where: { id: body.os_id, empresa_id: user.empresa_id },
        select: { id: true },
      });
      if (!osOk) {
        return NextResponse.json(
          { error: 'OS vinculada não encontrada nesta empresa' },
          { status: 400 }
        );
      }
    }

    if (body.cliente_id) {
      const clienteOk = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id: user.empresa_id },
        select: { id: true },
      });
      if (!clienteOk) {
        return NextResponse.json(
          { error: 'Cliente vinculado não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    // A17: monta o update só com os campos enviados
    const updateData: any = {};
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.valor !== undefined) updateData.valor = roundDecimal(body.valor);
    if (body.data !== undefined) updateData.data = parseDateMeioDiaUTC(body.data);
    if (body.data_vencimento !== undefined)
      updateData.data_vencimento = parseDateMeioDiaUTC(body.data_vencimento);
    if (body.data_pagamento !== undefined)
      updateData.data_pagamento = parseDateMeioDiaUTC(body.data_pagamento);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.forma_pagamento !== undefined)
      updateData.forma_pagamento = body.forma_pagamento;
    if (body.categoria !== undefined) updateData.categoria = body.categoria;
    if (body.centro_custo !== undefined) updateData.centro_custo = body.centro_custo;
    if (body.numero_documento !== undefined)
      updateData.numero_documento = body.numero_documento;
    if (body.comprovante_url !== undefined)
      updateData.comprovante_url = body.comprovante_url;
    if (body.os_id !== undefined) updateData.os_id = body.os_id || null;
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id || null;

    updateData.updated_by = user?.name || user?.email || 'Sistema';
    updateData.updated_at = new Date();

    // ✅ Redundância de segurança: empresa_id no where
    const movimentacao = await prisma.movimentacaoFinanceira.update({
      where: { 
        id,
        empresa_id: user.empresa_id 
      },
      data: updateData,
    });

    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'EDITAR',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
      dados_depois: movimentacao,
    });

    log('INFO', 'FINANCEIRO', 'Movimentação atualizada', { id }, user?.name);

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(movimentacao);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'FINANCEIRO', 'Erro ao atualizar movimentação');
  }
}

// ============================================================
// DELETE — Excluir movimentação
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.movimentacaoFinanceira.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    // A09: não permite excluir lançamento já PAGO
    if (antes.status === 'PAGO') {
      return NextResponse.json(
        {
          error:
            'Lançamento já pago não pode ser excluído. Registre um estorno para corrigir.',
        },
        { status: 400 }
      );
    }

    // ✅ Redundância de segurança: empresa_id no where
    await prisma.movimentacaoFinanceira.delete({
      where: { 
        id,
        empresa_id: user.empresa_id 
      },
    });

    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'EXCLUIR',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_antes: antes,
    });

    log('INFO', 'FINANCEIRO', 'Movimentação excluída', { id }, user?.name);

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'FINANCEIRO', 'Erro ao excluir movimentação');
  }
}
