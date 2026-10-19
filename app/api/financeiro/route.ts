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
import { apiError } from '@/lib/api-error';

// ============================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================
const financeiroSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres').trim(),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data: z.string().optional().nullable(),
  data_vencimento: z.string().optional().nullable(),
  data_pagamento: z.string().optional().nullable(),
  status: z.enum(['PENDENTE', 'PAGO', 'CANCELADO']).default('PENDENTE'), // 👈 ENUM
  forma_pagamento: z.enum(['DINHEIRO', 'PIX', 'BOLETO', 'CARTAO', 'PARCELADO']).optional().nullable(), // 👈 ENUM
  categoria: z.string().max(100).optional().nullable(),
  centro_custo: z.enum(['OFICINA', 'CAMPO', 'RESGATE', 'MOTOR', 'CAIXA', 'DIFERENCIAL', 'ELETRICA', 'INJECAO', 'BORRACHARIA']).optional().nullable(), // 👈 ENUM
  numero_documento: z.string().max(100).optional().nullable(),
  os_id: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  comprovante_url: z.string().max(500).optional().nullable(),
  numero_parcelas: z.coerce.number().int().min(1).max(60).optional().default(1), // 👈 max 60
  dias_entre_parcelas: z.coerce.number().int().min(1).max(365).optional().default(28), // 👈 max 365
});

const listarFinanceiroQuerySchema = z.object({
  q: z.string().optional().transform(v => v?.slice(0, 100) || ''),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'TODOS']).optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'CANCELADO', 'TODOS']).optional(),
  categoria: z.string().optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================
// GET — Listar movimentações financeiras
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      log('WARN', 'FINANCEIRO', 'Tentativa de acesso negado ao listar financeiro', { userId: user?.id }, user?.name);
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listarFinanceiroQuerySchema.parse({
      q: searchParams.get('q'),
      tipo: searchParams.get('tipo') || undefined,
      status: searchParams.get('status') || undefined,
      categoria: searchParams.get('categoria') || undefined,
      mes: searchParams.get('mes') || undefined,
      ano: searchParams.get('ano') || undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const { q, tipo, status, categoria, mes, ano, page, limit } = parsed;
    const skip = (page - 1) * limit;

    const where: any = { empresa_id: user.empresa_id };

    if (q) {
      where.OR = [
        { descricao: { contains: q } },
        { numero_documento: { contains: q } },
        { OrdemServico: { Cliente: { nome: { contains: q } } } },
        { Cliente: { nome: { contains: q } } },
      ];
    }

    if (tipo && tipo !== 'TODOS') where.tipo = tipo;
    if (status && status !== 'TODOS') where.status = status;
    if (categoria && categoria !== 'TODOS') where.categoria = categoria;

    if (mes && ano) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      where.data = { gte: inicio, lte: fim };
    }

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
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    // ✅ CORRIGIDO: não engole o erro, loga e retorna erro real
    return apiError(error, 'FINANCEIRO', 'Erro ao listar financeiro');
  }
}

// ============================================================
// POST — Criar movimentação financeira (única ou parcelada)
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'criar')) {
      log('WARN', 'FINANCEIRO', 'Tentativa de criação de movimentação negada', { userId: user?.id }, user?.name);
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = financeiroSchema.parse(await request.json());
    const empresa_id = user.empresa_id;

    // ✅ NOVO: valida vínculos por empresa (IDOR fix)
    if (body.os_id) {
      const os = await prisma.ordemServico.findFirst({
        where: { id: body.os_id, empresa_id },
        select: { id: true },
      });
      if (!os) {
        return NextResponse.json(
          { error: 'Ordem de serviço não encontrada nesta empresa' },
          { status: 400 }
        );
      }
    }

    if (body.cliente_id) {
      const cli = await prisma.cliente.findFirst({
        where: { id: body.cliente_id, empresa_id },
        select: { id: true },
      });
      if (!cli) {
        return NextResponse.json(
          { error: 'Cliente não encontrado nesta empresa' },
          { status: 400 }
        );
      }
    }

    const valorTotal = roundDecimal(body.valor);
    const numParcelas = body.numero_parcelas || 1;
    const diasIntervalo = body.dias_entre_parcelas || 28;
    const dataBase = body.data_vencimento
      ? new Date(body.data_vencimento)
      : (body.data ? new Date(body.data) : new Date());

    // ✅ NOVO: transação atômica para parcelamento (ou tudo, ou nada)
    const results = await prisma.$transaction(async (tx) => {
      const criadas: any[] = [];

      if (numParcelas > 1) {
        // ✅ CORRIGIDO: ajuste de centavos na última parcela
        const valorParcela = roundDecimal(valorTotal / numParcelas);
        let somaParcelas = 0;

        for (let i = 0; i < numParcelas; i++) {
          const isUltima = i === numParcelas - 1;
          const valorEstaParcela = isUltima
            ? roundDecimal(valorTotal - somaParcelas) // 👈 garante soma exata
            : valorParcela;

          somaParcelas = roundDecimal(somaParcelas + valorEstaParcela);

          const vencimento = new Date(dataBase);
          vencimento.setDate(vencimento.getDate() + (i * diasIntervalo));

          const movimentacao = await tx.movimentacaoFinanceira.create({
            data: {
              id: crypto.randomUUID(),
              empresa_id,
              tipo: body.tipo,
              descricao: `Parcela ${i + 1}/${numParcelas} - ${body.descricao}`,
              valor: valorEstaParcela,
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
              updated_at: new Date(),
            },
          });

          criadas.push(movimentacao);
        }
      } else {
        const movimentacao = await tx.movimentacaoFinanceira.create({
          data: {
            id: crypto.randomUUID(),
            empresa_id,
            tipo: body.tipo,
            descricao: body.descricao,
            valor: valorTotal,
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
            updated_at: new Date(),
          },
        });

        criadas.push(movimentacao);
      }

      return criadas;
    });

    // ✅ NOVO: auditoria com empresa_id (fora da transação, sem quebrar em caso de falha)
    for (const mov of results) {
      try {
        await createAuditLog({
          modulo: 'FINANCEIRO',
          acao: numParcelas > 1 ? 'CRIAR_PARCELA' : 'CRIAR',
          entidade: 'MovimentacaoFinanceira',
          entidade_id: mov.id,
          usuario: user?.name || user?.email || 'Sistema',
          empresa_id: user.empresa_id, // 👈 empresa_id adicionado
          dados_depois: mov,
        });
      } catch (err) {
        log('ERROR', 'FINANCEIRO', 'Erro ao criar auditoria', { error: err }, user?.name);
      }
    }

    // Notificação (fora da transação, não quebra em caso de falha)
    for (const mov of results) {
      try {
        await notificarMovimentacaoFinanceira(mov);
      } catch (err) {
        log('ERROR', 'FINANCEIRO', 'Erro ao notificar movimentação', { error: err }, user?.name);
      }
    }

    // Invalida cache do dashboard
    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    log(
      'INFO',
      'FINANCEIRO',
      numParcelas > 1 ? 'Movimentação parcelada criada' : 'Movimentação única criada',
      { parcelas: numParcelas, valor: valorTotal },
      user?.name
    );

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'FINANCEIRO', 'Erro ao criar movimentação');
  }
}
