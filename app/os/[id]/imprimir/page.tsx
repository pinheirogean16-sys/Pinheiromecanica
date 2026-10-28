'use client';

import '@/styles/print.css';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatHoras } from '@/lib/utils';
import { BRANDING } from '@/lib/branding';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import {
  formatCurrency,
  formatDateTime,
  formatCpfCnpj,
  formatCNPJ,
  numeroPorExtenso,
  waitForPrint,
} from '@/lib/print';

function extrairObservacoes(obs: any): string | null {
  if (!obs || typeof obs !== 'string') return null;
  const trimmed = obs.trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
  return trimmed;
}

export default function ImprimirOSPage() {
  const params = useParams();
  const id = params?.id;
  const [os, setOs] = useState<any>(null);
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
      const osData = await apiFetch<any>(`/api/ordens/${id}`, { signal });
      setOs(osData);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar OS' });
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
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6 print:hidden">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase text-center">OS não encontrada</h1>
        <div className="flex gap-4 mt-2">
          <button onClick={() => fetchData()} className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase">Tentar Novamente</button>
          <Link href="/os" className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-xl text-[10px] font-black uppercase">Voltar</Link>
        </div>
      </div>
    );
  }

  const logo = company?.logo_url || BRANDING?.logo?.url || null;
  const totalServicos = os.servicos?.reduce((acc: number, s: any) => acc + (s.valor_total || 0), 0) || 0;
  const totalPecas = os.pecas_aplicadas?.reduce((acc: number, p: any) => acc + (p.valor_total || 0), 0) || 0;
  const desconto = os.desconto || 0;
  const valorTotal = os.valor_total !== undefined ? os.valor_total : (totalServicos + totalPecas - desconto);
  const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const tipoOSLabel = os.tipoOS === 'CAMPO' || os.tipo_atendimento === 'CAMPO' ? 'ATENDIMENTO EXTERNO / CAMPO' : 'OFICINA';
  const observacoesLimpa = extrairObservacoes(os.observacoes);
  const numeroOS = os.numero ? os.numero.toString().padStart(6, '0') : 'S/N';

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 print:min-h-0 font-sans text-zinc-800">
      <style jsx global>{`
        @media print {
          html, body {
            background: #ffffff !important; background-color: #ffffff !important;
            margin: 0 !important; padding: 0 !important; min-height: 0 !important; height: auto !important;
          }
          header, aside, nav, [role="navigation"], .no-print, button, .print\:hidden { display: none !important; }
          main, #__next, body > div, .flex-1 {
            background: transparent !important; background-color: transparent !important;
            padding: 0 !important; margin: 0 !important; box-shadow: none !important;
            overflow: visible !important; height: auto !important; display: block !important;
          }
          .print-container {
            position: relative !important; display: block !important; width: 100% !important;
            max-width: 100% !important; margin: 0 !important; padding: 0 !important;
            background: #ffffff !important; box-shadow: none !important; border: none !important;
          }
          @page { size: A4 portrait; margin: 10mm 15mm; }
          .avoid-break { page-break-inside: avoid; }
          .breakable { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Barra de Ações */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl print:hidden">
        <Link href={`/os/${id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button onClick={handlePrint} disabled={printing} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition">
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {printing ? 'Preparando...' : 'Imprimir OS'}
        </button>
      </div>

      {/* Documento */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-8 sm:p-12 print:p-0 print:shadow-none print-container">
        
        {/* CABEÇALHO DA EMPRESA */}
        <div className="flex items-center justify-between border-b-2 border-zinc-200 py-6 mb-6 avoid-break">
          <div className="flex items-center gap-6">
            {logo ? (
              <img src={logo} alt="Logo" className="h-24 max-w-[180px] object-contain" />
            ) : (
              <div className="text-3xl font-black italic uppercase">{BRANDING.name}</div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase text-zinc-900 leading-tight">
                {company?.razao_social || company?.nome_fantasia || 'EMPRESA NÃO CONFIGURADA'}
              </h1>
              {company?.nome_fantasia && company.nome_fantasia !== company.razao_social && (
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide">{company.nome_fantasia}</p>
              )}
              <div className="text-xs text-zinc-600 mt-2 space-y-1">
                <p><span className="font-bold text-zinc-800">CNPJ:</span> {formatCNPJ(company?.cnpj)} | <span className="font-bold text-zinc-800">IE:</span> {company?.inscricao_estadual || 'ISENTO'}</p>
                <p>{company?.endereco || 'Endereço não configurado'}{company?.numero ? `, ${company.numero}` : ''} {company?.cidade ? `- ${company.cidade}` : ''}{company?.uf ? `/${company.uf}` : ''}</p>
                <p><span className="font-bold text-zinc-800">TEL:</span> {company?.telefone || '—'} | <span className="font-bold text-zinc-800">EMAIL:</span> {company?.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TÍTULO CENTRALIZADO COM EXTREMIDADES */}
        <div className="border border-zinc-200 rounded-lg mb-4 shadow-sm avoid-break px-6 py-4 bg-white relative">
          <div className="grid grid-cols-3 items-center">
            
            {/* Lado Esquerdo - Número */}
            <div className="text-left">
              <p className="text-[8px] font-bold uppercase text-zinc-500 mb-0.5">NÚMERO</p>
              <p className="text-xl font-black text-zinc-900 leading-none">#{numeroOS}</p>
            </div>

            {/* Centro - Título */}
            <div className="text-center">
              <h2 className="text-2xl font-black uppercase text-zinc-900 tracking-widest leading-none">ORDEM DE SERVIÇO</h2>
              <p className="text-[9px] font-bold uppercase text-orange-600 tracking-widest mt-1">{tipoOSLabel}</p>
            </div>

            {/* Lado Direito - Status */}
            <div className="text-right">
              <p className="text-[8px] font-bold uppercase text-zinc-500 mb-0.5">STATUS</p>
              <p className="text-xs font-black text-zinc-900 uppercase mt-1">{os.status?.replace(/_/g, ' ')}</p>
            </div>

          </div>
        </div>

        {/* DADOS CLIENTE E VEÍCULO - LADO A LADO */}
        <div className="grid grid-cols-2 gap-6 mb-4 avoid-break">
          <div>
            <h3 className="text-[10px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-1.5 tracking-wider">Dados do Cliente</h3>
            <div className="text-[11px] space-y-1">
              <p><span className="font-bold text-zinc-900">NOME:</span> {os.cliente?.nome || '—'}</p>
              <p><span className="font-bold text-zinc-900">CPF/CNPJ:</span> {formatCpfCnpj(os.cliente?.cpf_cnpj)}</p>
              <p><span className="font-bold text-zinc-900">TELEFONE:</span> {os.cliente?.telefone || '—'}</p>
              <p><span className="font-bold text-zinc-900">EMAIL:</span> {os.cliente?.email || '—'}</p>
              <p><span className="font-bold text-zinc-900">ENDEREÇO:</span> {os.cliente?.endereco || '—'} {os.cliente?.cidade ? `- ${os.cliente.cidade}` : ''}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-[10px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-1.5 tracking-wider">Dados do Veículo</h3>
            <div className="text-[11px] space-y-1.5">
              <div className="flex gap-4">
                <div>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase">Placa</p>
                  <p className="font-black text-xs border border-zinc-300 px-1.5 py-0.5 rounded bg-zinc-50">{os.veiculo?.placa || '—'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-zinc-500 uppercase">Marca / Modelo</p>
                  <p className="font-bold uppercase">{os.veiculo?.marca || '—'} {os.veiculo?.modelo || ''}</p>
                </div>
              </div>
              <div className="flex gap-4 pt-0.5">
                <div>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase">Ano</p>
                  <p className="font-bold">{os.veiculo?.ano_fabricacao || os.veiculo?.ano || '—'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase">KM</p>
                  <p className="font-bold">{(os.km_entrada || os.veiculo?.quilometragem || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase">Horímetro</p>
                  <p className="font-bold">{os.horimetro_entrada || os.veiculo?.horimetro_atual || 0}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SERVIÇOS */}
        <div className="mb-4 breakable">
          <h3 className="text-[10px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-1.5 tracking-wider">Serviços Realizados</h3>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 border-b border-zinc-300">
                <th className="py-1 px-2 font-bold uppercase">Descrição</th>
                <th className="py-1 px-2 font-bold uppercase text-center w-16">Horas</th>
                <th className="py-1 px-2 font-bold uppercase text-right w-24">Vlr. Hora</th>
                <th className="py-1 px-2 font-bold uppercase text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos?.length > 0 ? os.servicos.map((s: any) => (
                <tr key={s.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="py-1 px-2 uppercase">{s.descricao || '—'}</td>
                  <td className="py-1 px-2 text-center">{formatHoras(s.horas || 0)}</td>
                  <td className="py-1 px-2 text-right">{formatCurrency(s.valor_hora)}</td>
                  <td className="py-1 px-2 text-right font-bold">{formatCurrency(s.valor_total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-2 text-center italic text-zinc-400">Nenhum serviço registrado.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-300 bg-zinc-50">
                <td colSpan={3} className="py-1 px-2 text-right font-bold uppercase text-zinc-600 text-[9px]">Subtotal Serviços:</td>
                <td className="py-1 px-2 text-right font-black">{formatCurrency(totalServicos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PEÇAS */}
        <div className="mb-4 breakable">
          <h3 className="text-[10px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-1.5 tracking-wider">Peças e Materiais</h3>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 border-b border-zinc-300">
                <th className="py-1 px-2 font-bold uppercase w-20">Código</th>
                <th className="py-1 px-2 font-bold uppercase">Descrição</th>
                <th className="py-1 px-2 font-bold uppercase text-center w-16">Qtd</th>
                <th className="py-1 px-2 font-bold uppercase text-right w-24">Vlr. Unit</th>
                <th className="py-1 px-2 font-bold uppercase text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {os.pecas_aplicadas?.length > 0 ? os.pecas_aplicadas.map((p: any) => (
                <tr key={p.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="py-1 px-2 font-bold uppercase">{p.peca?.codigo || p.peca?.codigo_interno || '—'}</td>
                  <td className="py-1 px-2 uppercase">{p.peca?.descricao || p.descricao || '—'}</td>
                  <td className="py-1 px-2 text-center">{p.quantidade || 0} {p.unidade || p.peca?.unidadeMedida || ''}</td>
                  <td className="py-1 px-2 text-right">{formatCurrency(p.valor_unit)}</td>
                  <td className="py-1 px-2 text-right font-bold">{formatCurrency(p.valor_total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-2 text-center italic text-zinc-400">Nenhuma peça aplicada.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-300 bg-zinc-50">
                <td colSpan={4} className="py-1 px-2 text-right font-bold uppercase text-zinc-600 text-[9px]">Subtotal Peças:</td>
                <td className="py-1 px-2 text-right font-black">{formatCurrency(totalPecas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* OBSERVAÇÕES E TOTAIS */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 breakable">
          <div className="flex-1">
            <h3 className="text-[10px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-1.5 tracking-wider">Relato Técnico / Obs</h3>
            <p className="text-[11px] leading-relaxed text-zinc-700 whitespace-pre-wrap">{os.diagnostico || 'Nenhuma observação registrada.'}</p>
            {observacoesLimpa && (
              <p className="text-[11px] leading-relaxed text-zinc-700 whitespace-pre-wrap mt-1">{observacoesLimpa}</p>
            )}
          </div>
          
          <div className="w-full sm:w-64 bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-2 flex justify-between text-[11px] border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Serviços</span><span className="font-bold">{formatCurrency(totalServicos)}</span></div>
            <div className="p-2 flex justify-between text-[11px] border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Peças</span><span className="font-bold">{formatCurrency(totalPecas)}</span></div>
            {desconto > 0 && <div className="p-2 flex justify-between text-[11px] border-b border-zinc-200 text-red-600"><span className="font-bold uppercase">Desconto</span><span className="font-bold">- {formatCurrency(desconto)}</span></div>}
            <div className="p-3 flex justify-between items-center bg-zinc-900 text-white">
              <span className="text-[10px] font-black uppercase tracking-widest">Total Geral</span>
              <span className="text-lg font-black">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        </div>

        {/* EXTENSO */}
        <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-2 mb-4 breakable">
          <p className="text-[10px] text-zinc-600"><span className="font-bold uppercase text-zinc-900">Valor por extenso:</span> <span className="italic capitalize">{numeroPorExtenso(valorTotal)}</span></p>
        </div>

        {/* DATAS E RESPONSÁVEIS */}
        <div className="grid grid-cols-3 gap-3 mb-6 breakable">
          <div className="bg-zinc-50 border border-zinc-200 p-2 rounded-lg"><p className="text-[8px] font-bold uppercase text-zinc-500 mb-0.5">Mecânico Resp.</p><p className="font-black text-[10px] uppercase truncate">{os.mecanico?.name || 'NÃO ESPECIFICADO'}</p></div>
          <div className="bg-zinc-50 border border-zinc-200 p-2 rounded-lg"><p className="text-[8px] font-bold uppercase text-zinc-500 mb-0.5">Abertura</p><p className="font-black text-[10px]">{formatDateTime(os.data_abertura || os.created_at)}</p></div>
          <div className="bg-zinc-50 border border-zinc-200 p-2 rounded-lg"><p className="text-[8px] font-bold uppercase text-zinc-500 mb-0.5">Pagamento</p><p className="font-black text-[10px] uppercase truncate">{os.forma_pagamento || 'A RECEBER'}{os.numero_parcelas > 1 ? ` (${os.numero_parcelas}x)` : ''}</p></div>
        </div>

        {/* ASSINATURA DIGITAL */}
        {os.assinatura_hash && (
          <div className="border border-zinc-200 bg-zinc-50 p-2 rounded-lg mb-6 text-[8px] breakable">
            <p className="font-bold uppercase text-zinc-500 mb-0.5">Documento Assinado Digitalmente</p>
            <p className="break-all font-mono text-zinc-700">Hash: {os.assinatura_hash}</p>
            {os.assinatura_timestamp && <p className="mt-0.5 text-zinc-500"><span className="font-bold">Assinado em:</span> {formatDateTime(os.assinatura_timestamp)}</p>}
          </div>
        )}

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-8 pb-4 px-8 avoid-break">
          <div className="border-t border-zinc-400 pt-1 text-center text-[9px]">
            <p className="font-black uppercase text-zinc-800">Responsável pela Oficina</p>
            <p className="text-zinc-500">{company?.nome_fantasia || BRANDING.name}</p>
          </div>
          <div className="border-t border-zinc-400 pt-1 text-center text-[9px]">
            <p className="font-black uppercase text-zinc-800">Assinatura do Cliente</p>
            <p className="text-zinc-500">{os.cliente?.nome || ''}</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-2 border-t border-zinc-200 avoid-break">
          <p className="text-[8px] uppercase text-zinc-400">Este documento é uma representação dos serviços executados e peças aplicadas, não tendo valor fiscal.</p>
          {company?.rodape_personalizado && <p className="text-[9px] text-zinc-600 mt-1 italic whitespace-pre-wrap">{company.rodape_personalizado}</p>}
          <p className="text-[9px] uppercase font-bold text-zinc-800 mt-2">{company?.cidade || 'CIDADE'}, {dataFormatada}</p>
          <p className="text-[8px] text-zinc-500 mt-0.5">Emitido em {emitidoEm.toLocaleString('pt-BR')}</p>
          <p className="text-[8px] font-bold text-zinc-300 mt-0.5 uppercase tracking-widest">{BRANDING.name}</p>
        </div>

      </div>
    </div>
  );
}
