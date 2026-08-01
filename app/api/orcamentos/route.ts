import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';

const orcamentoSchema = z.object({
  cliente_id: z.string().min(1),
  veiculo_id: z.string().optional().nullable(),
  data_validade: z.string().optional().nullable(),
  status: z.string().optional().default('RASCUNHO'),
  servicos: z.array(z.object({
    descricao: z.string().min(1).trim(),
    horas: z.number().nonnegative().default(0),
    valor_hora: z.number().nonnegative().default(0),
    valor_total: z.number().nonnegative().optional()
  })).optional().default([]),
  pecas: z.array(z.object({
    peca_id: z.string().optional().nullable(),
    descricao: z.string().min(1).trim(),
    quantidade: z.number().int().nonnegative().default(0),
    valor_unit: z.number().nonnegative().default(0),
    valor_total: z.number().nonnegative().optional()
  })).optional().default([]),
  desconto: z.number().min(0).default(0),
  valor_servicos: z.number().min(0).default(0),
  valor_pecas: z.number().min(0).default(0),
  valor_total: z.number().min(0).default(0),
  observacoes: z.string().optional().nullable().transform(v => v?.trim() || null),
  termos_condicoes: z.string().optional().nullable().transform(v => v?.trim() || null),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamentos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const cliente_id = searchParams.get('cliente_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {
      empresa_id: user?.empresa_id || 'default'
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
          Cliente: { select: { id: true, nome: true, cpf_cnpj: true, endereco: true, cidade: true, estado: true, uf: true, telefone: true, email: true } },
          Veiculo: { select: { id: true, placa: true, modelo: true, marca: true, horimetro_atual: true, quilometragem: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.orcamento.count({ where }),
    ]);

    if (items.length > 0) {
      console.log('[ORCAMENTO RESULT]', JSON.stringify(items[0], null, 2));
    }

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
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('[ORCAMENTO LIST ERROR]', error);
    log('ERROR', 'ORCAMENTO', 'Erro ao listar orçamentos', { error }, 'sistema');
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  let body: any = null;
  let prismaData: any = null;
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'orcamento', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    body = orcamentoSchema.parse(await request.json());
    
    const empresa_id = user?.empresa_id || 'default';

    const result = await prisma.$transaction(async (tx) => {
      // Gerar número sequencial
      const now = new Date();
      const year = now.getFullYear();
      const count = await tx.orcamento.count({
        where: {
          empresa_id,
          created_at: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          }
        }
      });
      const numero = `ORC-${year}-${(count + 1).toString().padStart(4, '0')}`;

      const data = {
        id: globalThis.crypto.randomUUID(),
        empresa_id,
        numero,
        cliente_id: body.cliente_id,
        veiculo_id: body.veiculo_id,
        data_validade: body.data_validade ? new Date(body.data_validade) : null,
        status: body.status as any,
        desconto: roundDecimal(body.desconto),
        valor_servicos: roundDecimal(body.valor_servicos),
        valor_pecas: roundDecimal(body.valor_pecas),
        valor_total: roundDecimal(body.valor_total),
        observacoes: body.observacoes,
        termos_condicoes: body.termos_condicoes,
        created_by: user?.name || user?.email || 'Sistema',
        updated_at: new Date(),
      };
      prismaData = data;

      console.log('[ORCAMENTO CREATE FINAL]', JSON.stringify(data, null, 2));

      const orcamento = await tx.orcamento.create({
        data
      });

      console.log('[ORCAMENTO CREATE SUCCESS]', orcamento.id);

      if (body.servicos.length > 0) {
        await tx.orcamentoServico.createMany({
          data: body.servicos.map((s: any) => {
            const horas = s.horas || 0;
            const valorHora = s.valor_hora || 0;
            const valorTotal = s.valor_total ?? roundDecimal(horas * valorHora);
            return {
              id: globalThis.crypto.randomUUID(),
              orcamento_id: orcamento.id,
              descricao: s.descricao,
              horas,
              valor_hora: roundDecimal(valorHora),
              valor_total: roundDecimal(valorTotal),
            };
          })
        });
      }

      if (body.pecas.length > 0) {
        await tx.orcamentoPeca.createMany({
          data: body.pecas.map((p: any) => {
            const quant = p.quantidade || 0;
            const unit = p.valor_unit || 0;
            const total = p.valor_total ?? roundDecimal(quant * unit);
            return {
              id: globalThis.crypto.randomUUID(),
              orcamento_id: orcamento.id,
              peca_id: p.peca_id,
              descricao: p.descricao,
              quantidade: quant,
              valor_unit: roundDecimal(unit),
              valor_total: roundDecimal(total),
            };
          })
        });
      }

      await tx.eventoAgenda.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          empresa_id,
          titulo: `Orçamento Criado: ${orcamento.numero}`,
          descricao: `Novo orçamento gerado para o cliente.`,
          data_inicio: new Date(),
          data_fim: new Date(new Date().getTime() + 3600000),
          tipo: 'OUTRO',
          status: 'AGENDADO',
          cliente_id: orcamento.cliente_id,
          veiculo_id: orcamento.veiculo_id,
          usuario_id: user?.id || 'admin',
          updated_at: new Date(),
        }
      });

      return orcamento;
    });

    await createAuditLog({
      modulo: 'ORCAMENTO',
      acao: 'CRIAR',
      entidade: 'Orcamento',
      entidade_id: result.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: result
    });

    log('INFO', 'ORCAMENTO', 'Orçamento criado', { id: result.id, numero: result.numero }, user?.name);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[ORCAMENTO CREATE ERROR FULL]', error);

    if (error instanceof Error) {
      console.error('[ORCAMENTO CREATE MESSAGE]', error.message);
      console.error('[ORCAMENTO CREATE STACK]', error.stack);
    }

    console.error('[ORCAMENTO PAYLOAD RECEBIDO]', JSON.stringify(body, null, 2));

    console.error('[ORCAMENTO DATA ENVIADA PRISMA]', JSON.stringify(prismaData, null, 2));

    log('ERROR', 'ORCAMENTO', 'Erro ao criar orçamento', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Erro ao criar orçamento' }, { status: 500 });
  }
}
