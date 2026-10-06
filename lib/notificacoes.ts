import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function createNotification(
  titulo: string, 
  mensagem: string, 
  usuario_id: string, 
  link?: string,
  empresa_id?: string
) {
  try {
    let resolvedEmpresaId = empresa_id;
    if (!resolvedEmpresaId) {
      const u = await prisma.user.findUnique({ where: { id: usuario_id }, select: { empresa_id: true } });
      resolvedEmpresaId = u?.empresa_id;
    }

    if (!resolvedEmpresaId || resolvedEmpresaId === 'default') {
      return null;
    }

    return await prisma.notificacao.create({
      data: {
        id: randomUUID(),
        titulo,
        mensagem,
        usuario_id,
        empresa_id: resolvedEmpresaId,
        link
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return null;
  }
}

export async function notifyAdmins(titulo: string, mensagem: string, link?: string, empresa_id?: string) {
  try {
    if (!empresa_id || empresa_id === 'default') {
      return null;
    }

    const where: any = { role: 'ADMIN', empresa_id };

    const admins = await prisma.user.findMany({
      where,
      select: { id: true, empresa_id: true }
    });

    const createPromises = admins.map(admin => 
      prisma.notificacao.create({
        data: {
          id: randomUUID(),
          titulo,
          mensagem,
          usuario_id: admin.id,
          empresa_id: admin.empresa_id,
          link
        }
      })
    );

    return await Promise.all(createPromises);
  } catch (error) {
    console.error('Erro ao notificar admins:', error);
    return null;
  }
}

export async function notifyAdminsAndLeaders(titulo: string, mensagem: string, link?: string, empresa_id?: string) {
  try {
    if (!empresa_id || empresa_id === 'default') {
      return null;
    }

    const where: any = { 
      role: { in: ['ADMIN', 'LIDER'] },
      empresa_id
    };

    const users = await prisma.user.findMany({
      where,
      select: { id: true, empresa_id: true }
    });

    const createPromises = users.map(user => 
      prisma.notificacao.create({
        data: {
          id: randomUUID(),
          titulo,
          mensagem,
          usuario_id: user.id,
          empresa_id: user.empresa_id,
          link
        }
      })
    );

    return await Promise.all(createPromises);
  } catch (error) {
    console.error('Erro ao notificar admins e líderes:', error);
    return null;
  }
}

export async function notificarNovaOS(os: any) {
  try {
    const osPopulated = await prisma.ordemServico.findUnique({
      where: { id: os.id },
      include: { Cliente: { select: { nome: true } } }
    });
    
    return await notifyAdminsAndLeaders(
      'Nova Ordem de Serviço',
      `A OS #${osPopulated?.numero} foi aberta para o cliente ${osPopulated?.Cliente?.nome || 'Não Identificado'}.`,
      `/os/${os.id}`,
      osPopulated?.empresa_id
    );
  } catch (error) {
    console.error('Error in notificarNovaOS:', error);
  }
}

export async function notificarOSFinalizada(os: any) {
  try {
    const osPopulated = await prisma.ordemServico.findUnique({
      where: { id: os.id },
      include: { Cliente: { select: { nome: true } } }
    });

    // Notificar admins da empresa da OS
    await notifyAdmins(
      'OS Finalizada',
      `A OS #${osPopulated?.numero} do cliente ${osPopulated?.Cliente?.nome || 'Não Identificado'} foi finalizada.`,
      `/os/${os.id}`,
      osPopulated?.empresa_id
    );

    // Notificar sobre movimentação financeira
    await notifyAdmins(
      'Nova Movimentação Financeira',
      `Entrada gerada automaticamente pela finalização da OS #${osPopulated?.numero}. Valor: R$ ${osPopulated?.valor_total.toFixed(2)}`,
      `/financeiro`,
      osPopulated?.empresa_id
    );
  } catch (error) {
    console.error('Error in notificarOSFinalizada:', error);
  }
}

export async function notificarChecklistExecutado(execucao: any) {
  try {
    const checklist = await prisma.checklist.findUnique({
      where: { id: execucao.checklist_id },
      select: { nome: true }
    });
    
    return await notifyAdmins(
      'Checklist Executado',
      `O checklist "${checklist?.nome}" foi executado por ${execucao.executado_por}.`,
      `/checklist/resultado/${execucao.id}`,
      execucao.empresa_id
    );
  } catch (error) {
    console.error('Error in notificarChecklistExecutado:', error);
  }
}

export async function notificarEstoqueBaixo(peca: any) {
  try {
    const targetUsers = await prisma.user.findMany({
      where: { 
        role: { in: ['ADMIN', 'LIDER', 'ESTOQUISTA'] },
        empresa_id: peca.empresa_id
      },
      select: { id: true, empresa_id: true }
    });

    const createPromises = targetUsers.map(user => 
      prisma.notificacao.create({
        data: {
          id: randomUUID(),
          titulo: 'Estoque Baixo',
          mensagem: `O item ${peca.descricao} atingiu o nível crítico (${peca.quantidade} un).`,
          usuario_id: user.id,
          empresa_id: user.empresa_id,
          link: `/estoque/${peca.id}/editar`
        }
      })
    );

    return await Promise.all(createPromises);
  } catch (error) {
    console.error('Erro ao notificar estoque baixo:', error);
    return null;
  }
}

export async function notificarMovimentacaoFinanceira(mov: any) {
  return await notifyAdmins(
    'Nova Movimentação Financeira',
    `${mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de R$ ${mov.valor.toFixed(2)} registrada: ${mov.descricao}`,
    `/financeiro`,
    mov.empresa_id
  );
}
