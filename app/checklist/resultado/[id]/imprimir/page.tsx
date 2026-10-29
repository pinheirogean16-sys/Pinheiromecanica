'use client';

import '@/styles/print.css';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft, AlertTriangle, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, XOctagon, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { BRANDING } from '@/lib/branding';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import { formatDateTime, formatCNPJ, waitForPrint } from '@/lib/print';

// Função para pegar resposta independente do formato
function getResposta(itemId: string, respostas: any): any {
  if (!respostas) return null;
  let parsed = respostas;
  if (typeof respostas === 'string') {
    try { parsed = JSON.parse(respostas); } catch { return null; }
  }
  if (Array.isArray(parsed)) {
    const found = parsed.find((item: any) => item.itemId === itemId || item.item_id === itemId || item.id_item === itemId || item.id === itemId);
    if (found) return found.valor !== undefined ? found.valor : (found.resposta !== undefined ? found.resposta : found.value);
    return null;
  }
  if (typeof parsed === 'object') return parsed[itemId] !== undefined ? parsed[itemId] : null;
  return null;
}

export default function ImprimirLaudoPage() {
  const params = useParams();
  const id = params?.id as string;

  const [execucao, setExecucao] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [emitidoEm] = useState(() => new Date());

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const [compData, execData] = await Promise.all([
        apiFetch<any>('/api/configuracoes/empresa/publico', { signal }).catch(() => null),
        apiFetch<any>(`/api/checklist/execucao/${id}`, { signal })
      ]);

      if (compData && Object.keys(compData).length > 0) setCompany(compData);

      if (!execData) throw new Error('Laudo não encontrado');

      // Normalização dos dados
      let parsedRespostas = execData.respostas;
      if (typeof execData.respostas === 'string') {
        try { parsedRespostas = JSON.parse(execData.respostas); } catch { parsedRespostas = {}; }
      }

      const checklistObj = execData.checklist || execData.Checklist;
      const osObj = execData.os || execData.OrdemServico;
      const fotosObj = execData.fotos || execData.ChecklistFoto || [];

      setExecucao({
        ...execData,
        respostas: parsedRespostas || {},
        checklist: checklistObj ? { nome: checklistObj.nome || 'Checklist', itens: checklistObj.itens || checklistObj.ChecklistItem || [] } : { nome: 'Checklist', itens: [] },
        os: osObj ? { numero: osObj.numero, cliente: osObj.cliente || osObj.Cliente, veiculo: osObj.veiculo || osObj.Veiculo } : null,
        fotos: Array.isArray(fotosObj) ? fotosObj : [],
      });

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar dados para impressão.' });
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
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Preparando Laudo...</p>
        </div>
      </div>
    );
  }

  if (error || !execucao) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6 print:hidden">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase text-center">Laudo não encontrado</h1>
        <Link href={`/checklist/resultado/${id}`} className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-xl text-[10px] font-black uppercase hover:bg-zinc-100 transition">
          Voltar para o Laudo
        </Link>
      </div>
    );
  }

  const { checklist, os, respostas, executado_por, observacoes, created_at, fotos } = execucao;
  const metaTipoVeiculo = respostas['__meta_tipo_veiculo'] || 'NÃO INFORMADO';
  const metaVeredito = respostas['__meta_veredito_laudo'] || 'CONFORME';
  const metaAssinatura = respostas['__meta_assinatura_digital'];

  const logo = company?.logo_url || BRANDING?.logo?.url || null;
  const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 print:min-h-0 font-sans text-zinc-800">
      {/* CSS de Impressão */}
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
          @page { size: A4 portrait; margin: 12mm 15mm; }
          .avoid-break { page-break-inside: avoid; }
          .breakable { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>

      {/* Barra de Ações - Escondida na impressão */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl print:hidden">
        <Link href={`/checklist/resultado/${id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button onClick={handlePrint} disabled={printing} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition">
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {printing ? 'Preparando...' : 'Imprimir Laudo'}
        </button>
      </div>

      {/* Documento para Impressão */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-8 sm:p-12 print:p-0 print:shadow-none print-container">
        
        {/* CABEÇALHO DA EMPRESA */}
        <div className="flex items-center justify-between border-b-2 border-zinc-200 pb-4 mb-6 avoid-break">
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt="Logo" className="h-16 max-w-[140px] object-contain" />
            ) : (
              <div className="text-2xl font-black italic uppercase">{BRANDING.name}</div>
            )}
            <div>
              <h1 className="text-lg font-black uppercase text-zinc-900 leading-tight">
                {company?.razao_social || company?.nome_fantasia || 'EMPRESA NÃO CONFIGURADA'}
              </h1>
              {company?.nome_fantasia && company.nome_fantasia !== company.razao_social && (
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{company.nome_fantasia}</p>
              )}
              <div className="text-[10px] text-zinc-600 mt-1 space-y-0.5">
                <p><span className="font-bold text-zinc-800">CNPJ:</span> {formatCNPJ(company?.cnpj)} | <span className="font-bold text-zinc-800">TEL:</span> {company?.telefone || '—'}</p>
                <p>{company?.endereco || 'Endereço'}{company?.numero ? `, ${company.numero}` : ''} {company?.cidade ? `- ${company.cidade}` : ''}{company?.uf ? `/${company.uf}` : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div className="flex items-stretch border border-zinc-200 rounded-lg mb-6 shadow-sm avoid-break px-6 py-4 bg-white">
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-black uppercase text-zinc-900 tracking-widest">LAUDO TÉCNICO DE INSPEÇÃO</h2>
            <p className="text-[10px] font-bold uppercase text-orange-600 tracking-widest mt-1">{checklist?.nome}</p>
          </div>
          <div className="w-48 text-right flex flex-col justify-center border-l border-zinc-200 pl-4">
            <p className="text-[9px] font-bold uppercase text-zinc-500 mb-1">CÓDIGO</p>
            <p className="text-xl font-black text-zinc-900 leading-none">#{id.slice(-8).toUpperCase()}</p>
            <p className="text-[9px] font-bold uppercase text-zinc-500 mt-2">DATA: {new Date(created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* INFORMAÇÕES GERAIS */}
        <div className="grid grid-cols-2 gap-4 mb-6 avoid-break">
          <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50">
            <h3 className="text-[10px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Referência Operacional</h3>
            <div className="text-[11px] space-y-1">
              <p><span className="font-bold text-zinc-900">CLIENTE:</span> {os?.cliente?.nome || '—'}</p>
              <p><span className="font-bold text-zinc-900">VEÍCULO:</span> {os?.veiculo?.modelo || '—'} {os?.veiculo?.placa ? `[${os.veiculo.placa}]` : ''}</p>
              <p><span className="font-bold text-zinc-900">ESPECIFICADOR:</span> {metaTipoVeiculo}</p>
              <p><span className="font-bold text-zinc-900">ORDEM DE SERVIÇO:</span> {os?.numero ? `OS #${os.numero}` : 'NÃO VINCULADA'}</p>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50">
            <h3 className="text-[10px] font-black uppercase text-blue-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Status de Verificação</h3>
            <div className="text-[11px] space-y-1">
              <p><span className="font-bold text-zinc-900">TÉCNICO:</span> {executado_por || 'NÃO INFORMADO'}</p>
              <p><span className="font-bold text-zinc-900">EXECUÇÃO:</span> {formatDateTime(created_at)}</p>
              <p><span className="font-bold text-zinc-900">PARECER FINAL:</span> 
                <span className={`font-black uppercase ml-1 ${metaVeredito === 'CONFORME' ? 'text-green-600' : 'text-red-600'}`}>
                  {metaVeredito === 'CONFORME' ? 'APROVADO' : 'REPROVADO'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* TABELA DE ITENS */}
        <div className="mb-6 breakable">
          <h3 className="text-[11px] font-black uppercase text-zinc-900 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Resultados da Inspeção</h3>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 border-b border-zinc-300">
                <th className="py-1 px-2 font-bold uppercase w-8 text-center">#</th>
                <th className="py-1 px-2 font-bold uppercase">Item Verificado</th>
                <th className="py-1 px-2 font-bold uppercase text-right w-1/3">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {checklist?.itens?.map((item: any, index: number) => {
                const resp = getResposta(item.id, respostas);
                return (
                  <tr key={item.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                    <td className="py-1.5 px-2 text-center font-mono text-zinc-500 font-bold">{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="py-1.5 px-2 uppercase font-bold text-zinc-800">{item.descricao}</td>
                    <td className="py-1.5 px-2 text-right">
                      {item.tipo === 'SIM_NAO' && (
                        <span className={`font-black uppercase ${
                          resp === 'OK' ? 'text-green-600' : 
                          resp === 'MEDIO' ? 'text-yellow-600' : 
                          resp === 'RUIM' ? 'text-orange-600' : 
                          resp === 'CRITICO' ? 'text-red-600' : 'text-zinc-400'
                        }`}>
                          {resp || '—'}
                        </span>
                      )}
                      {(item.tipo === 'NUMERICO' || item.tipo === 'NUMERO') && (
                        <span className="font-mono font-black text-zinc-800 text-sm">{resp || '—'}</span>
                      )}
                      {item.tipo === 'TEXTO' && (
                        <span className="italic text-zinc-600">{resp || 'Sem observação'}</span>
                      )}
                      {item.tipo === 'FOTO' && (
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">
                          {fotos?.filter((f: any) => f.item_id === item.id).length > 0 ? 'Foto Anexada' : 'Sem Foto'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* REGISTRO FOTOGRÁFICO */}
        {fotos && fotos.length > 0 && (
          <div className="mb-6 breakable">
            <h3 className="text-[11px] font-black uppercase text-zinc-900 border-b border-zinc-200 pb-1 mb-3 tracking-wider">Evidências Fotográficas</h3>
            <div className="grid grid-cols-3 gap-3">
              {fotos.map((foto: any, i: number) => (
                <div key={i} className="border border-zinc-200 rounded-lg overflow-hidden p-1 bg-white avoid-break aspect-video">
                  <img src={foto.url} alt={`Foto ${i+1}`} className="w-full h-full object-cover rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARECER TÉCNICO E OBSERVAÇÕES */}
        <div className="border border-zinc-200 rounded-lg p-4 mb-8 avoid-break bg-zinc-50/30">
          <h3 className="text-[10px] font-black uppercase text-zinc-900 mb-2 tracking-wider">Parecer Técnico Final / Observações</h3>
          <p className="text-[11px] text-zinc-700 whitespace-pre-wrap leading-relaxed">
            {observacoes || 'Nenhuma observação adicional registrada pelo técnico.'}
          </p>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-12 pb-8 px-8 avoid-break">
          <div className="text-center flex flex-col justify-end items-center">
            {metaAssinatura ? (
              <img src={metaAssinatura} alt="Assinatura Técnico" className="h-20 object-contain mb-2" />
            ) : (
              <div className="h-20"></div>
            )}
            <div className="w-full border-t border-zinc-400 pt-2">
              <p className="font-black uppercase text-zinc-800 text-xs">{executado_por || 'Técnico Responsável'}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Assinatura do Técnico</p>
            </div>
          </div>
          
          <div className="text-center flex flex-col justify-end items-center">
            <div className="h-20"></div>
            <div className="w-full border-t border-zinc-400 pt-2">
              <p className="font-black uppercase text-zinc-800 text-xs">{os?.cliente?.nome || 'Cliente / Responsável'}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Assinatura do Cliente</p>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-4 border-t border-zinc-200 avoid-break">
          <p className="text-[9px] uppercase text-zinc-400">Este laudo é uma representação fiel da inspeção realizada e não possui valor fiscal.</p>
          <p className="text-[10px] uppercase font-bold text-zinc-800 mt-2">{company?.cidade || 'CIDADE'}, {dataFormatada}</p>
          <p className="text-[9px] text-zinc-500 mt-1">Emitido em {emitidoEm.toLocaleString('pt-BR')}</p>
          <p className="text-[9px] font-bold text-zinc-300 mt-1 uppercase tracking-widest">{BRANDING.name}</p>
        </div>

      </div>
    </div>
  );
}
