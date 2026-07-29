import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sanitize = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    return String(val).trim();
  };

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      nfeData, 
      fornecedorId, // If already exists
      importFornecedor,
      itensParaImportar, // Array of item indices
      importarFinanceiro,
      formaPagamento,
      numParcelas,
      diasEntreParcelas,
      dataPrimeiraParcela,
      categoriaPecas // Default category for new parts
    } = body;

    if (!nfeData) {
      return NextResponse.json({ error: 'Dados da NF-e não fornecidos.' }, { status: 400 });
    }

    const results: any = {
      fornecedor: null,
      pecas: [],
      financeiro: [],
      stats: {
        criados: 0,
        atualizados: 0,
        total: 0
      }
    };

    const empresa_id = session?.empresa_id || 'default';

    // 1. Fornecedor
    let actualFornecedorId = fornecedorId || null;
    if (importFornecedor && nfeData.fornecedor) {
      try {
        const f = nfeData.fornecedor;
        const cnpjStr = sanitize(f.cnpj) || '';
        
        if (cnpjStr) {
          const fornecedor = f;
          console.log('[CRIAR FORNECEDOR]', fornecedor);

          const existing = await prisma.cliente.findUnique({ where: { cpf_cnpj: cnpjStr } });
          const newPerfil = existing ? (existing.perfil === 'CLIENTE' ? 'AMBOS' : existing.perfil) : 'FORNECEDOR';

          const supplierUpdatePayload = {
            nome: f.razaoSocial,
            razao_social: f.razaoSocial,
            nome_fantasia: f.nomeFantasia,
            inscricao_estadual: sanitize(f.ie),
            endereco: f.endereco,
            bairro: f.bairro,
            cidade: f.cidade,
            uf: f.uf,
            estado: f.uf,
            cep: sanitize(f.cep),
            perfil: newPerfil,
            updated_at: new Date()
          };
 
          const supplierCreatePayload = {
            id: globalThis.crypto.randomUUID(),
            cpf_cnpj: cnpjStr,
            nome: f.razaoSocial,
            razao_social: f.razaoSocial,
            nome_fantasia: f.nomeFantasia,
            inscricao_estadual: sanitize(f.ie),
            endereco: f.endereco,
            bairro: f.bairro,
            cidade: f.cidade,
            uf: f.uf,
            estado: f.uf,
            cep: sanitize(f.cep),
            tipo: 'PJ' as const,
            tipo_pessoa: 'JURIDICA',
            telefone: 'N/A',
            perfil: 'FORNECEDOR',
            updated_at: new Date()
          };

          console.log('[FORNECEDOR CREATE]', JSON.stringify(supplierCreatePayload, null, 2));

          const fornecedorDb = await prisma.cliente.upsert({
            where: { cpf_cnpj: cnpjStr },
            update: supplierUpdatePayload,
            create: supplierCreatePayload
          });
          const fornecedorCriado = fornecedorDb;
          console.log('[FORNECEDOR CRIADO]', fornecedorCriado);

          actualFornecedorId = fornecedorDb.id;
          results.fornecedor = fornecedorDb;
        }
      } catch (fErr) {
        console.error('[ERRO FORNECEDOR COMPLETO]', fErr);
        console.error('Erro não fatal ao importar fornecedor:', fErr);
        // Do not fail the whole NFe import, fall back to whatever is possible
      }
    }

    // 2. Peças e Movimentação no Estoque
    if (itensParaImportar && itensParaImportar.length > 0) {
      results.stats.total = itensParaImportar.length;
      
      for (const index of itensParaImportar) {
        try {
          const item = nfeData.itens[index];
          if (!item) continue;

          console.log('[PECA RECEBIDA]', item);

          // Safe inputs
          const safeCodigo = sanitize(item.codigo) || `SEM_COD_NFE_${index + 1}_${Date.now()}`;
          const safeDescricao = (sanitize(item.descricao) || 'PRODUTO SEM DESCRIÇÃO').toUpperCase();
          const safeQtd = isNaN(Number(item.quantidade)) ? 1 : Math.round(Number(item.quantidade));
          const safeCusto = isNaN(Number(item.valorUnitario)) ? 0 : Number(item.valorUnitario);

          const descricao = safeDescricao;
          const quantidade = safeQtd;
          const precoCusto = safeCusto;
          console.log('[PECA ANTES CREATE]', {
            descricao,
            quantidade,
            precoCusto
          });

          // Find if piece already exists by (codigo, empresa_id)
          const existingPeca = await prisma.peca.findUnique({
            where: {
              codigo_empresa_id: {
                codigo: safeCodigo,
                empresa_id: empresa_id
              }
            }
          });

          let pecaDb;

          if (existingPeca) {
            // Update existing piece
            // "SE a peça já existir: atualizar estoque, atualizar custo, atualizar preço se configurado, vincular pela referência/código"
            const currentMarkup = existingPeca.preco_custo > 0 ? (existingPeca.preco_venda / existingPeca.preco_custo) : 1.5;
            const updatedPrecoVenda = safeCusto * currentMarkup;

            pecaDb = await prisma.peca.update({
              where: { id: existingPeca.id },
              data: {
                quantidade: { increment: safeQtd },
                preco_custo: safeCusto,
                preco_venda: updatedPrecoVenda > 0 ? updatedPrecoVenda : existingPeca.preco_venda,
                updated_by: session.name || 'Sistema (importação)',
                updated_at: new Date()
              }
            });
            const pecaAtualizada = pecaDb;
            console.log('[PECA ATUALIZADA]', pecaAtualizada);
            results.stats.atualizados++;
          } else {
            // Create automatic piece
            // "SE a peça não existir: criar automaticamente a peça: nome, código, NCM, valor, quantidade, fornecedor, adicionar ao estoque automaticamente"
            const pecaCreatePayload = {
              id: globalThis.crypto.randomUUID(),
              empresa_id: empresa_id,
              codigo: safeCodigo,
              descricao: safeDescricao,
              quantidade: safeQtd,
              preco_custo: safeCusto,
              preco_venda: safeCusto * 1.5, // Default markup 50%
              categoria: (categoriaPecas as any) || 'OUTROS',
              localizacao: 'NFE IMPORT_ALT',
              created_by: session.name || 'Sistema (importação)',
              updated_at: new Date()
            };

            console.log('[PECA CREATE]', JSON.stringify(pecaCreatePayload, null, 2));

            pecaDb = await prisma.peca.create({
              data: pecaCreatePayload
            });
            const novaPeca = pecaDb;
            console.log('[PECA CRIADA]', novaPeca);
            results.stats.criados++;
          }

          // Register automatic stock movement ENTRADA
          await prisma.movimentacaoEstoque.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              empresa_id: empresa_id,
              peca_id: pecaDb.id,
              tipo: 'ENTRADA',
              quantidade: safeQtd,
              motivo: 'COMPRA',
              observacao: `Importação automática via NF-e Nº ${nfeData.numero} - Fornecedor: ${nfeData.fornecedor.razaoSocial}`,
              usuario_id: session.id
            }
          });

          const pecaId = pecaDb.id;
          console.log('[MOVIMENTACAO ESTOQUE]', {
            pecaId,
            quantidade
          });

          results.pecas.push(pecaDb);
        } catch (itemErr: any) {
          console.error('[ERRO PECA COMPLETO]', itemErr);
          console.error(`Erro ao importar item no índice ${index}:`, itemErr);
          // Don't fail the whole import if an item fails, just log it
        }
      }
    }

    // 3. Financeiro
    if (importarFinanceiro) {
      try {
        const valorTotal = nfeData.totais.valorNF;
        const descricaoBase = `Compra NF-e ${nfeData.numero} - ${nfeData.fornecedor.razaoSocial}`;
        const statusInicial = (formaPagamento === 'DINHEIRO' || formaPagamento === 'PIX') ? 'PAGO' : 'PENDENTE';

        if (formaPagamento === 'BOLETO PARCELADO' && numParcelas > 1) {
          const valorParcela = valorTotal / numParcelas;
          const baseDate = dataPrimeiraParcela ? new Date(dataPrimeiraParcela) : new Date(nfeData.dataEmissao);
          
          for (let i = 0; i < numParcelas; i++) {
            const vencimento = new Date(baseDate);
            vencimento.setDate(vencimento.getDate() + (i * (diasEntreParcelas || 28)));

            const mov = await prisma.movimentacaoFinanceira.create({
              data: {
                id: globalThis.crypto.randomUUID(),
                tipo: 'SAIDA',
                descricao: `${descricaoBase} - Parcela ${i + 1}/${numParcelas}`,
                valor: valorParcela,
                data: new Date(nfeData.dataEmissao),
                data_vencimento: vencimento,
                status: statusInicial,
                categoria: 'COMPRA_MERCADORIA',
                numero_documento: nfeData.numero,
                forma_pagamento: formaPagamento,
                cliente_id: actualFornecedorId,
                created_by: 'Sistema (NF-e)',
                updated_at: new Date()
              }
            });
            results.financeiro.push(mov);
          }
        } else {
          const mov = await prisma.movimentacaoFinanceira.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              tipo: 'SAIDA',
              descricao: descricaoBase,
              valor: valorTotal,
              data: new Date(nfeData.dataEmissao),
              data_vencimento: formaPagamento === 'BOLETO À VISTA' && dataPrimeiraParcela 
                ? new Date(dataPrimeiraParcela) 
                : new Date(nfeData.dataEmissao),
              status: statusInicial,
              categoria: 'COMPRA_MERCADORIA',
              numero_documento: nfeData.numero,
              forma_pagamento: formaPagamento || 'BOLETO À VISTA',
              cliente_id: actualFornecedorId,
              created_by: 'Sistema (NF-e)',
              updated_at: new Date()
            }
          });
          results.financeiro.push(mov);
        }
      } catch (finErr) {
        console.error('Erro não fatal ao criar movimentação financeira:', finErr);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Erro ao confirmar importação:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar importação' }, { status: 500 });
  }
}
