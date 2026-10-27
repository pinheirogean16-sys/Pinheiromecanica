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
  formatDate,
  formatDateTime,
  formatCpfCnpj,
  formatCNPJ,
  waitForPrint,
} from '@/lib/print';

export default function ImprimirPreventivaPage() {
  const params = useParams();
  const id = params?.id;

  const [preventiva, setPreventiva] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [emitidoEm] = useState(() => new Date());

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const [prevData, compData] = await Promise.all([
        apiFetch<any>(`/api/preventivas/${id}`, { signal }),
        apiFetch<any>('/api/configuracoes/empresa/publico', { signal }).catch(() => null),
      ]);

      if (prevData) setPreventiva(prevData);
      if (compData && Object.keys(compData).length > 0) setCompany(compData);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar dados da preventiva' });
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
      <div className="min-h-screen flex items-center justify-center bg-white print:hidden">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Preventiva...</p>
        </div>
      </div>
    );
  }

  if (error || !preventiva) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 print:hidden">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase text-zinc-800">Erro ao carregar dados do relatório.</h1>
        <div className="flex gap-4 mt-2">
          <button onClick={() => fetchData()} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition">
            <RefreshCw size={14} /> Tentar Novamente
          </button>
          <Link href="/preventivas" className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition">
            Voltar para Listagem
          </Link>
        </div>
      </div>
    );
  }

  const veiculo = preventiva.Veiculo || preventiva.veiculo;
  const cliente = veiculo?.Cliente || veiculo?.cliente;
  const fotos = preventiva.fotos && Array.isArray(preventiva.fotos) ? preventiva.fotos : [];
  
  const logo = company?.logo_url || BRANDING?.logo?.url || null;
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

      {/* Botões de Ação - Escondidos na impressão */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl print:hidden">
        <Link href="/preventivas" className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button onClick={handlePrint} disabled={printing} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition">
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {printing ? 'Preparando...' : 'Imprimir Ficha'}
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
                <p><span className="font-bold text-zinc-800">CNPJ:</span> {formatCNPJ(company?.cnpj)} | <span className="font-bold text-zinc-800">TEL:</span> {company?.telefone || '—'}</p>
                <p>{company?.endereco || 'Endereço não configurado'}{company?.numero ? `, ${company.numero}` : ''} {company?.cidade ? `- ${company.cidade}` : ''}{company?.uf ? `/${company.uf}` : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="flex items-stretch border border-zinc-200 rounded-xl overflow-hidden mb-8 shadow-sm avoid-break">
          <div className="flex-1 p-4 bg-zinc-50 flex flex-col justify-center border-r border-zinc-200">
            <h2 className="text-2xl font-black uppercase text-zinc-900 tracking-tight">Ficha de Manutenção Preventiva</h2>
            <p className="text-[10px] font-bold uppercase text-orange-600 tracking-widest mt-1">Relatório de Acompanhamento</p>
          </div>
          <div className="w-48 p-4 text-center flex flex-col justify-center bg-white">
            <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">STATUS</p>
            <p className="text-lg font-black text-zinc-900 leading-none uppercase">{preventiva.status || '—'}</p>
          </div>
        </div>

        {/* DADOS CLIENTE E VEÍCULO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 avoid-break">
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Dados do Cliente</h3>
            <div className="text-xs space-y-1.5">
              <p><span className="font-bold text-zinc-900">NOME:</span> {cliente?.nome || '—'}</p>
              <p><span className="font-bold text-zinc-900">CPF/CNPJ:</span> {formatCpfCnpj(cliente?.cpf_cnpj)}</p>
              <p><span className="font-bold text-zinc-900">TELEFONE:</span> {cliente?.telefone || '—'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Dados do Veículo</h3>
            <div className="text-xs space-y-2">
              <div className="flex gap-4">
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Placa</p>
                  <p className="font-black text-sm border border-zinc-300 px-2 py-1 rounded bg-zinc-50">{veiculo?.placa || '—'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Marca / Modelo</p>
                  <p className="font-bold uppercase">{veiculo?.marca || '—'} {veiculo?.modelo || ''}</p>
                </div>
              </div>
              <div className="flex gap-4 pt-1">
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Ano</p>
                  <p className="font-bold">{veiculo?.ano || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">KM Atual</p>
                  <p className="font-bold">{(veiculo?.quilometragem || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Horímetro</p>
                  <p className="font-bold">{veiculo?.horimetro_atual || 0}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DETALHES DO PLANO */}
        <div className="mb-8 avoid-break">
          <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Detalhes do Plano Preventivo</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Serviço / Componente</p>
              <p className="text-sm font-black uppercase text-zinc-900">{preventiva.nome || preventiva.servico} {preventiva.componente ? `(${preventiva.componente})` : ''}</p>
            </div>
          </div>

          {preventiva.descricao && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Descrição Técnica / Observações</p>
              <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{preventiva.descricao}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
            <div>
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Último KM</span>
              <span className="font-bold text-sm">{preventiva.ultimo_km?.toLocaleString('pt-BR') || '—'}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Próximo KM Alvo</span>
              <span className="font-bold text-sm">{preventiva.proximo_km?.toLocaleString('pt-BR') || '—'}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data Prevista</span>
              <span className="font-bold text-sm">{preventiva.proxima_data ? formatDate(preventiva.proxima_data) : '—'}</span>
            </div>
          </div>
        </div>

        {/* GALERIA DE FOTOS */}
        {fotos.length > 0 && (
          <div className="mb-10 breakable">
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-4 tracking-wider">Registro Fotográfico ({fotos.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {fotos.map((foto: string, index: number) => (
                /* ✅ avoid-break em cada foto para não cortar a imagem na metade entre páginas */
                <div key={index} className="border border-zinc-200 rounded-xl overflow-hidden aspect-square relative group avoid-break bg-white p-1">
                  <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-12 pb-8 px-8 avoid-break">
          <div className="border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p className="font-black uppercase text-zinc-800">Assinatura do Responsável Técnico</p>
            <p className="text-zinc-500">{company?.nome_fantasia || BRANDING.name}</p>
          </div>
          <div className="border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p className="font-black uppercase text-zinc-800">Assinatura do Cliente</p>
            <p className="text-zinc-500">{cliente?.nome || ''}</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-6 border-t border-zinc-200 avoid-break">
          {company?.rodape_personalizado && <p className="text-[10px] text-zinc-600 mb-4 italic whitespace-pre-wrap">{company.rodape_personalizado}</p>}
          <p className="text-[10px] uppercase font-bold text-zinc-800 mt-2">{company?.cidade || 'CIDADE'}, {dataFormatada}</p>
          <p className="text-[9px] text-zinc-500 mt-1">Emitido em {emitidoEm.toLocaleString('pt-BR')}</p>
          <p className="text-[9px] font-bold text-zinc-300 mt-1 uppercase tracking-widest">{BRANDING.name}</p>
        </div>

      </div>
    </div>
  );
}
