import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// ============================================================
// SCHEMA DE VALIDAÇÃO PARA FILTROS E PAGINAÇÃO
// ============================================================
const auditoriaQuerySchema = z.object({
  modulo: z.string().optional().transform(v => v?.trim() || ''),
  acao: z.string().optional().transform(v => v?.trim() || ''),
  usuario: z.string().optional().transform(v => v?.trim().slice(0, 100) || ''),
  entidade: z.string().optional().transform(v => v?.trim() || ''),
  entidade_id: z.string().optional().transform(v => v?.trim() || ''),
  data_inicio: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de início inválida' }
  ),
  data_fim: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de fim inválida' }
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

// ============================================================
// GET — Listar registros de auditoria (somente ADMIN)
// Filtros: modulo, acao, usuario, entidade, entidade_id, data_inicio, data_fim
// Paginação: page, limit (max 100)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    // C11: só ADMIN acessa auditoria
    const { error, user } = await requireRole(['ADMIN']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    
    // Validação com zod de todos os parâmetros
    const parsed = auditoriaQuerySchema.parse({
      modulo: searchParams.get('modulo'),
      acao: searchParams.get('acao'),
      usuario: searchParams.get('usuario'),
      entidade: searchParams.get('entidade'),
      entidade_id: searchParams.get('entidade_id'),
      data_inicio: searchParams.get('data_inicio'),
      data_fim: searchParams.get('data_fim'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const { modulo, acao, usuario, entidade, entidade_id, data_inicio, data_fim, page, limit } = parsed;
    const skip = (page - 1) * limit;

    // Monta o where com isolamento de empresa (multi-tenancy)
    const where: any = {
      empresa_id: user.empresa_id,
    };

    if (modulo && modulo !== 'TODOS') where.modulo = modulo;
    if (acao && acao !== 'TODOS') where.acao = acao;
    if (entidade) where.entidade = entidade;
    if (entidade_id) where.entidade_id = entidade_id;
    if (usuario) {
      where.usuario = { contains: usuario };
    }

    // Filtro de período (data_inicio e data_fim)
    if (data_inicio || data_fim) {
      where.created_at = {};
      if (data_inicio) {
        where.created_at.gte = new Date(data_inicio);
      }
      if (data_fim) {
        // Inclui o dia inteiro de data_fim (até 23:59:59)
        const fim = new Date(data_fim);
        fim.setUTCHours(23, 59, 59, 999);
        where.created_at.lte = fim;
      }
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Normaliza dados_antes e dados_depois (JSON string -> objeto)
    const itemsNormalizados = items.map((item) => {
      let dadosAntes: any = null;
      let dadosDepois: any = null;
      try {
        dadosAntes = item.dados_antes ? JSON.parse(item.dados_antes) : null;
      } catch {
        dadosAntes = item.dados_antes;
      }
      try {
        dadosDepois = item.dados_depois ? JSON.parse(item.dados_depois) : null;
      } catch {
        dadosDepois = item.dados_depois;
      }
      return {
        ...item,
        dados_antes: dadosAntes,
        dados_depois: dadosDepois,
      };
    });

    return NextResponse.json({
      items: itemsNormalizados,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    // Tratamento específico para erros de validação do zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'AUDITORIA', 'Erro ao listar registros de auditoria');
  }
}

// ============================================================
// DELETE — NÃO IMPLEMENTADO (por decisão de segurança)
// Expurgo de trilha de auditoria não deve ser feito por clique de UI.
// Política de retenção deve rodar via job interno com auditoria própria.
// ============================================================
export async function DELETE() {
  log('WARN', 'AUDITORIA', 'Tentativa de expurgo manual de auditoria bloqueada', {}, 'sistema');
  return NextResponse.json(
    {
      error:
        'Expurgo manual de auditoria desabilitado por política de segurança. Registros são retidos conforme política interna.',
    },
    { status: 403 }
  );
}
