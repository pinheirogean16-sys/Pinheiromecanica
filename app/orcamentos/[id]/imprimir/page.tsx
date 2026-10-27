'use client';

import '@/styles/print.css';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { BRANDING } from '@/lib/branding';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import {
  formatCurrency,
  formatDate,
  formatCpfCnpj,
  formatCNPJ,
  numeroPorExtenso,
  waitForPrint,
} from '@/lib/print';

export default function ImprimirOrcamentoPage() {
  const params = useParams();
  const id = params?.id;

  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [emitidoEm] = useState(() => new Date());

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const compData = await apiFetch<any>('/api/configuracoes/empresa/publico', { signal }).catch(() => null);
      if (compData && Object.keys(compData).length > 0) setCompany(compData);

      if (!id) throw new Error('ID inválido');
      
      const orcamentoData = await apiFetch<any>(`/api/orcamentos/${id}`, { signal });
      setOrcamento(orcamentoData);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar Orçamento' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handlePrint = useCallback(async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await waitForPrint();
      window.print();
    } finally {
      setPrinting(false);
    }
  }, [printing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-10 print:hidden">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Orçamento...</p>
        </div>
      </div>
    );
  }

  if (error || !orcamento) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6 print:hidden">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase text-center">Orçamento não encontrado</h1>
        <div className="flex gap-4 mt-2">
          <button onClick={() => fetchData()} className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase">Tentar Novamente</button>
          <Link href="/orcamentos" className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-xl text-[10px] font-black uppercase">Voltar</Link>
        </div>
      </div>
    );
  }

  const logo = company?.logo_url || BRANDING?.logo?.url || null;
  const valorTotal = orcamento.valor_total || 0;
  
  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 print:min-h-0 font-sans text-zinc-800">
      <style jsx global>{`
        @media print {
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }

          header, aside, nav, [role="navigation"], .no-print, button, .print\:hidden {
            display: none !important;
          }

          main, #__next, body > div, .flex-1 {
            background: transparent !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            height: auto !important;
            display: block !important;
          }

          .print-container {
            position: relative !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }

          @page { size: A4 portrait; margin: 12mm 15mm; }
          .avoid-break { page-break-inside: avoid; }
          .breakable { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Barra de Ações - Escondida na impressão */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl print:hidden">
        <Link href={`/orcamentos/${id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button onClick={handlePrint} disabled={printing} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition">
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {printing ? 'Preparando...' : 'Imprimir Orçamento'}
        </button>
      </div>

      {/* Documento */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-8 sm:p-12 print:p-0 print:shadow-none print-container">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b-2 border-zinc-200 pb-6 mb-8 avoid-break">
          <div className="flex items-center gap-6">
            {logo ? (
              <img src={logo} alt="Logo" className="h-20 max-w-[160px] object-contain" />
            ) : (
              <div className="text-2xl font-black italic uppercase">{BRANDING.name}</div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase text-zinc-900 leading-tight">
                {company?.razao_social || company?.nome_fantasia || 'EMPRESA NÃO CONFIGURADA'}
              </h1>
              {company?.nome_fantasia && company.nome_fantasia !== company.razao_social && (
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{company.nome_fantasia}</p>
              )}
              <div className="text-[11px] text-zinc-600 mt-2 space-y-0.5">
                <p><span className="font-bold text-zinc-800">CNPJ:</span> {formatCNPJ(company?.cnpj)} | <span className="font-bold text-zinc-800">IE:</span> {company?.inscricao_estadual || 'ISENTO'}</p>
                <p>{company?.endereco || 'Endereço não configurado'}{company?.numero ? `, ${company.numero}` : ''} {company?.cidade ? `- ${company.cidade}` : ''}{company?.uf ? `/${company.uf}` : ''}</p>
                <p><span className="font-bold text-zinc-800">TEL:</span> {company?.telefone || '—'} | <span className="font-bold text-zinc-800">EMAIL:</span> {company?.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="flex items-stretch border border-zinc-200 rounded-xl overflow-hidden mb-8 shadow-sm avoid-break">
          <div className="flex-1 p-4 bg-zinc-50 flex flex-col justify-center border-r border-zinc-200">
            <h2 className="text-2xl font-black uppercase text-zinc-900 tracking-tight">ORÇAMENTO / PROPOSTA</h2>
            <p className="text-[10px] font-bold uppercase text-orange-600 tracking-widest mt-1">Aprovação de Serviços</p>
          </div>
          <div className="w-48 p-4 text-center flex flex-col justify-center bg-white">
            <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">NÚMERO</p>
            <p className="text-2xl font-black text-zinc-900 leading-none">#{orcamento.numero}</p>
          </div>
        </div>

        {/* DADOS CLIENTE E VEÍCULO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 avoid-break">
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Dados do Cliente</h3>
            <div className="text-xs space-y-1.5">
              <p><span className="font-bold text-zinc-900">NOME:</span> {orcamento.cliente?.nome || '—'}</p>
              <p><span className="font-bold text-zinc-900">CPF/CNPJ:</span> {formatCpfCnpj(orcamento.cliente?.cpf_cnpj)}</p>
              <p><span className="font-bold text-zinc-900">TELEFONE:</span> {orcamento.cliente?.telefone || '—'}</p>
              <p><span className="font-bold text-zinc-900">EMAIL:</span> {orcamento.cliente?.email || '—'}</p>
              <p><span className="font-bold text-zinc-900">ENDEREÇO:</span> {orcamento.cliente?.endereco || '—'} {orcamento.cliente?.cidade ? `- ${orcamento.cliente.cidade}` : ''}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Dados do Veículo</h3>
            {orcamento.veiculo ? (
              <div className="text-xs space-y-2">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Placa</p>
                    <p className="font-black text-sm border border-zinc-300 px-2 py-1 rounded bg-zinc-50">{orcamento.veiculo.placa || '—'}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Marca / Modelo</p>
                    <p className="font-bold uppercase">{orcamento.veiculo.marca || '—'} {orcamento.veiculo.modelo || ''}</p>
                  </div>
                </div>
                <div className="flex gap-4 pt-1">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Ano</p>
                    <p className="font-bold">{orcamento.veiculo.ano_fabricacao || orcamento.veiculo.ano || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">KM</p>
                    <p className="font-bold">{(orcamento.veiculo.quilometragem || 0).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Horímetro</p>
                    <p className="font-bold">{orcamento.veiculo.horimetro_atual || 0}h</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Nenhum veículo vinculado a este orçamento.</p>
            )}

            <div className="mt-4 border-t border-zinc-100 pt-3">
               <p className="text-[11px]"><span className="font-bold text-zinc-900 uppercase">Emissão:</span> {formatDate(orcamento.created_at)}</p>
               <p className="text-[11px]"><span className="font-bold text-red-600 uppercase">Validade:</span> {orcamento.data_validade ? formatDate(orcamento.data_validade) : '7 DIAS AVANTE'}</p>
            </div>
          </div>
        </div>

        {/* SERVIÇOS */}
        <div className="mb-8 breakable">
          <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Descrição dos Serviços (Mão de Obra)</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 border-b-2 border-zinc-300">
                <th className="py-2 px-2 font-bold uppercase">Descrição</th>
                <th className="py-2 px-2 font-bold uppercase text-center w-16">Hrs/Un</th>
                <th className="py-2 px-2 font-bold uppercase text-right w-24">Vlr. Hora</th>
                <th className="py-2 px-2 font-bold uppercase text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.servicos?.length > 0 ? orcamento.servicos.map((s: any) => (
                <tr key={s.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="py-2 px-2 uppercase">{s.descricao || '—'}</td>
                  <td className="py-2 px-2 text-center">{s.horas || 0}h</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(s.valor_hora)}</td>
                  <td className="py-2 px-2 text-right font-bold">{formatCurrency(s.valor_total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-4 text-center italic text-zinc-400">Nenhum serviço especificado</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PEÇAS */}
        <div className="mb-8 breakable">
          <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Peças e Materiais</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 border-b-2 border-zinc-300">
                <th className="py-2 px-2 font-bold uppercase">Descrição</th>
                <th className="py-2 px-2 font-bold uppercase text-center w-16">Qtd</th>
                <th className="py-2 px-2 font-bold uppercase text-right w-24">Vlr. Unit</th>
                <th className="py-2 px-2 font-bold uppercase text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.pecas?.length > 0 ? orcamento.pecas.map((p: any) => (
                <tr key={p.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="py-2 px-2 uppercase">{p.descricao || '—'}</td>
                  <td className="py-2 px-2 text-center">{p.quantidade || 0}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(p.valor_unit)}</td>
                  <td className="py-2 px-2 text-right font-bold">{formatCurrency(p.valor_total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-4 text-center italic text-zinc-400">Nenhuma peça especificada</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* OBSERVAÇÕES E TOTAIS */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8 breakable">
          <div className="flex-1">
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Termos e Condições</h3>
            <p className="text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap">{orcamento.termos_condicoes || 'Preços sujeitos a alteração conforme disponibilidade de estoque.'}</p>
            {orcamento.observacoes && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Observações:</p>
                <p className="text-xs text-zinc-700 whitespace-pre-wrap">{orcamento.observacoes}</p>
              </div>
            )}
          </div>
          
          <div className="w-full sm:w-72 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Serviços</span><span className="font-bold">{formatCurrency(orcamento.valor_servicos)}</span></div>
            <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Peças</span><span className="font-bold">{formatCurrency(orcamento.valor_pecas)}</span></div>
            {orcamento.desconto > 0 && <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-red-600"><span className="font-bold uppercase">Desconto</span><span className="font-bold">- {formatCurrency(orcamento.desconto)}</span></div>}
            <div className="p-4 flex justify-between items-center bg-zinc-900 text-white">
              <span className="text-[10px] font-black uppercase tracking-widest">Investimento</span>
              <span className="text-xl font-black">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        </div>

        {/* EXTENSO */}
        <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-3 mb-10 breakable">
          <p className="text-[11px] text-zinc-600"><span className="font-bold uppercase text-zinc-900">Valor por extenso:</span> <span className="italic capitalize">{numeroPorExtenso(valorTotal)}</span></p>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-12 pb-8 px-8 avoid-break">
          <div className="border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p className="font-black uppercase text-zinc-800">Responsável Técnico</p>
            <p className="text-zinc-500">{company?.nome_fantasia || BRANDING.name}</p>
          </div>
          <div className="border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p className="font-black uppercase text-zinc-800">Aceite do Cliente</p>
            <p className="text-zinc-500">{orcamento.cliente?.nome || ''}</p>
            <p className="text-zinc-500 mt-1">Data: ____/____/______</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-6 border-t border-zinc-200 avoid-break">
          <p className="text-[9px] uppercase text-zinc-400">Proposta comercial válida por tempo limitado. Este documento não possui valor fiscal.</p>
          {company?.rodape_personalizado && <p className="text-[10px] text-zinc-600 mt-2 italic whitespace-pre-wrap">{company.rodape_personalizado}</p>}
          <p className="text-[10px] uppercase font-bold text-zinc-800 mt-4">{company?.cidade || 'CIDADE'}, {dataFormatada}</p>
          <p className="text-[9px] text-zinc-500 mt-1">Emitido em {emitidoEm.toLocaleString('pt-BR')}</p>
          <p className="text-[9px] font-bold text-zinc-300 mt-1 uppercase tracking-widest">{BRANDING.name}</p>
        </div>

      </div>
    </div>
  );
}
