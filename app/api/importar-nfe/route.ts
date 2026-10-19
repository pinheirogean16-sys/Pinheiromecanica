import { NextRequest, NextResponse } from 'next/server';
import { parseNFeXML } from '@/lib/parse-nfe';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

// ============================================================
// LIMITES DE SEGURANÇA
// ============================================================
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (XML de NF-e raramente passa de 1MB)
const MAX_ITENS_NFE = 1000; // Limite de itens por NF-e

// ============================================================
// SANITIZAÇÃO CONTRA LOG INJECTION
// ============================================================
function sanitizeLogValue(v: string | undefined, maxLen = 200): string {
  if (!v) return '';
  return v.replace(/[\r\n\t]/g, ' ').slice(0, maxLen);
}

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'nfe', 'importar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // ✅ NOVO: valida tamanho do arquivo (DoS)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    // ✅ NOVO: valida tipo do arquivo (XML)
    const isXml =
      file.type === 'application/xml' ||
      file.type === 'text/xml' ||
      file.name.toLowerCase().endsWith('.xml');

    if (!isXml) {
      return NextResponse.json(
        { error: 'Formato inválido. Envie um arquivo XML da NF-e.' },
        { status: 400 }
      );
    }

    const xmlString = await file.text();

    // ✅ NOVO: valida se o parser retornou uma estrutura válida
    const nfeData = parseNFeXML(xmlString);

    if (!nfeData || !Array.isArray(nfeData.itens) || nfeData.itens.length === 0) {
      return NextResponse.json(
        { error: 'XML da NF-e inválido ou sem itens. Verifique o arquivo.' },
        { status: 400 }
      );
    }

    // ✅ NOVO: limita o número de itens (evita query gigante)
    if (nfeData.itens.length > MAX_ITENS_NFE) {
      return NextResponse.json(
        { error: `NF-e com itens demais (${nfeData.itens.length}). Máximo permitido: ${MAX_ITENS_NFE}.` },
        { status: 400 }
      );
    }

    const empresa_id = user.empresa_id;

    // Verifica quais peças já estão cadastradas no banco para esta empresa
    const codigos = nfeData.itens.map((item) => item.codigo).filter(Boolean);
    const existingPecas = await prisma.peca.findMany({
      where: {
        empresa_id,
        codigo: { in: codigos },
      },
      select: {
        codigo: true,
        descricao: true,
        preco_custo: true,
        preco_venda: true,
        quantidade: true,
      },
    });

    const existingMap = new Map(existingPecas.map((p) => [p.codigo, p]));

    const enrichedItens = nfeData.itens.map((item) => {
      const dbPeca = existingMap.get(item.codigo);
      return {
        ...item,
        existe: !!dbPeca,
        pecaLocal: dbPeca || null,
      };
    });

    const enrichedData = {
      ...nfeData,
      itens: enrichedItens,
      resumo: {
        encontrados: enrichedItens.filter((i) => i.existe).length,
        novos: enrichedItens.filter((i) => !i.existe).length,
        total: enrichedItens.length,
      },
    };

    // ✅ NOVO: sanitiza o nome do arquivo no log (evita log injection)
    log(
      'INFO',
      'NFE',
      'NF-e importada/processada para pré-visualização',
      {
        fileName: sanitizeLogValue(file.name, 200),
        totalItens: nfeData.itens.length,
      },
      user?.name
    );

    return NextResponse.json(enrichedData);
  } catch (error: any) {
    // ✅ NOVO: não vaza mensagem interna do parser ou do banco
    return apiError(error, 'NFE', 'Erro ao processar o XML da NF-e');
  }
}
