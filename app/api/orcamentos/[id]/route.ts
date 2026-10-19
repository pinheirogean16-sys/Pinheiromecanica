import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { apiError } from '@/lib/api-error';
import { roundDecimal } from '@/lib/utils';

// ============================================================
// CONSTANTES
// ============================================================
const STATUS_ORCAMENTO = [
  'RASCUNHO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'CONVERTIDO',
] as const;

const MAX_ITENS = 100;

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const orcamentoSchema = z.object({
  cliente_id: z.string().min(1).optional(),
  veiculo_id: z.string().optional().nullable(),
  data_validade: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de validade inválida' }
  ),
  status: z.enum(STATUS_ORCAMENTO).optional(),
  servicos: z.array(z.object({
    descricao: z.string().min(1).max(500).trim(),
    horas: z.number().nonnegative(),
    valor_hora: z.number().nonnegative(),
    // valor_total é IGNORADO — recalculado no servidor
  })).max(MAX_ITENS, `Máximo de ${MAX_ITENS} serviços`).optional(),
  pecas: z.array(z.object({
    peca_id: z.string().optional().nullable(),
    descricao: z.string().min(1).max(500).trim(),
    quantidade: z.number().int().nonnegative(),
    valor_unit: z.number().nonnegative(),
    // valor_total é IGNORADO — recalculado no servidor
  })).max(MAX_ITENS, `Máximo de ${MAX_ITENS} peças`).optional(),
  desconto: z.number().min(0).optional(),
  observacoes: z.string().max(2000).optional().nullable().transform(v => v?.trim() || null),
  termos_condicoes: z.string().max(2000).optional().nullable().transform(v => v?.trim() || null),
});

// ============================================================
// GET — Buscar orçamento por ID
// ============================================================
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
        empresa_id: user.empresa_id,
      },
      include: {
        Cliente: true,
        Veiculo: true,
        OrcamentoServico: true,
        OrcamentoPeca: true,
      },
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
  } catch (error: any) {
    return apiError(error, 'ORCAMENTO', 'Erro ao buscar orçamento');
  }
}

// ============================================================
// PUT — Atualizar orçamento
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ CORRIGIDO: 'orcamentos' (plural)
    if (!checkPermission(user, 'orcamentos', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const body = orcamentoSchema.parse(await request.json());

    const rawAntes = await prisma.orcamento.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: { OrcamentoServico: true, OrcamentoPeca: true },
    });
    if (!rawAntes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const { OrcamentoServico, OrcamentoPeca, ...antesRest } = rawAntes;
    const antes = {
      ...antesRest,
      servicos: OrcamentoServico,
      pecas: OrcamentoPeca,
    };

    // Valida cliente
    if (body.cliente_id) {
      const clienteOk = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id: user.empresa_id },
        select: { id: true },
      });
      if (!clienteOk) {
        return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
      }
    }

    // Valida veículo
    if (body.veiculo_id) {
      const veiculoOk = await prisma.veiculo.findFirst({
        where: { id: body.veiculo_id, empresa_id: user.empresa_id },
        select: { id: true },
      });
      if (!veiculoOk) {
        return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 400 });
      }
    }

    // ✅ NOVO: valida que todas as peças (se informadas) pertencem à empresa
    if (body.pecas && body.pecas.length > 0) {
      const pecaIds = body.pecas
        .map((p) => p.peca_id)
        .filter((id): id is string => !!id);

      if (pecaIds.length > 0) {
        const pecasValidas = await prisma.peca.findMany({
          where: { id: { in: pecaIds }, empresa_id: user.empresa_id },
          select: { id: true },
        });

        if (pecasValidas.length !== pecaIds.length) {
          return NextResponse.json(
            { error: 'Uma ou mais peças informadas não pertencem a esta empresa' },
            { status: 400 }
          );
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Remover itens antigos se servicos ou pecas foram enviados
      if (body.servicos) await tx.orcamentoServico.deleteMany({ where: { orcamento_id: id } });
      if (body.pecas) await tx.orcamentoPeca.deleteMany({ where: { orcamento_id: id } });

      // ✅ NOVO: recalcula totais a partir dos itens (não confia no cliente)
      let valor_servicos: number | undefined = undefined;
      let valor_pecas: number | undefined = undefined;

      if (body.servicos) {
        valor_servicos = roundDecimal(
          body.servicos.reduce((acc, s) => acc + (s.horas || 0) * (s.valor_hora || 0), 0)
        );
      }

      if (body.pecas) {
        valor_pecas = roundDecimal(
          body.pecas.reduce((acc, p) => acc + (p.quantidade || 0) * (p.valor_unit || 0), 0)
        );
      }

      // Calcula total final
      const baseServ = valor_servicos ?? Number(antes.valor_servicos || 0);
      const basePec = valor_pecas ?? Number(antes.valor_pecas || 0);
      const descontoFinal = body.desconto !== undefined ? roundDecimal(body.desconto) : Number(antes.desconto || 0);
      const valor_total = roundDecimal(Math.max(0, baseServ + basePec - descontoFinal));

      // Atualizar info principal
      const orcamento = await tx.orcamento.update({
        where: {
          id,
          empresa_id: user.empresa_id, // ✅ Redundância de segurança
        },
        data: {
          cliente_id: body.cliente_id,
          veiculo_id: body.veiculo_id,
          data_validade: body.data_validade ? new Date(body.data_validade) : undefined,
          status: body.status,
          desconto: body.desconto !== undefined ? roundDecimal(body.desconto) : undefined,
          valor_servicos,
          valor_pecas,
          valor_total,
          observacoes: body.observacoes,
          termos_condicoes: body.termos_condicoes,
          updated_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date(),
        },
      });

      // Recriar itens
      if (body.servicos && body.servicos.length > 0) {
        await tx.orcamentoServico.createMany({
          data: body.servicos.map((s) => ({
            id: globalThis.crypto.randomUUID(),
            orcamento_id: orcamento.id,
            descricao: s.descricao,
            horas: s.horas || 0,
            valor_hora: roundDecimal(s.valor_hora || 0),
            valor_total: roundDecimal((s.horas || 0) * (s.valor_hora || 0)),
          })),
        });
      }

      if (body.pecas && body.pecas.length > 0) {
        await tx.orcamentoPeca.createMany({
          data: body.pecas.map((p) => ({
            id: globalThis.crypto.randomUUID(),
            orcamento_id: orcamento.id,
            peca_id: p.peca_id || null,
            descricao: p.descricao,
            quantidade: p.quantidade || 0,
            valor_unit: roundDecimal(p.valor_unit || 0),
            valor_total: roundDecimal((p.quantidade || 0) * (p.valor_unit || 0)),
          })),
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
      empresa_id: user.empresa_id, // ✅ Adicionado
      dados_antes: antes,
      dados_depois: result,
    });

    log('INFO', 'ORCAMENTO', 'Orçamento atualizado', { id }, user?.name);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    // ✅ Não vaza error.message
    return apiError(error, 'ORCAMENTO', 'Erro ao atualizar orçamento');
  }
}

// ============================================================
// DELETE — Excluir orçamento
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ CORRIGIDO: 'orcamentos' (plural)
    if (!checkPermission(user, 'orcamentos', 'excluir')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;
    const antes = await prisma.orcamento.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });
    if (!antes) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // ✅ Redundância de segurança: empresa_id no where
    await prisma.orcamento.delete({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
    });

    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'EXCLUIR',
      entidade: 'Orcamento',
      entidade_id: id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id, // ✅ Adicionado
      dados_antes: antes,
    });

    log('INFO', 'ORCAMENTO', 'Orçamento excluído', { id }, user?.name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return apiError(error, 'ORCAMENTO', 'Erro ao excluir orçamento');
  }
}
