import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { parseNFeXML } from '@/lib/parse-nfe';
import { roundDecimal } from '@/lib/utils';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// ============================================================
// LIMITES DE SEGURANÇA
// ============================================================
const MAX_XML_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ITENS_IMPORTAR = 1000;

const CATEGORIAS_PECA = [
  'MOTOR', 'INJECAO_ELETRONICA', 'TURBO', 'FREIOS', 'SUSPENSAO',
  'TRANSMISSAO', 'FILTROS', 'OLEOS_LUBRIFICANTES', 'ARREFECIMENTO',
  'ESCAPAMENTO', 'ELETRICA', 'OUTROS',
] as const;

const FORMAS_PAGAMENTO = [
  'DINHEIRO', 'PIX', 'BOLETO À VISTA', 'BOLETO PARCELADO', 'PARCELADO', 'CARTAO',
] as const;

// ============================================================
// SANITIZAÇÃO CONTRA LOG INJECTION / QUEBRA DE TEXTO
// ============================================================
function sanitizeText(v: string | undefined | null, maxLen = 500): string {
  if (!v) return '';
  return v.replace(/[\r\n\t]/g, ' ').slice(0, maxLen);
}

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const confirmSchema = z.object({
  xml: z.string().min(20, 'XML da NF-e é obrigatório').max(MAX_XML_SIZE, 'XML muito grande'),
  importFornecedor: z.boolean().optional().default(true),
  itensParaImportar: z.array(z.number().int().nonnegative()).max(MAX_ITENS_IMPORTAR).optional().default([]),
  importarFinanceiro: z.boolean().optional().default(false),
  formaPagamento: z.enum(FORMAS_PAGAMENTO).optional().default('BOLETO À VISTA'),
  numParcelas: z.number().int().positive().max(60).optional().default(1),
  diasEntreParcelas: z.number().int().positive().max(180).optional().default(28),
  dataPrimeiraParcela: z.string().optional().nullable().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data da primeira parcela inválida' }
  ),
  categoriaPecas: z.enum(CATEGORIAS_PECA).optional().default('OUTROS'),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'nfe', 'importar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      xml,
      importFornecedor,
      itensParaImportar,
      importarFinanceiro,
      formaPagamento,
      numParcelas,
      diasEntreParcelas,
      dataPrimeiraParcela,
      categoriaPecas,
    } = parsed.data;

    // A03: parsear o XML no servidor.
    let nfeData;
    try {
      nfeData = parseNFeXML(xml);
    } catch (err: any) {
      // ✅ Não vaza a mensagem interna do parser
      log('WARN', 'NFE', 'XML rejeitado pelo parser', { error: err?.message }, user?.name);
      return NextResponse.json(
        { error: 'XML da NF-e inválido ou corrompido' },
        { status: 400 }
      );
    }

    // ✅ Valida se o parser retornou uma estrutura válida
    if (!nfeData || !Array.isArray(nfeData.itens) || nfeData.itens.length === 0) {
      return NextResponse.json(
        { error: 'XML da NF-e inválido ou sem itens' },
        { status: 400 }
      );
    }

    // ✅ Limita o número de itens
    if (nfeData.itens.length > MAX_ITENS_IMPORTAR) {
      return NextResponse.json(
        { error: `NF-e com itens demais (${nfeData.itens.length}). Máximo: ${MAX_ITENS_IMPORTAR}.` },
        { status: 400 }
      );
    }

    const empresa_id = user.empresa_id;

    // A03: validar duplicidade pela chave de acesso (UNIQUE lógico).
    const jaImportada = await prisma.movimentacaoFinanceira.findFirst({
      where: {
        empresa_id,
        numero_documento: nfeData.chaveAcesso,
        categoria: 'COMPRA_MERCADORIA',
      },
      select: { id: true, created_at: true },
    });

    if (jaImportada) {
      return NextResponse.json(
        {
          error: `Esta NF-e (chave ${nfeData.chaveAcesso.slice(-8)}) já foi importada em ${jaImportada.created_at.toLocaleDateString('pt-BR')}.`,
        },
        { status: 409 }
      );
    }

    const results: any = {
      fornecedor: null,
      pecas: [],
      financeiro: [],
      stats: {
        criados: 0,
        atualizados: 0,
        total: 0,
      },
    };

    await prisma.$transaction(async (tx) => {
      // ============================================================
      // 1. Fornecedor
      // ============================================================
      let actualFornecedorId: string | null = null;
      if (importFornecedor && nfeData.fornecedor && nfeData.fornecedor.cnpj) {
        const f = nfeData.fornecedor;
        const cnpjStr = f.cnpj.replace(/\D/g, '');
        if (cnpjStr) {
          const existing = await tx.cliente.findFirst({
            where: { cpf_cnpj: cnpjStr, empresa_id },
          });
          const newPerfil = existing
            ? existing.perfil === 'CLIENTE'
              ? 'AMBOS'
              : existing.perfil
            : 'FORNECEDOR';

          const fornecedorDb = await tx.cliente.upsert({
            where: {
              cpf_cnpj_empresa_id: { cpf_cnpj: cnpjStr, empresa_id },
            },
            update: {
              nome: f.razaoSocial,
              razao_social: f.razaoSocial,
              nome_fantasia: f.nomeFantasia || null,
              inscricao_estadual: f.ie || null,
              endereco: f.endereco || null,
              bairro: f.bairro || null,
              cidade: f.cidade || null,
              uf: f.uf || null,
              estado: f.uf || null,
              cep: f.cep || null,
              perfil: newPerfil,
              updated_at: new Date(),
            },
            create: {
              id: globalThis.crypto.randomUUID(),
              empresa_id,
              cpf_cnpj: cnpjStr,
              nome: f.razaoSocial,
              razao_social: f.razaoSocial,
              nome_fantasia: f.nomeFantasia || null,
              inscricao_estadual: f.ie || null,
              endereco: f.endereco || null,
              bairro: f.bairro || null,
              cidade: f.cidade || null,
              uf: f.uf || null,
              estado: f.uf || null,
              cep: f.cep || null,
              tipo: 'PJ' as const,
              tipo_pessoa: 'JURIDICA',
              telefone: 'N/A',
              perfil: 'FORNECEDOR',
              updated_at: new Date(),
            },
          });

          actualFornecedorId = fornecedorDb.id;
          results.fornecedor = fornecedorDb;
        }
      }

      // ============================================================
      // 2. Peças + Movimentação de Estoque
      // ============================================================
      const indices =
        itensParaImportar.length > 0
          ? itensParaImportar
          : nfeData.itens.map((_, i) => i);

      results.stats.total = indices.length;

      for (const index of indices) {
        const item = nfeData.itens[index];
        if (!item) continue;

        const codigo = item.codigo;
        const descricao = item.descricao;
        const quantidade = item.quantidade;
        const unidade = item.unidade;
        const precoCusto = roundDecimal(item.valorUnitario);

        const existingPeca = await tx.peca.findUnique({
          where: { codigo_empresa_id: { codigo, empresa_id } },
        });

        let pecaDb;

        if (existingPeca) {
          const precoCustoAntigo = Number(existingPeca.preco_custo);
          const precoVendaAntigo = Number(existingPeca.preco_venda);
          const markup = precoCustoAntigo > 0 ? precoVendaAntigo / precoCustoAntigo : 1.5;
          const novoPrecoVenda = roundDecimal(precoCusto * markup);

          pecaDb = await tx.peca.update({
            where: { id: existingPeca.id },
            data: {
              quantidade: { increment: quantidade },
              preco_custo: precoCusto,
              preco_venda: novoPrecoVenda > 0 ? novoPrecoVenda : existingPeca.preco_venda,
              updated_by: user?.name || 'Sistema (importação)',
              updated_at: new Date(),
            },
          });
          results.stats.atualizados++;
        } else {
          pecaDb = await tx.peca.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              empresa_id,
              codigo,
              descricao,
              quantidade,
              preco_custo: precoCusto,
              preco_venda: roundDecimal(precoCusto * 1.5),
              categoria: categoriaPecas as any,
              localizacao: 'NFE IMPORT',
              created_by: user?.name || 'Sistema (importação)',
              updated_at: new Date(),
            },
          });
          results.stats.criados++;
        }

        // ✅ Sanitiza o nome do fornecedor na observação
        const fornecedorNome = sanitizeText(nfeData.fornecedor?.razaoSocial || 'Fornecedor não identificado', 200);

        await tx.movimentacaoEstoque.create({
          data: {
            id: globalThis.crypto.randomUUID(),
            empresa_id,
            peca_id: pecaDb.id,
            tipo: 'ENTRADA',
            quantidade,
            motivo: 'COMPRA',
            observacao: `NF-e ${nfeData.numero} série ${nfeData.serie} | chave ${nfeData.chaveAcesso} | unidade ${unidade} | fornecedor ${fornecedorNome}`,
            usuario_id: user.id,
          },
        });

        results.pecas.push(pecaDb);
      }

      // ============================================================
      // 3. Financeiro
      // ============================================================
      if (importarFinanceiro) {
        const valorTotal = roundDecimal(nfeData.totais.valorNF);
        const fornecedorNome = sanitizeText(nfeData.fornecedor?.razaoSocial || 'Fornecedor', 200);
        const descricaoBase = `Compra NF-e ${nfeData.numero}/${nfeData.serie} — ${fornecedorNome}`;
        const statusInicial =
          formaPagamento === 'DINHEIRO' || formaPagamento === 'PIX' ? 'PAGO' : 'PENDENTE';

        const isParcelado =
          (formaPagamento === 'BOLETO PARCELADO' || formaPagamento === 'PARCELADO') &&
          numParcelas > 1;

        if (isParcelado) {
          const valorParcelaBase = Math.floor((valorTotal * 100) / numParcelas) / 100;
          const somaBase = roundDecimal(valorParcelaBase * (numParcelas - 1));
          const ultimaParcela = roundDecimal(valorTotal - somaBase);

          const baseDate = dataPrimeiraParcela
            ? new Date(dataPrimeiraParcela)
            : new Date(nfeData.dataEmissao);

          for (let i = 0; i < numParcelas; i++) {
            const isUltima = i === numParcelas - 1;
            const valorParcela = isUltima ? ultimaParcela : valorParcelaBase;

            const vencimento = new Date(baseDate);
            vencimento.setDate(vencimento.getDate() + i * diasEntreParcelas);
            vencimento.setUTCHours(12, 0, 0, 0);

            const mov = await tx.movimentacaoFinanceira.create({
              data: {
                id: globalThis.crypto.randomUUID(),
                empresa_id,
                tipo: 'SAIDA',
                descricao: `${descricaoBase} — Parcela ${i + 1}/${numParcelas}`,
                valor: valorParcela,
                data: new Date(nfeData.dataEmissao),
                data_vencimento: vencimento,
                status: statusInicial,
                categoria: 'COMPRA_MERCADORIA',
                numero_documento: nfeData.chaveAcesso,
                forma_pagamento: formaPagamento,
                cliente_id: actualFornecedorId,
                created_by: user?.name || user?.email || 'Sistema (NF-e)',
                updated_at: new Date(),
              },
            });
            results.financeiro.push(mov);
          }
        } else {
          const vencimento =
            formaPagamento === 'BOLETO À VISTA' && dataPrimeiraParcela
              ? new Date(dataPrimeiraParcela)
              : new Date(nfeData.dataEmissao);
          vencimento.setUTCHours(12, 0, 0, 0);

          const mov = await tx.movimentacaoFinanceira.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              empresa_id,
              tipo: 'SAIDA',
              descricao: descricaoBase,
              valor: valorTotal,
              data: new Date(nfeData.dataEmissao),
              data_vencimento: vencimento,
              status: statusInicial,
              categoria: 'COMPRA_MERCADORIA',
              numero_documento: nfeData.chaveAcesso,
              forma_pagamento: formaPagamento,
              cliente_id: actualFornecedorId,
              created_by: user?.name || user?.email || 'Sistema (NF-e)',
              updated_at: new Date(),
            },
          });
          results.financeiro.push(mov);
        }
      }
    });

    await createAuditLog({
      modulo: 'NFE',
      acao: 'IMPORTAR',
      entidade: 'NFe',
      entidade_id: nfeData.chaveAcesso,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id,
      dados_depois: {
        chave: nfeData.chaveAcesso,
        numero: nfeData.numero,
        serie: nfeData.serie,
        fornecedor: nfeData.fornecedor?.razaoSocial || 'N/A',
        itensImportados: results.stats.total,
        criados: results.stats.criados,
        atualizados: results.stats.atualizados,
        financeiroCriado: results.financeiro.length,
      },
    });

    log(
      'INFO',
      'NFE',
      'NF-e importada',
      {
        chave: nfeData.chaveAcesso,
        numero: nfeData.numero,
        criados: results.stats.criados,
        atualizados: results.stats.atualizados,
      },
      user?.name
    );

    if (user?.empresa_id) {
      const { invalidateDashboardCache } = await import('@/lib/dashboard-cache');
      invalidateDashboardCache(user.empresa_id);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado (não vaza detalhes internos)
    return apiError(error, 'NFE', 'Erro ao processar importação');
  }
}
