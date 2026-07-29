'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ChevronLeft, Calendar, ShieldCheck, DollarSign, Award } from 'lucide-react';
import Link from 'next/link';

function RelatorioPrintContent() {
  const searchParams = useSearchParams();
  const reportType = searchParams?.get('report') || 'resumo';
  
  const [data, setData] = useState<any>(null);
  const [analise, setAnalise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch company configurations
        const companyRes = await fetch('/api/configuracoes/empresa');
        if (companyRes.ok) {
          setCompany(await companyRes.json());
        }

        // Fetch primary summary
        const summaryRes = await fetch('/api/financeiro/resumo', { credentials: 'include' });
        if (summaryRes.ok) {
          setData(await summaryRes.json());
        }

        // Fetch deep analytics
        const analiseRes = await fetch('/api/financeiro/analise', { credentials: 'include' });
        if (analiseRes.ok) {
          setAnalise(await analiseRes.json());
        }
      } catch (err) {
        console.error('Erro ao coletar dados para impressão:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 font-mono text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-4"></div>
        <p className="uppercase tracking-widest font-black text-zinc-500">Compilando Relatório Gerencial...</p>
      </div>
    );
  }

  const currentDateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-mono text-black text-xs leading-relaxed">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .report-table th {
            background-color: #f4f4f5 !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Control panel (Non-Printable) */}
      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl">
        <Link href="/financeiro" className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar ao Painel
        </Link>
        <button 
          onClick={() => window.print()}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg"
        >
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* A4 Page layout */}
      <div className="max-w-4xl mx-auto bg-white p-10 print:p-0 print:shadow-none shadow-2xl border border-zinc-300 print:border-none space-y-8">
        
        {/* Cabecalho Principal */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">
              {company?.nome_fantasia || 'PINHEIRO DIESEL'}
            </h1>
            <p className="text-[10px] font-bold text-zinc-650 uppercase">Plataforma ERP Enterprise Diesel</p>
            <p className="text-[9px] text-zinc-500 leading-tight">
              CNPJ: {company?.cnpj || 'S/N'} | Insc. Est.: {company?.inscricao_estadual || 'ISENTO'}<br />
              Endereço: {company?.endereco || 'Área Industrial Diesel'}, nº {company?.numero || 'S/N'}<br />
              Email: {company?.email || 'admin@pinheirodiesel.com.br'} | Tel: {company?.telefone || '---'}
            </p>
          </div>
          <div className="text-right space-y-2">
            <div className="p-2 border border-black bg-zinc-50 uppercase text-[10px] font-black">
              Relatório Financeiro
            </div>
            <p className="text-[8px] text-zinc-500 uppercase">Fato Gerador: {currentDateStr}</p>
          </div>
        </div>

        {/* METRICS / REPORT TITLE */}
        <div>
          <h2 className="text-sm font-black uppercase border-b border-black pb-1 mb-4 italic">
            Ativo Selecionador: {reportType.toUpperCase()}
          </h2>
        </div>

        {/* CONDITION 1: FLOW RESUMO */}
        {reportType === 'resumo' && (
          <div className="space-y-6">
            <p className="text-[10px] text-zinc-600 uppercase font-black">O demonstrativo de fluxo de caixa expressa a saúde líquida instantânea da corporação.</p>
            <div className="grid grid-cols-4 gap-4 text-center font-mono uppercase text-[10px] border border-black divide-x divide-black bg-zinc-50">
              <div className="p-4">
                <p className="text-[8px] text-zinc-500">Saldo Instantâneo</p>
                <p className="text-xs font-black mt-1 text-zinc-900">{formatCurrency(data?.saldo)}</p>
              </div>
              <div className="p-4">
                <p className="text-[8px] text-zinc-500">Total Faturado</p>
                <p className="text-xs font-black mt-1 text-green-700">{formatCurrency(data?.entradas)}</p>
              </div>
              <div className="p-4">
                <p className="text-[8px] text-zinc-500">Despesas Liquidadas</p>
                <p className="text-xs font-black mt-1 text-red-700">{formatCurrency(data?.saidas)}</p>
              </div>
              <div className="p-4">
                <p className="text-[8px] text-zinc-500">Previsto em Aberto</p>
                <p className="text-xs font-black mt-1">{formatCurrency(data?.previsto)}</p>
              </div>
            </div>

            {/* Quick Ledger table */}
            <div className="space-y-3">
              <p className="font-black text-[9px] uppercase tracking-wider">Histórico Recente de Lançamentos do Mês:</p>
              <table className="w-full text-left report-table border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 text-[9px] uppercase border-b border-zinc-350">
                    <th className="p-2 border-r border-zinc-300">Fato</th>
                    <th className="p-2 border-r border-zinc-300">Descrição / Parcela</th>
                    <th className="p-2 border-r border-zinc-300">Categoria</th>
                    <th className="p-2 border-r border-zinc-300">Pgto</th>
                    <th className="p-2 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {analise?.recorrentes?.map((rec: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-zinc-300">{rec.data ? new Date(rec.data).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-2 border-r border-zinc-300 font-bold uppercase">{rec.descricao}</td>
                      <td className="p-2 border-r border-zinc-300 uppercase">{rec.categoria || 'Nenhum'}</td>
                      <td className="p-2 border-r border-zinc-300 uppercase">{rec.forma_pagamento || 'Fato'}</td>
                      <td className={`p-2 text-right font-bold ${rec.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}`}>
                        {rec.tipo === 'SAIDA' ? '-' : '+'}{formatCurrency(rec.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONDITION 2: DRE REPORT */}
        {reportType === 'dre' && analise?.dre && (
          <div className="space-y-6">
            <p className="text-[10px] text-zinc-650 uppercase">O demonstrativo de resultado consolidado expressa os ganhos operacionais acumulados e margens brutas.</p>
            
            <div className="border border-black p-6 space-y-4 bg-zinc-50">
              <div className="flex justify-between items-baseline border-b border-zinc-300 pb-2">
                <span className="font-bold uppercase">(+) RECEITAS OPERACIONAIS BRUTAS (INFLOWS):</span>
                <span className="text-sm font-black text-green-700">{formatCurrency(analise.dre.totalReceitas)}</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-zinc-300 pb-2">
                <span className="font-bold uppercase">(-) CUSTOS DE MATERIAIS, PARCEIROS E SERVIÇOS:</span>
                <span className="text-sm font-black text-red-700">{formatCurrency(analise.dre.totalDespesas)}</span>
              </div>
              <div className="flex justify-between items-baseline border-b-2 border-black pb-2">
                <span className="font-black uppercase">(=) LUCRO OPERACIONAL LÍQUIDO ANUAL (EBITDA EST.):</span>
                <span className="text-sm font-black">{formatCurrency(analise.dre.lucroLiquido)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold uppercase">APROVEITAMENTO OPERACIONAL / MARGEM BRUTA:</span>
                <span className="text-sm font-black">{analise.dre.margemOperacional}%</span>
              </div>
            </div>

            {/* Categorias */}
            <div className="space-y-3">
              <p className="font-black text-[9px] uppercase tracking-wider">Aproveitamento por Categoria de Rateio Financeiro:</p>
              <table className="w-full text-left report-table border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 text-[9px] uppercase border-b border-zinc-350">
                    <th className="p-2 border-r border-zinc-300">Nome da Conta / Distribuição</th>
                    <th className="p-2 border-r border-zinc-300 text-right">Inflows</th>
                    <th className="p-2 border-r border-zinc-300 text-right">Outflows</th>
                    <th className="p-2 text-right">Saldo Consolidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {analise.dre.categorias.map((cc: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-zinc-300 font-bold uppercase">{cc.categoria}</td>
                      <td className="p-2 border-r border-zinc-300 text-right text-green-700">+{formatCurrency(cc.receitas)}</td>
                      <td className="p-2 border-r border-zinc-300 text-right text-red-700">-{formatCurrency(cc.despesas)}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(cc.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONDITION 3: PREVIEW REPORT */}
        {reportType === 'previsao' && analise?.previsao && (
          <div className="space-y-6">
            <p className="text-[10px] text-zinc-650 uppercase">Previsões baseadas em aging buckets de contas a receber e ordens de serviços comprometidas.</p>
            
            <div className="grid grid-cols-4 gap-4">
              {analise.previsao.map((p: any, idx: number) => (
                <div key={idx} className="border border-black p-4 text-center space-y-2">
                  <p className="font-black uppercase">{p.mes} {p.ano}</p>
                  <p className="text-[9px] text-green-700">Rec: +{formatCurrency(p.entradas)}</p>
                  <p className="text-[9px] text-red-700">Cust: -{formatCurrency(p.saidas)}</p>
                  <p className="text-xs font-black border-t border-black pt-2">Est: {formatCurrency(p.saldoEstimado)}</p>
                </div>
              ))}
            </div>

            {/* Negativados em atraso */}
            <div className="space-y-3 pt-4">
              <p className="font-black text-[9px] uppercase text-red-700">Análise de Sacados Atrasados (Inadimplência Real):</p>
              <table className="w-full text-left report-table border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 text-[9px] uppercase border-b border-zinc-350">
                    <th className="p-2 border-r border-zinc-300">Cedente / Sacado</th>
                    <th className="p-2 border-r border-zinc-300">Identificação</th>
                    <th className="p-2 border-r border-zinc-300">Contato Fone</th>
                    <th className="p-2 border-r border-zinc-300">Vencimento</th>
                    <th className="p-2 text-right">Valor Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {analise.inadimplencia.lista.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center italic uppercase">Sem contas vencidas registradas em carteira</td>
                    </tr>
                  ) : (
                    analise.inadimplencia.lista.map((ln: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-zinc-300 font-bold uppercase">{ln.cliente?.nome || 'Não definido'}</td>
                        <td className="p-2 border-r border-zinc-300 font-mono text-[9px]">{ln.cliente?.cpf_cnpj || '---'}</td>
                        <td className="p-2 border-r border-zinc-300">{ln.cliente?.telefone || '---'}</td>
                        <td className="p-2 border-r border-zinc-300">{ln.data_vencimento ? new Date(ln.data_vencimento).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-2 text-right font-bold text-red-700">{formatCurrency(ln.valor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="text-right font-black text-xs space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase">Valores Totais Líquidos em Aberto: </span>
                <span className="text-red-700">{formatCurrency(analise.inadimplencia.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* DEFAULT COMPILATION FOOTER */}
        <div className="pt-8 border-t border-black grid grid-cols-3 gap-6 items-end text-center uppercase text-[9px]">
          <div className="space-y-6">
            <span className="font-mono text-zinc-500 font-black">Auditado por</span>
            <div className="border-b border-black w-full" />
            <span>Departamento Financeiro</span>
          </div>
          <div className="space-y-6 flex flex-col items-center">
            {/* Simple simulated QR Code to avoid heavy QR Code libs */}
            <div className="border border-black p-1 bg-white h-14 w-14 flex flex-wrap justify-between items-center opacity-75">
              <div className="w-5 h-5 bg-black" />
              <div className="w-3 h-3 bg-zinc-400" />
              <div className="w-4 h-4 bg-black" />
              <div className="w-2 h-2 bg-zinc-300" />
              <div className="w-6 h-6 bg-black" />
            </div>
            <span className="text-[7px]">Selo de Autenticidade Digital</span>
          </div>
          <div className="space-y-6">
            <span className="font-mono text-zinc-500 font-black">Homologado por</span>
            <div className="border-b border-black w-full" />
            <span>Diretoria Pinheiro Diesel</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RelatorioPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 font-mono text-xs">
        <p className="uppercase tracking-widest font-black text-zinc-500">Inicializando ambiente de suspensão...</p>
      </div>
    }>
      <RelatorioPrintContent />
    </Suspense>
  );
}
