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
import { normalizeText } from '@/lib/normalize-search';

const pecaSchema = z.object({
  codigo: z.string().min(2).trim(),
  descricao: z.string().min(3).trim(),
  fabricante: z.string().optional().nullable(),
  categoria: z.nativeEnum(Peca_categoria),
  quantidade: z.number().min(0).default(0),
  estoque_minimo: z.number().min(0).default(5),
  localizacao: z.string().optional().nullable(),
  preco_custo: z.number().nonnegative(),
  preco_venda: z.number().nonnegative(),
  unidadeMedida: z.string().default('un'),
  unidadeCompra: z.string().default('un'),
  fatorConversao: z.number().min(0.0001).default(1),
  permiteFracionado: z.boolean().default(false)
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const categoria = searchParams.get('categoria');
    const onlySearch = searchParams.get('onlySearch') === 'true';

    // Se for modo de busca estrito (ex: Ordem de Serviço) e não tiver busca válida (mínimo 2 caracteres), retorna vazio imediatamente
    if (onlySearch && (!q || q.trim().length < 2)) {
      return NextResponse.json({
        items: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }

    const where: any = {
      empresa_id: user?.empresa_id || 'default'
    };

    if (q) {
      // Normaliza o termo de busca geral eliminando acentos e limpando espaços extras
      const normalizedQuery = normalizeText(q);
      
      // Divide em blocos/palavras para suportar palavras em qualquer ordem ou buscas parciais
      const rawTerms = q.trim().toLowerCase().replace(/\s+/g, ' ').split(' ').filter(Boolean);
      
      if (rawTerms.length > 0) {
        where.AND = rawTerms.map((term) => {
          const normTerm = normalizeText(term);
          
          const orConditions: any[] = [
            { id: { contains: term } },
            { codigo: { contains: term } },
            { descricao: { contains: term } },
            { fabricante: { contains: term } },
          ];

          // Se o termo normalizado for diferente do original (ex: contendo acento), buscamos por ambos
          // para flexibilizar a busca em qualquer colagem MySQL (accent-sensitive ou general-ci)
          if (normTerm !== term && normTerm) {
            orConditions.push(
              { id: { contains: normTerm } },
              { codigo: { contains: normTerm } },
              { descricao: { contains: normTerm } },
              { fabricante: { contains: normTerm } },
            );
          }

          return { OR: orConditions };
        });
      }
    }

    if (categoria && categoria !== 'TODAS') {
      where.categoria = categoria as Peca_categoria;
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = onlySearch ? 20 : parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [pecas, total] = await Promise.all([
      prisma.peca.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.peca.count({ where })
    ]);

    // Logs temporários de depuração solicitados para monitorar performance e acertos no banco
    console.log('[PECAS_SEARCH]', {
      search: q,
      whereClause: JSON.stringify(where),
      totalEncontrado: total
    });

    // Diagnóstico em desenvolvimento caso nenhuma peça seja encontrada (Etapa 6)
    if (process.env.NODE_ENV === 'development' && pecas.length === 0) {
      console.log('--- DIAGNÓSTICO DE ESTOQUE (STATUS: VAZIO) ---');
      console.log('Query original:', q);
      console.log('Categoria selecionada:', categoria);
      console.log('Condição WHERE gerada no Prisma:', JSON.stringify(where, null, 2));
      console.log('Quantidade total de registros no banco:', await prisma.peca.count());
      console.log('----------------------------------------------');
    }

    // Fallback seguro de estrutura (nunca undefined/null)
    return NextResponse.json({
      items: pecas || [],
      total: total || 0,
      page,
      totalPages: Math.ceil((total || 0) / limit) || 1
    });
  } catch (error) {
    log('ERROR', 'PECA', 'Erro ao listar peças', { error }, 'sistema');
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'pecas', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const data = pecaSchema.parse(await request.json());
    
    const empresa_id = user?.empresa_id || 'default';

    const existing = await prisma.peca.findUnique({
      where: { 
        codigo_empresa_id: {
          codigo: data.codigo,
          empresa_id: empresa_id
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Código de peça já cadastrado' }, { status: 400 });
    }

    const peca = await prisma.peca.create({
      data: {
        ...data,
        empresa_id: empresa_id,
        preco_custo: roundDecimal(data.preco_custo),
        preco_venda: roundDecimal(data.preco_venda),
        created_by: user?.name || user?.email || 'Sistema'
      }
    });

    await createAuditLog({
      modulo: 'PECA',
      acao: 'CRIAR',
      entidade: 'Peca',
      entidade_id: peca.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: peca
    });

    log('INFO', 'PECA', 'Peça criada', { id: peca.id, codigo: peca.codigo }, user?.name);

    if (peca.quantidade <= peca.estoque_minimo) {
      try {
        await notificarEstoqueBaixo(peca);
      } catch (err) {
        console.error('Erro ao notificar estoque baixo:', err);
      }
    }

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json(peca, { status: 201 });
  } catch (error) {
    log('ERROR', 'PECA', 'Erro ao criar peça', { error }, 'sistema');
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar peça' }, { status: 500 });
  }
}
