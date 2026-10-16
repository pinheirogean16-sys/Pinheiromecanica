import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { parseNFeXML } from '@/lib/parse-nfe';
import { roundDecimal } from '@/lib/utils';
import { z } from 'zod';

// ============================================================
// A03: o servidor NÃO confia no `nfeData` enviado pelo cliente.
// Recebe o XML bruto, reparseia e usa SOMENTE a saída do parser.
// ============================================================
const confirmSchema = z.object({
  xml: z.string().min(20, 'XML da NF-e é obrigatório'),
  importFornecedor: z.boolean().optional().default(true),
  itensParaImportar: z.array(z.number().int().nonnegative()).optional().default([]),
  importarFinanceiro: z.boolean().optional().default(false),
  formaPagamento: z.string().optional().default('BOLETO À VISTA'),
  numParcelas: z.number().int().positive().max(60).optional().default(1),
  diasEntreParcelas: z.number().int().positive().max(180).optional().default(28),
  dataPrimeiraParcela: z.string().optional().nullable(),
  categoriaPecas: z.string().optional().default('OUTROS'),
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

    // A03: parsear o XML no servidor. Se estiver inválido, o parser lança.
    let nfeData;
    try {
      nfeData = parseNFeXML(xml);
    } catch (err: any) {
      log('WARN', 'NFE', 'XML rejeitado pelo parser', { error: err?.message }, user?.name);
      return NextResponse.json(
        { error: err?.message || 'XML da NF-e inválido ou corrompido' },
        { status: 400 }
      );
    }

    const empresa_id = user.empresa_id;

    // A03: validar duplicidade pela chave de acesso (UNIQUE lógico).
    // Se já existe movimentação financeira com essa chave, rejeitamos.
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
      if (importFornecedor && nfeData.fornecedor) {
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

        // A03: o parser já validou código, descrição, quantidade e valor unitário.
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
          // Atualiza estoque, custo e preço de venda proporcional ao markup anterior
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

        // Registro de movimentação de estoque — SEMPRE (nunca apaga)
        await tx.movimentacaoEstoque.create({
          data: {
            id: globalThis.crypto.randomUUID(),
            empresa_id,
            peca_id: pecaDb.id,
            tipo: 'ENTRADA',
            quantidade,
            motivo: 'COMPRA',
            observacao: `NF-e ${nfeData.numero} série ${nfeData.serie} | chave ${nfeData.chaveAcesso} | unidade ${unidade} | fornecedor ${nfeData.fornecedor.razaoSocial}`,
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
        const descricaoBase = `Compra NF-e ${nfeData.numero}/${nfeData.serie} — ${nfeData.fornecedor.razaoSocial}`;
        const statusInicial =
          formaPagamento === 'DINHEIRO' || formaPagamento === 'PIX' ? 'PAGO' : 'PENDENTE';

        const isParcelado =
          (formaPagamento === 'BOLETO PARCELADO' || formaPagamento === 'PARCELADO') &&
          numParcelas > 1;

        if (isParcelado) {
          // A03: parcelas com ajuste de centavos — a última absorve o resto
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
              forma_pagamento: formaPagamento || 'BOLETO À VISTA',
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
        fornecedor: nfeData.fornecedor.razaoSocial,
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
    log(
      'ERROR',
      'NFE',
      'Erro ao confirmar importação',
      { error: error?.message },
      'sistema'
    );
    return NextResponse.json(
      { error: error.message || 'Erro ao processar importação' },
      { status: 500 }
    );
  }
}
