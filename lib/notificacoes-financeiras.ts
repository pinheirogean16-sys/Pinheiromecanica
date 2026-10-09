import { prisma } from './prisma';
import { notifyAdmins } from './notificacoes';

async function jaNotificada(contaId: string, empresa_id?: string) {
  const vinteQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const where: any = {
    mensagem: { contains: `ID: ${contaId}` },
    created_at: { gte: vinteQuatroHorasAtras }
  };
  if (empresa_id) where.empresa_id = empresa_id;

  const notificacao = await prisma.notificacao.findFirst({
    where
  });
  
  return !!notificacao;
}

export async function limparNotificacoesConta(contaId: string, empresa_id?: string) {
  try {
    const where: any = {
      mensagem: { contains: `ID: ${contaId}` }
    };
    if (empresa_id) where.empresa_id = empresa_id;

    await prisma.notificacao.deleteMany({
      where
    });
  } catch (error) {
    console.error('Erro ao limpar notificações da conta:', error);
  }
}

export async function verificarContasAtrasadas(empresa_id?: string) {
  if (!empresa_id || empresa_id === 'default') return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const where: any = {
    empresa_id,
    status: { in: ['PENDENTE', 'ATRASADO'] },
    data_vencimento: { lt: hoje }
  };

  // Buscar contas pendentes com vencimento menor que hoje
  const contasVencidas = await prisma.movimentacaoFinanceira.findMany({
    where,
    select: { 
      id: true, 
      descricao: true, 
      valor: true, 
      data_vencimento: true, 
      empresa_id: true,
      tipo: true,
      status: true
    }
  });

  if (contasVencidas.length === 0) return;

  let notificacoesCriadas = 0;

  for (const conta of contasVencidas) {
    // Atualizar status para ATRASADO se ainda for PENDENTE
    if (conta.status === 'PENDENTE') {
      await prisma.movimentacaoFinanceira.update({
        where: { id: conta.id },
        data: { status: 'ATRASADO' }
      });
    }
    
    // Verificar se já foi notificada nas últimas 24h
    if (!(await jaNotificada(conta.id, conta.empresa_id))) {
      await notifyAdmins(
        '⚠️ Conta em Atraso',
        `A conta "${conta.descricao}" venceu em ${conta.data_vencimento ? new Date(conta.data_vencimento).toLocaleDateString() : 'sem data'}. Valor: ${Number(conta.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. [ID: ${conta.id}]`,
        '/financeiro/alertas',
        conta.empresa_id
      );
      notificacoesCriadas++;
    }
  }
  
  return { 
    contasVencidas: contasVencidas.length, 
    notificacoesCriadas
  };
}

export async function verificarContasAVencer(diasAntes: number = 3, empresa_id?: string) {
  if (!empresa_id || empresa_id === 'default') return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const limite = new Date();
  limite.setDate(hoje.getDate() + diasAntes);
  limite.setHours(23, 59, 59, 999);
  
  const where: any = {
    empresa_id,
    status: 'PENDENTE',
    data_vencimento: { 
      gte: hoje, 
      lte: limite 
    }
  };

  const contasProximas = await prisma.movimentacaoFinanceira.findMany({
    where,
    select: {
      id: true,
      descricao: true,
      valor: true,
      data_vencimento: true,
      empresa_id: true,
      tipo: true
    }
  });

  if (contasProximas.length === 0) return;

  let notificacoesCriadas = 0;

  for (const conta of contasProximas) {
    if (!(await jaNotificada(conta.id, conta.empresa_id))) {
      await notifyAdmins(
        '⏳ Conta a Vencer',
        `A conta "${conta.descricao}" vence em ${conta.data_vencimento ? new Date(conta.data_vencimento).toLocaleDateString() : 'sem data'}. Valor: ${Number(conta.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. [ID: ${conta.id}]`,
        '/financeiro/alertas',
        conta.empresa_id
      );
      notificacoesCriadas++;
    }
  }

  return {
    contasProximas: contasProximas.length,
    notificacoesCriadas
  };
}
