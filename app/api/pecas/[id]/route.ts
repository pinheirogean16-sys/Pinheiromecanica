import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Peca_categoria } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { notificarEstoqueBaixo } from '@/lib/notificacoes';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';

const updatePecaSchema = z.object({
  codigo: z.string().min(2).trim().optional(),
  descricao: z.string().min(3).trim().optional(),
  fabricante: z.string().optional().nullable(),
  categoria: z.nativeEnum(Peca_categoria).optional(),
  quantidade: z.number().min(0).optional(),
  estoque_minimo: z.number().min(0).optional(),
  localizacao: z.string().optional().nullable(),
  preco_custo: z.number().nonnegative().optional(),
  preco_venda: z.number().nonnegative().optional(),
  unidadeMedida: z.string().optional(),
  unidadeCompra: z.string().optional(),
  fatorConversao: z.number().min(0.0001).optional(),
  permiteFracionado: z.boolean().optional()
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawPeca = await prisma.peca.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: {
        PecaAplicada: {
          include: {
            OrdemServico: {
              include: {
                Cliente: true,
                Veiculo: true
              }
            }
          },
          orderBy: { OrdemServico: { created_at: 'desc' } },
          take: 10
        }
      }
    });

    if (!rawPeca) {
      return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
    }

    // Validar empresa
    if (rawPeca.empresa_id !== (user?.empresa_id || 'default') && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { PecaAplicada, ...rest } = rawPeca;
    const peca = {
      ...rest,
      aplicacoes: PecaAplicada.map(pa => {
        const { OrdemServico, ...paRest } = pa;
        return {
          ...paRest,
          os: OrdemServico ? {
            ...OrdemServico,
            cliente: OrdemServico.Cliente,
            veiculo: OrdemServico.Veiculo
          } : null
        };
      })
    };

    return NextResponse.json(peca);
  } catch (error) {
    log('ERROR', 'PECA', 'Erro ao buscar peça', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar peça' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'peca', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const data = updatePecaSchema.parse(await request.json());
    
    const antes = await prisma.peca.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const empresa_id = user.empresa_id;

    if (data.codigo) {
      const existing = await prisma.peca.findFirst({
        where: { 
          codigo: data.codigo,
          empresa_id: empresa_id,
          NOT: { id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'Código de peça já cadastrado em outro item' }, { status: 400 });
      }
    }

    const peca = await prisma.peca.update({
      where: { id },
      data: {
        ...data,
        preco_custo: data.preco_custo !== undefined ? roundDecimal(data.preco_custo) : undefined,
        preco_venda: data.preco_venda !== undefined ? roundDecimal(data.preco_venda) : undefined,
        updated_by: user?.name || user?.email || 'Sistema'
      }
    });

    if (peca.quantidade <= peca.estoque_minimo) {
      try {
        await notificarEstoqueBaixo(peca);
      } catch (err) {
        console.error('Erro ao notificar estoque baixo:', err);
      }
    }

    await createAuditLog({
      modulo: 'PECA',
      acao: 'EDITAR',
      entidade: 'Peca',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: peca
    });

    log('INFO', 'PECA', 'Peça atualizada', { id }, user?.name);

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(peca);
  } catch (error) {
    log('ERROR', 'PECA', 'Erro ao atualizar peça', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar peça' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'peca', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.peca.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    
    await prisma.peca.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'PECA',
      acao: 'EXCLUIR',
      entidade: 'Peca',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'PECA', 'Peça excluída', { id }, user?.name);
    
    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'PECA', 'Erro ao excluir peça', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir peça. Verifique se não está vinculada a OS.' }, { status: 500 });
  }
}
