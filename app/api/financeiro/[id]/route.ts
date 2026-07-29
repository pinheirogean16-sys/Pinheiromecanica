import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { z } from 'zod';

const updateFinanceiroSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  descricao: z.string().min(3).trim().optional(),
  valor: z.coerce.number().positive().optional(),
  data: z.string().optional().nullable(),
  data_vencimento: z.string().optional().nullable(),
  data_pagamento: z.string().optional().nullable(),
  status: z.string().optional(),
  forma_pagamento: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  centro_custo: z.string().optional().nullable(),
  numero_documento: z.string().optional().nullable(),
  os_id: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  comprovante_url: z.string().optional().nullable(),
});

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
    const movimentacaoRaw = await prisma.movimentacaoFinanceira.findUnique({
      where: { id },
      include: {
        OrdemServico: {
          select: { id: true, numero: true, Cliente: { select: { nome: true } } }
        },
        Cliente: {
          select: { id: true, nome: true }
        }
      }
    });

    if (!movimentacaoRaw) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }

    const movimentacao = {
      ...movimentacaoRaw,
      os: movimentacaoRaw.OrdemServico ? {
        id: movimentacaoRaw.OrdemServico.id,
        numero: movimentacaoRaw.OrdemServico.numero,
        cliente: movimentacaoRaw.OrdemServico.Cliente
      } : null,
      cliente: movimentacaoRaw.Cliente,
      OrdemServico: undefined,
      Cliente: undefined
    };

    // Validar empresa
    if (movimentacao.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json(movimentacao);
  } catch (error) {
    log('ERROR', 'FINANCEIRO', 'Erro ao buscar movimentação', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar movimentação' }, { status: 500 });
  }
}

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

    console.error('[FINANCEIRO UPDATE BODY]');
    console.error(JSON.stringify(rawBody, null, 2));
    console.error('TIPO VALOR:', typeof rawBody.valor);
    console.error('VALOR:', rawBody.valor);

    if (rawBody.valor !== undefined && rawBody.valor !== null) {
      rawBody.valor = Number(rawBody.valor);
    }

    const body = updateFinanceiroSchema.parse(rawBody);

    const antes = await prisma.movimentacaoFinanceira.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    
    const movimentacao = await prisma.movimentacaoFinanceira.update({
      where: { id },
      data: {
        tipo: body.tipo,
        descricao: body.descricao,
        valor: body.valor ? roundDecimal(body.valor) : undefined,
        data: body.data ? new Date(body.data) : undefined,
        data_vencimento: body.data_vencimento ? new Date(body.data_vencimento) : (body.data_vencimento === null ? null : undefined),
        data_pagamento: body.data_pagamento ? new Date(body.data_pagamento) : (body.data_pagamento === null ? null : undefined),
        status: body.status,
        forma_pagamento: body.forma_pagamento,
        categoria: body.categoria,
        centro_custo: body.centro_custo,
        numero_documento: body.numero_documento,
        comprovante_url: body.comprovante_url,
        os_id: body.os_id || null,
        cliente_id: body.cliente_id || null,
        updated_by: user?.name || user?.email || 'Sistema'
      }
    });

    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'EDITAR',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: movimentacao
    });

    log('INFO', 'FINANCEIRO', 'Movimentação atualizada', { id }, user?.name);

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(movimentacao);
  } catch (error) {
    log('ERROR', 'FINANCEIRO', 'Erro ao atualizar movimentação', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar movimentação' }, { status: 500 });
  }
}

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
    const antes = await prisma.movimentacaoFinanceira.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    
    await prisma.movimentacaoFinanceira.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'EXCLUIR',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'FINANCEIRO', 'Movimentação excluída', { id }, user?.name);
    
    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'FINANCEIRO', 'Erro ao excluir movimentação', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir movimentação' }, { status: 500 });
  }
}
