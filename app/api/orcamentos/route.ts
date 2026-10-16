import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';
import { Orcamento_status as StatusOrcamento } from '@prisma/client';

// A19: status como enum restrito
const STATUS_CRIACAO_VALIDOS = ['RASCUNHO'] as const;

const orcamentoSchema = z.object({
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  data_validade: z.string().optional().nullable(),
  // A19: só RASCUNHO na criação — status segue fluxo controlado
  status: z.enum(STATUS_CRIACAO_VALIDOS).optional().default('RASCUNHO'),
  servicos: z.array(z.object({
    descricao: z.string().min(1, 'Descrição do serviço é obrigatória').trim(),
    horas: z.number().nonnegative().default(0),
    valor_hora: z.number().nonnegative().default(0),
  })).optional().default([]),
  pecas: z.array(z.object({
    peca_id: z.string().optional().nullable(),
    descricao: z.string().min(1, 'Descrição da peça é obrigatória').trim(),
    quantidade: z.number().nonnegative().default(0),
    valor_unit: z.number().nonnegative().default(0),
  })).optional().default([]),
  desconto: z.number().nonnegative().default(0),
  observacoes: z.string().max(2000).optional().nullable().transform(v => v?.trim() || null),
  termos_condicoes: z.string().max(2000).optional().nullable().transform(v => v?.trim() || null),
});

// ============================================================
// A19: gerar próximo número sequencial por empresa/ano
// Usa max(numero) em vez de count() — nunca reaproveita número
// ============================================================
async function obterProximoNumeroOrcamento(tx: any, empresaId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefixo = `ORC-${year}-`;

  const ultimo = await tx.orcamento.findFirst({
    where: {
      empresa_id: empresaId,
      numero: { startsWith: prefixo },
    },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });

  let proximoSeq = 1;
  if (ultimo?.numero) {
    const partes = ultimo.numero.split('-');
    const seq = parseInt(partes[partes.length - 1], 10);
    if (!isNaN(seq)) proximoSeq = seq + 1;
  }

  return `${prefixo}${proximoSeq.toString().padStart(4, '0')}`;
}

// ============================================================
// GET — Listar orçamentos
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamentos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').slice(0, 100);
    const status = searchParams.get('status');
    const cliente_id = searchParams.get('cliente_id');

    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 100);

    const where: any = {
      empresa_id: user.empresa_id,
    };

    if (q) {
      where.OR = [
        { numero: { contains: q } },
        { Cliente: { nome: { contains: q } } },
        { Veiculo: { placa: { contains: q } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (cliente_id) {
      where.cliente_id = cliente_id;
    }

    const [items, total] = await Promise.all([
      prisma.orcamento.findMany({
        where,
        include: {
          Cliente: {
            select: {
              id: true,
              nome: true,
              cpf_cnpj: true,
              endereco: true,
              cidade: true,
              estado: true,
              uf: true,
              telefone: true,
              email: true,
            },
          },
          Veiculo: {
            select: {
              id: true,
              placa: true,
              modelo: true,
              marca: true,
              horimetro_atual: true,
              quilometragem: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.orcamento.count({ where }),
    ]);

    const mappedItems = items.map((item: any) => {
      const { Cliente, Veiculo, ...rest } = item;
      return {
        ...rest,
        Cliente,
        Veiculo,
        cliente: Cliente,
        veiculo: Veiculo,
      };
    });

    return NextResponse.json({
      items: mappedItems,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    // B05: erro explícito em vez de lista vazia
    log(
      'ERROR',
      'ORCAMENTO',
      'Erro ao listar orçamentos',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json({ error: 'Erro ao listar orçamentos' }, { status: 500 });
  }
}

// ============================================================
// POST — Criar orçamento
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamentos', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = orcamentoSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    // Validação explícita de cliente
    if (!body.cliente_id || typeof body.cliente_id !== 'string' || body.cliente_id.trim() === '') {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
    }
    const clienteExistente = await prisma.cliente.findFirst({
      where: { id: body.cliente_id, empresa_id },
      select: { id: true },
    });
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente não encontrado nesta empresa' }, { status: 400 });
    }

    // Validação explícita de veículo
    if (!body.veiculo_id || typeof body.veiculo_id !== 'string' || body.veiculo_id.trim() === '') {
      return NextResponse.json({ error: 'Veículo é obrigatório' }, { status: 400 });
    }
    const veiculoExistente = await prisma.veiculo.findFirst({
      where: { id: body.veiculo_id, empresa_id },
      select: { id: true },
    });
    if (!veiculoExistente) {
      return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 400 });
    }

    // A19: validação de peça_id por empresa (evita injetar peça de outra oficina)
    if (body.pecas && body.pecas.length > 0) {
      const pecaIds = body.pecas
        .map((p) => p.peca_id)
        .filter((pid): pid is string => typeof pid === 'string' && pid.trim() !== '');

      if (pecaIds.length > 0) {
        const pecasValidas = await prisma.peca.findMany({
          where: { id: { in: pecaIds }, empresa_id },
          select: { id: true },
        });
        const idsValidos = new Set(pecasValidas.map((p) => p.id));
        for (const pid of pecaIds) {
          if (!idsValidos.has(pid)) {
            return NextResponse.json(
              { error: 'Peça vinculada não encontrada nesta empresa' },
              { status: 400 }
            );
          }
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // A19: número sequencial por empresa/ano (nunca reaproveita)
      const numero = await obterProximoNumeroOrcamento(tx, empresa_id);

      // A19: recalcular totais no servidor
      const valor_servicos = roundDecimal(
        body.servicos.reduce((acc, s) => acc + (s.horas || 0) * (s.valor_hora || 0), 0)
      );
      const valor_pecas = roundDecimal(
        body.pecas.reduce((acc, p) => acc + (p.quantidade || 0) * (p.valor_unit || 0), 0)
      );
      const valor_total = roundDecimal(valor_servicos + valor_pecas - (body.desconto || 0));

      const orcamentoId = globalThis.crypto.randomUUID();

      const orcamento = await tx.orcamento.create({
        data: {
          id: orcamentoId,
          empresa_id,
          numero,
          cliente_id: body.cliente_id,
          veiculo_id: body.veiculo_id,
          data_validade: body.data_validade ? new Date(body.data_validade) : null,
          status: 'RASCUNHO',
          desconto: roundDecimal(body.desconto),
          valor_servicos,
          valor_pecas,
          valor_total,
          observacoes: body.observacoes,
          termos_condicoes: body.termos_condicoes,
          created_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date(),
        },
      });

      if (body.servicos.length > 0) {
        await tx.orcamentoServico.createMany({
          data: body.servicos.map((s) => {
            const horas = s.horas || 0;
            const valorHora = s.valor_hora || 0;
            const valorTotal = roundDecimal(horas * valorHora);
            return {
              id: globalThis.crypto.randomUUID(),
              orcamento_id: orcamentoId,
              descricao: s.descricao,
              horas,
              valor_hora: roundDecimal(valorHora),
              valor_total: valorTotal,
            };
          }),
        });
      }

      if (body.pecas.length > 0) {
        await tx.orcamentoPeca.createMany({
          data: body.pecas.map((p) => {
            const quant = p.quantidade || 0;
            const unit = p.valor_unit || 0;
            const total = roundDecimal(quant * unit);
            return {
              id: globalThis.crypto.randomUUID(),
              orcamento_id: orcamentoId,
              peca_id: p.peca_id || null,
              descricao: p.descricao,
              quantidade: quant,
              valor_unit: roundDecimal(unit),
              valor_total: total,
            };
          }),
        });
      }

      await tx.eventoAgenda.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          empresa_id,
          titulo: `Orçamento Criado: ${orcamento.numero}`,
          descricao: 'Novo orçamento gerado para o cliente.',
          data_inicio: new Date(),
          data_fim: new Date(Date.now() + 3600000),
          tipo: 'OUTRO',
          status: 'AGENDADO',
          cliente_id: orcamento.cliente_id,
          veiculo_id: orcamento.veiculo_id,
          usuario_id: user?.id || user?.email || 'Sistema',
          updated_at: new Date(),
        },
      });

      return orcamento;
    });

    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'CRIAR',
      entidade: 'Orcamento',
      entidade_id: result.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id,
      dados_depois: result,
    });

    log(
      'INFO',
      'ORCAMENTO',
      'Orçamento criado',
      { id: result.id, numero: result.numero },
      user?.name
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    log(
      'ERROR',
      'ORCAMENTO',
      'Erro ao criar orçamento',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json(
      { error: error.message || 'Erro ao criar orçamento' },
      { status: 500 }
    );
  }
}
