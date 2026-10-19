import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import { limparNotificacoesConta } from '@/lib/notificacoes-financeiras';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para editar financeiro
    if (!checkPermission(user, 'financeiro', 'editar')) {
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
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }

    // ✅ NOVO: idempotência — se já está PAGO, retorna sucesso sem alterar
    if (antes.status === 'PAGO') {
      log('INFO', 'FINANCEIRO', 'Tentativa de baixa em conta já paga (idempotente)', { id }, user?.name);
      return NextResponse.json(antes);
    }

    // ✅ NOVO: redundância de segurança — empresa_id no where
    const movimentacao = await prisma.movimentacaoFinanceira.update({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      data: {
        status: 'PAGO',
        data_pagamento: new Date(),
        updated_by: user?.name || user?.email || 'Sistema',
      },
    });

    // Remove notificações órfãs sobre esta conta
    await limparNotificacoesConta(id);

    // ✅ CORRIGIDO: auditoria com empresa_id
    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'EDITAR',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id, // 👈 Adicionado
      dados_antes: antes,
      dados_depois: movimentacao,
    });

    log('INFO', 'FINANCEIRO', 'Baixa realizada em conta', { id }, user?.name);

    // ✅ NOVO: invalida cache do dashboard
    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(movimentacao);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'FINANCEIRO', 'Erro ao dar baixa em conta');
  }
}
