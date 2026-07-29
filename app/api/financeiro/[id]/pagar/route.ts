import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { limparNotificacoesConta } from '@/lib/notificacoes-financeiras';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const antes = await prisma.movimentacaoFinanceira.findUnique({ where: { id } });
    
    if (!antes) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }

    // Validar empresa
    if (antes.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const movimentacao = await prisma.movimentacaoFinanceira.update({
      where: { id },
      data: {
        status: 'PAGO',
        data_pagamento: new Date(),
        updated_by: user?.name || user?.email || 'Sistema'
      }
    });

    // Remover notificações órfãs sobre esta conta
    await limparNotificacoesConta(id);

    await createAuditLog({
      modulo: 'FINANCEIRO',
      acao: 'EDITAR',
      entidade: 'MovimentacaoFinanceira',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: { status: 'PAGO', data_pagamento: new Date() }
    });

    log('INFO', 'FINANCEIRO', 'Baixa realizada em conta', { id }, user?.name);

    return NextResponse.json(movimentacao);
  } catch (error) {
    log('ERROR', 'FINANCEIRO', 'Erro ao dar baixa em conta', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao dar baixa em conta' }, { status: 500 });
  }
}
