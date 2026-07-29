import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import crypto from 'crypto';
import { z } from 'zod';
import { notificarMovimentacaoFinanceira } from '@/lib/notificacoes';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { roundDecimal } from '@/lib/utils';

const financeiroSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres').trim(),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data: z.string().optional().nullable(),
  data_vencimento: z.string().optional().nullable(),
  data_pagamento: z.string().optional().nullable(),
  status: z.string().default('PENDENTE'),
  forma_pagamento: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  centro_custo: z.string().optional().nullable(),
  numero_documento: z.string().optional().nullable(),
  os_id: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  comprovante_url: z.string().optional().nullable(),
  numero_parcelas: z.coerce.number().int().min(1).optional().default(1),
  dias_entre_parcelas: z.coerce.number().int().min(1).optional().default(28),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      log('WARN', 'FINANCEIRO', 'Tentativa de acesso negado ao listar financeiro', { userId: user?.id }, user?.name);
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');
    const categoria = searchParams.get('categoria');
    const mes = searchParams.get('mes');
    const ano = searchParams.get('ano');

    const where: any = {
      empresa_id: user?.empresa_id || 'default'
    };

    if (q) {
      where.OR = [
        { descricao: { contains: q } },
        { numero_documento: { contains: q } },
        { OrdemServico: { Cliente: { nome: { contains: q } } } },
        { Cliente: { nome: { contains: q } } },
      ];
    }

    if (tipo && tipo !== 'TODOS') {
      where.tipo = tipo;
    }

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (categoria && categoria !== 'TODOS') {
      where.categoria = categoria;
    }

    if (mes && ano) {
      const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const fim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);
      where.data = { gte: inicio, lte: fim };
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [itemsRaw, total] = await Promise.all([
      prisma.movimentacaoFinanceira.findMany({
        where,
        include: {
          OrdemServico: {
            select: { id: true, numero: true, Cliente: { select: { nome: true } } }
          },
          Cliente: {
            select: { id: true, nome: true }
          }
        },
        orderBy: { data: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movimentacaoFinanceira.count({ where })
    ]);

    const items = itemsRaw.map(item => {
      const mappedOS = item.OrdemServico ? {
        id: item.OrdemServico.id,
        numero: item.OrdemServico.numero,
        cliente: item.OrdemServico.Cliente
      } : null;

      return {
        ...item,
        os: mappedOS,
        cliente: item.Cliente,
        OrdemServico: undefined,
        Cliente: undefined
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar financeiro:', error);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'criar')) {
      log('WARN', 'FINANCEIRO', 'Tentativa de criação de movimentação negada', { userId: user?.id }, user?.name);
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = financeiroSchema.parse(await request.json());
    
    const empresa_id = user?.empresa_id || 'default';
    const valorArredondado = roundDecimal(body.valor);
    const results = [];
    const numParcelas = body.numero_parcelas || 1;
    const diasIntervalo = body.dias_entre_parcelas || 28;
    const dataBase = body.data_vencimento ? new Date(body.data_vencimento) : (body.data ? new Date(body.data) : new Date());

    if (numParcelas > 1) {
      for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date(dataBase);
        vencimento.setDate(vencimento.getDate() + (i * diasIntervalo));

        const movimentacao = await prisma.movimentacaoFinanceira.create({
          data: {
            id: crypto.randomUUID(),
            empresa_id: empresa_id,
            tipo: body.tipo,
            descricao: `Parcela ${i + 1}/${numParcelas} - ${body.descricao}`,
            valor: valorArredondado,
            data: body.data ? new Date(body.data) : new Date(),
            data_vencimento: vencimento,
            data_pagamento: body.data_pagamento ? new Date(body.data_pagamento) : null,
            status: body.status,
            forma_pagamento: body.forma_pagamento,
            categoria: body.categoria,
            centro_custo: body.centro_custo,
            numero_documento: body.numero_documento,
            comprovante_url: body.comprovante_url,
            os_id: body.os_id || null,
            cliente_id: body.cliente_id || null,
            created_by: user?.name || user?.email || 'Sistema',
            updated_at: new Date()
          }
        });

        await createAuditLog({
          modulo: 'FINANCEIRO',
          acao: 'CRIAR_PARCELA',
          entidade: 'MovimentacaoFinanceira',
          entidade_id: movimentacao.id,
          usuario: user?.name || user?.email || 'Sistema',
          dados_depois: movimentacao
        });

        results.push(movimentacao);

        try {
          await notificarMovimentacaoFinanceira(movimentacao);
        } catch (err) {
          log('ERROR', 'FINANCEIRO', 'Erro ao notificar movimentação', { error: err }, user?.name);
        }
      }

      log('INFO', 'FINANCEIRO', 'Movimentação parcelada criada', { parcelas: numParcelas, valor: valorArredondado }, user?.name);
      
      if (user?.empresa_id) {
        const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
        invalidateDashboardCache(user.empresa_id);
      }

      return NextResponse.json(results);
    } else {
      const movimentacao = await prisma.movimentacaoFinanceira.create({
        data: {
          id: crypto.randomUUID(),
          empresa_id: empresa_id,
          tipo: body.tipo,
          descricao: body.descricao,
          valor: valorArredondado,
          data: body.data ? new Date(body.data) : new Date(),
          data_vencimento: body.data_vencimento ? new Date(body.data_vencimento) : null,
          data_pagamento: body.data_pagamento ? new Date(body.data_pagamento) : null,
          status: body.status,
          forma_pagamento: body.forma_pagamento,
          categoria: body.categoria,
          centro_custo: body.centro_custo,
          numero_documento: body.numero_documento,
          comprovante_url: body.comprovante_url,
          os_id: body.os_id || null,
          cliente_id: body.cliente_id || null,
          created_by: user?.name || user?.email || 'Sistema',
          updated_at: new Date()
        }
      });

      await createAuditLog({
        modulo: 'FINANCEIRO',
        acao: 'CRIAR',
        entidade: 'MovimentacaoFinanceira',
        entidade_id: movimentacao.id,
        usuario: user?.name || user?.email || 'Sistema',
        dados_depois: movimentacao
      });

      log('INFO', 'FINANCEIRO', 'Movimentação única criada', { id: movimentacao.id, valor: valorArredondado }, user?.name);

      try {
        await notificarMovimentacaoFinanceira(movimentacao);
      } catch (err) {
        log('ERROR', 'FINANCEIRO', 'Erro ao notificar movimentação', { error: err }, user?.name);
      }

      if (user?.empresa_id) {
        const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
        invalidateDashboardCache(user.empresa_id);
      }

      return NextResponse.json(movimentacao);
    }
  } catch (error) {
    log('ERROR', 'FINANCEIRO', 'Erro ao criar movimentação', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar movimentação' }, { status: 500 });
  }
}
