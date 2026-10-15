import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

// ============================================================
// GET — Listar registros de auditoria (somente ADMIN)
// Filtros: modulo, acao, usuario, entidade, entidade_id
// Paginação: page, limit (max 100)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    // C11: só ADMIN acessa auditoria
    const { error, user } = await requireRole(['ADMIN']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const modulo = (searchParams.get('modulo') || '').trim();
    const acao = (searchParams.get('acao') || '').trim();
    const usuario = (searchParams.get('usuario') || '').trim().slice(0, 100);
    const entidade = (searchParams.get('entidade') || '').trim();
    const entidade_id = (searchParams.get('entidade_id') || '').trim();

    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '15', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 15 : Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

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

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Os campos dados_antes/dados_depois são strings JSON no banco.
    // A tela espera objetos para mostrar com JSON.stringify.
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
