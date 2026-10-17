import { NextRequest, NextResponse } from 'next/server';
import { parseNFeXML } from '@/lib/parse-nfe';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'nfe', 'importar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const xmlString = await file.text();
    const nfeData = parseNFeXML(xmlString);

    const empresa_id = user.empresa_id;

    // Verifica quais peças já estão cadastradas no banco para esta empresa
    const codigos = nfeData.itens.map((item) => item.codigo);
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

    log(
      'INFO',
      'NFE',
      'NF-e importada/processada para pré-visualização',
      { fileName: file.name, totalItens: nfeData.itens.length },
      user?.name
    );

    return NextResponse.json(enrichedData);
  } catch (error: any) {
    log(
      'ERROR',
      'NFE',
      'Erro ao processar NF-e',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json(
      {
        error: error?.message || 'Erro interno ao processar o XML da NF-e',
      },
      { status: 500 }
    );
  }
}
