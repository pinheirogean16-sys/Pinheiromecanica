import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';

const orcamentoSchema = z.object({
  cliente_id: z.string().min(1).optional(),
  veiculo_id: z.string().optional().nullable(),
  data_validade: z.string().optional().nullable(),
  status: z.string().optional(),
  servicos: z.array(z.object({
    descricao: z.string().min(1).trim(),
    horas: z.number().nonnegative(),
    valor_hora: z.number().nonnegative(),
    valor_total: z.number().nonnegative().optional()
  })).optional(),
  pecas: z.array(z.object({
    peca_id: z.string().optional().nullable(),
    descricao: z.string().min(1).trim(),
    quantidade: z.number().int().nonnegative(),
    valor_unit: z.number().nonnegative(),
    valor_total: z.number().nonnegative().optional()
  })).optional(),
  desconto: z.number().min(0).optional(),
  valor_servicos: z.number().min(0).optional(),
  valor_pecas: z.number().min(0).optional(),
  valor_total: z.number().min(0).optional(),
  observacoes: z.string().optional().nullable().transform(v => v?.trim() || null),
  termos_condicoes: z.string().optional().nullable().transform(v => v?.trim() || null),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamentos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const rawOrcamento = await prisma.orcamento.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: {
        Cliente: true,
        Veiculo: true,
        OrcamentoServico: true,
        OrcamentoPeca: true,
      }
    });

    if (!rawOrcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    const { Cliente, Veiculo, OrcamentoServico, OrcamentoPeca, ...rest } = rawOrcamento;
    const orcamento = {
      ...rest,
      cliente: Cliente,
      veiculo: Veiculo,
      servicos: OrcamentoServico,
      pecas: OrcamentoPeca,
    };

    return NextResponse.json(orcamento);
  } catch (error) {
    log('ERROR', 'ORCAMENTO', 'Erro ao buscar orçamento', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamento', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = orcamentoSchema.parse(await request.json());

    const rawAntes = await prisma.orcamento.findFirst({
      where: { 
        id,
        empresa_id: user.empresa_id
      },
      include: { OrcamentoServico: true, OrcamentoPeca: true }
    });
    if (!rawAntes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const { OrcamentoServico, OrcamentoPeca, ...antesRest } = rawAntes;
    const antes = {
      ...antesRest,
      servicos: OrcamentoServico,
      pecas: OrcamentoPeca
    };

    if (body.cliente_id) {
      const clienteOk = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id: user.empresa_id }
      });
      if (!clienteOk) {
        return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
      }
    }

    if (body.veiculo_id) {
      const veiculoOk = await prisma.veiculo.findFirst({
        where: { id: body.veiculo_id, empresa_id: user.empresa_id }
      });
      if (!veiculoOk) {
        return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Remover itens antigos se servicos ou pecas foram enviados
      if (body.servicos) await tx.orcamentoServico.deleteMany({ where: { orcamento_id: id } });
      if (body.pecas) await tx.orcamentoPeca.deleteMany({ where: { orcamento_id: id } });

      // Atualizar info principal
      const orcamento = await tx.orcamento.update({
        where: { id },
        data: {
          cliente_id: body.cliente_id,
          veiculo_id: body.veiculo_id,
          data_validade: body.data_validade ? new Date(body.data_validade) : undefined,
          status: body.status as any,
          desconto: body.desconto !== undefined ? roundDecimal(body.desconto) : undefined,
          valor_servicos: body.valor_servicos !== undefined ? roundDecimal(body.valor_servicos) : undefined,
          valor_pecas: body.valor_pecas !== undefined ? roundDecimal(body.valor_pecas) : undefined,
          valor_total: body.valor_total !== undefined ? roundDecimal(body.valor_total) : undefined,
          observacoes: body.observacoes,
          termos_condicoes: body.termos_condicoes,
          updated_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date(),
        }
      });

      // Recriar itens
      if (body.servicos && body.servicos.length > 0) {
        await tx.orcamentoServico.createMany({
          data: body.servicos.map(s => {
            const h = s.horas || 0;
            const vh = s.valor_hora || 0;
            const vt = s.valor_total ?? roundDecimal(h * vh);
            return {
              id: globalThis.crypto.randomUUID(),
              orcamento_id: orcamento.id,
              descricao: s.descricao,
              horas: h,
              valor_hora: roundDecimal(vh),
              valor_total: roundDecimal(vt),
            };
          })
        });
      }

      if (body.pecas && body.pecas.length > 0) {
        await tx.orcamentoPeca.createMany({
          data: body.pecas.map(p => {
            const q = p.quantidade || 0;
            const vu = p.valor_unit || 0;
            const vt = p.valor_total ?? roundDecimal(q * vu);
            return {
              id: globalThis.crypto.randomUUID(),
              orcamento_id: orcamento.id,
              peca_id: p.peca_id,
              descricao: p.descricao,
              quantidade: q,
              valor_unit: roundDecimal(vu),
              valor_total: roundDecimal(vt),
            };
          })
        });
      }

      return orcamento;
    });

    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'EDITAR',
      entidade: 'Orcamento',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes,
      dados_depois: result
    });

    log('INFO', 'ORCAMENTO', 'Orçamento atualizado', { id }, user?.name);

    return NextResponse.json(result);
  } catch (error: any) {
    log('ERROR', 'ORCAMENTO', 'Erro ao atualizar orçamento', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Erro ao atualizar orçamento' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamento', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.orcamento.findFirst({ 
      where: { 
        id,
        empresa_id: user.empresa_id 
      } 
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    await prisma.orcamento.delete({
      where: { id }
    });

    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'EXCLUIR',
      entidade: 'Orcamento',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_antes: antes
    });

    log('INFO', 'ORCAMENTO', 'Orçamento excluído', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    log('ERROR', 'ORCAMENTO', 'Erro ao excluir orçamento', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
}
