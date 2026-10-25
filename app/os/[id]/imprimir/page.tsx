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

// ============================================================
// HELPERS LOCAIS
// ============================================================
function extrairObservacoes(obs: any): string | null {
  if (!obs || typeof obs !== 'string') return null;
  const trimmed = obs.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
  return trimmed;
}

// ============================================================
// COMPONENTE
// ============================================================
export default function ImprimirOSPage() {
  const params = useParams();
  const id = params?.id;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  // Captura a data/hora uma única vez para o rodapé "emitido em"
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

  // ✅ Aguarda imagens/fontes antes de imprimir
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
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Ordem de Serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase tracking-tighter text-center">
          {error ? 'Erro de Conexão ou Permissão' : 'ORDEM DE SERVIÇO NÃO ENCONTRADA'}
        </h1>
        <p className="text-sm text-zinc-500 text-center max-w-md">Não foi possível carregar os dados desta OS. Verifique se ela existe e tente novamente.</p>
        <div className="flex gap-4 mt-2">
          <button onClick={() => fetchData()} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition">
            <RefreshCw size={14} /> Tentar Novamente
          </button>
          <Link href="/os" className="px-6 py-3 border border-zinc-300 text-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition">
            Voltar para Listagem
          </Link>
        </div>
      </div>
    );
  }

  const logo = company?.logo_url || BRANDING?.logo?.url || null;
  const totalServicos = os.servicos?.reduce((acc: number, s: any) => acc + (s.valor_total || 0), 0) || 0;
  const totalPecas = os.pecas_aplicadas?.reduce((acc: number, p: any) => acc + (p.valor_total || 0), 0) || 0;
  const desconto = os.desconto || 0;
  const valorTotal = os.valor_total !== undefined ? os.valor_total : (totalServicos + totalPecas - desconto);

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase();

  const tipoOSLabel = os.tipoOS === 'CAMPO' || os.tipo_atendimento === 'CAMPO'
    ? 'ATENDIMENTO EXTERNO / CAMPO'
    : 'OFICINA';

  const observacoesLimpa = extrairObservacoes(os.observacoes);
  const numeroOS = os.numero ? os.numero.toString().padStart(6, '0') : 'S/N';

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-sans text-zinc-900">
      {/* Barra de ações — some na impressão */}
      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print print:hidden shadow-xl">
        <Link href={`/os/${id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar para OS
        </Link>
        <button
          onClick={handlePrint}
          disabled={printing}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-orange-900/40"
        >
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {printing ? 'Preparando...' : 'Imprimir OS'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-2xl p-8 print:shadow-none print:p-0 print-container">

        {/* CABEÇALHO */}
        <div className="flex items-center gap-6 border-b-4 border-black pb-6 mb-6 avoid-break">
          <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
            {logo ? (
              <img src={logo} alt={BRANDING.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-2xl font-black italic uppercase text-center">{BRANDING.name}</div>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-black uppercase leading-tight tracking-tight">
              {company?.razao_social || company?.nome_fantasia || 'RAZÃO SOCIAL NÃO CONFIGURADA'}
            </h1>
            {company?.nome_fantasia && company.nome_fantasia !== company.razao_social && (
              <p className="text-sm font-bold uppercase text-zinc-600 tracking-wider">{company.nome_fantasia}</p>
            )}
            <div className="text-xs space-y-0.5 pt-1">
              <p>
                <span className="font-bold">CNPJ:</span> {formatCNPJ(company?.cnpj)} |{' '}
                <span className="font-bold">IE:</span> {company?.inscricao_estadual || 'ISENTO'}
              </p>
              <p>{company?.endereco || 'Endereço não configurado'}{company?.numero ? `, ${company.numero}` : ''} {company?.cidade ? `- ${company.cidade}` : ''}{company?.uf ? `/${company.uf}` : ''}</p>
              <p><span className="font-bold">TEL:</span> {company?.telefone || '—'} | <span className="font-bold">EMAIL:</span> {company?.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* TÍTULO E NÚMERO */}
        <div className="flex border-2 border-black mb-6 avoid-break">
          <div className="flex-1 p-3 bg-zinc-50 flex flex-col items-center justify-center border-r-2 border-black">
            <h2 className="text-3xl font-black uppercase tracking-widest">ORDEM DE SERVIÇO</h2>
            <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider mt-1">{tipoOSLabel}</p>
          </div>
          <div className="w-48 p-3 text-center flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-zinc-600">NÚMERO</p>
            <p className="text-3xl font-black leading-none mt-1">#{numeroOS}</p>
            <p className="text-[10px] font-bold uppercase text-zinc-600 mt-2">STATUS: <span className="text-black">{os.status?.replace(/_/g, ' ') || '—'}</span></p>
          </div>
        </div>

        {/* CLIENTE */}
        <div className="border-2 border-black mb-4 avoid-break">
          <div className="bg-black text-white p-2"><p className="text-xs font-black uppercase px-1 tracking-widest">DADOS DO CLIENTE</p></div>
          <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div className="space-y-1 min-w-0">
              <p><span className="font-bold">NOME:</span> {os.cliente?.nome || '—'}</p>
              <p><span className="font-bold">CPF/CNPJ:</span> {formatCpfCnpj(os.cliente?.cpf_cnpj)}</p>
              <p><span className="font-bold">TELEFONE:</span> {os.cliente?.telefone || '—'}</p>
            </div>
            <div className="space-y-1 min-w-0">
              <p><span className="font-bold">EMAIL:</span> {os.cliente?.email || '—'}</p>
              <p><span className="font-bold">ENDEREÇO:</span> {os.cliente?.endereco || '—'}</p>
              <p><span className="font-bold">CIDADE:</span> {os.cliente?.cidade || '—'}{os.cliente?.estado ? ` / ${os.cliente.estado}` : (os.cliente?.uf ? ` / ${os.cliente.uf}` : '')}</p>
            </div>
          </div>
        </div>

        {/* VEÍCULO */}
        <div className="border-2 border-black mb-4 avoid-break">
          <div className="bg-black text-white p-2"><p className="text-xs font-black uppercase px-1 tracking-widest">DADOS DO VEÍCULO</p></div>
          <div className="p-3 grid grid-cols-6 gap-3 text-xs">
            <div className="col-span-1"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">PLACA</p><p className="text-sm font-black uppercase border-2 border-black p-1 text-center bg-zinc-50">{os.veiculo?.placa || '—'}</p></div>
            <div className="col-span-2 min-w-0"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">MARCA / MODELO</p><p className="font-bold uppercase truncate">{os.veiculo?.marca || '—'} {os.veiculo?.modelo || ''}</p></div>
            <div className="col-span-1"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">ANO</p><p className="font-bold">{os.veiculo?.ano_fabricacao || os.veiculo?.ano || '—'}{os.veiculo?.ano_modelo ? `/${os.veiculo.ano_modelo}` : ''}</p></div>
            <div className="col-span-1"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">KM</p><p className="font-bold">{(os.km_entrada || os.veiculo?.quilometragem || 0).toLocaleString('pt-BR')}</p></div>
            <div className="col-span-1"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">HORÍMETRO</p><p className="font-bold">{os.horimetro_entrada || os.veiculo?.horimetro_atual || 0}h</p></div>
          </div>
        </div>

        {/* SERVIÇOS */}
        <div className="border-2 border-black mb-4 avoid-break">
          <div className="bg-black text-white p-2"><p className="text-xs font-black uppercase px-1 tracking-widest">SERVIÇOS REALIZADOS</p></div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-100 border-b-2 border-black font-bold">
                <th className="p-2 border-r border-black">DESCRIÇÃO DO SERVIÇO</th>
                <th className="p-2 border-r border-black text-center w-16">HORAS</th>
                <th className="p-2 border-r border-black text-right w-24">VLR. HORA</th>
                <th className="p-2 text-right w-28">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos?.length > 0 ? os.servicos.map((s: any) => (
                <tr key={s.id} className="border-b border-black/20 even:bg-zinc-50">
                  <td className="p-2 border-r border-black uppercase">{s.descricao || '—'}</td>
                  <td className="p-2 border-r border-black text-center">{formatHoras(s.horas || 0)}</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(s.valor_hora)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(s.valor_total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-4 text-center italic text-zinc-500 uppercase">Nenhum serviço registrado.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-100 border-t-2 border-black font-bold">
              <tr><td colSpan={3} className="p-2 text-right border-r border-black uppercase">SUBTOTAL SERVIÇOS:</td><td className="p-2 text-right">{formatCurrency(totalServicos)}</td></tr>
            </tfoot>
          </table>
        </div>

        {/* PEÇAS */}
        <div className="border-2 border-black mb-4 avoid-break">
          <div className="bg-black text-white p-2"><p className="text-xs font-black uppercase px-1 tracking-widest">PEÇAS E MATERIAIS APLICADOS</p></div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-100 border-b-2 border-black font-bold">
                <th className="p-2 border-r border-black w-24">CÓDIGO</th>
                <th className="p-2 border-r border-black">DESCRIÇÃO DA PEÇA</th>
                <th className="p-2 border-r border-black text-center w-16">QTD</th>
                <th className="p-2 border-r border-black text-right w-24">VLR. UNIT</th>
                <th className="p-2 text-right w-28">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {os.pecas_aplicadas?.length > 0 ? os.pecas_aplicadas.map((p: any) => (
                <tr key={p.id} className="border-b border-black/20 even:bg-zinc-50">
                  <td className="p-2 border-r border-black font-bold uppercase">{p.peca?.codigo || p.peca?.codigo_interno || '—'}</td>
                  <td className="p-2 border-r border-black uppercase">{p.peca?.descricao || p.descricao || '—'}</td>
                  <td className="p-2 border-r border-black text-center">{p.quantidade || 0} {p.unidade || p.peca?.unidadeMedida || ''}</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(p.valor_unit)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(p.valor_total)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="p-4 text-center italic text-zinc-500 uppercase">Nenhuma peça aplicada.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-100 border-t-2 border-black font-bold">
              <tr><td colSpan={4} className="p-2 text-right border-r border-black uppercase">SUBTOTAL PEÇAS:</td><td className="p-2 text-right">{formatCurrency(totalPecas)}</td></tr>
            </tfoot>
          </table>
        </div>

        {/* OBSERVAÇÕES + RESUMO */}
        <div className="flex border-2 border-black mb-4 avoid-break">
          <div className="flex-1 p-3 border-r-2 border-black min-h-[120px]">
            <p className="text-xs font-black uppercase mb-2">OBSERVAÇÕES / RELATO TÉCNICO</p>
            <p className="text-xs italic leading-relaxed text-zinc-800 whitespace-pre-wrap">{os.diagnostico || 'Nenhuma observação registrada.'}</p>
            {observacoesLimpa && (
              <>
                <p className="text-xs font-black uppercase mt-3 mb-1">OBSERVAÇÕES ADICIONAIS</p>
                <p className="text-xs italic leading-relaxed text-zinc-800 whitespace-pre-wrap">{observacoesLimpa}</p>
              </>
            )}
          </div>
          <div className="w-80 bg-zinc-50 flex flex-col">
            <div className="p-2 border-b border-black flex justify-between text-xs"><span className="font-bold uppercase">TOTAL SERVIÇOS</span><span className="font-bold">{formatCurrency(totalServicos)}</span></div>
            <div className="p-2 border-b border-black flex justify-between text-xs"><span className="font-bold uppercase">TOTAL PEÇAS</span><span className="font-bold">{formatCurrency(totalPecas)}</span></div>
            {desconto > 0 && <div className="p-2 border-b border-black flex justify-between text-xs text-red-700"><span className="font-bold uppercase">DESCONTO</span><span className="font-bold">- {formatCurrency(desconto)}</span></div>}
            <div className="p-4 flex justify-between items-center bg-black text-white mt-auto"><span className="text-sm font-black uppercase tracking-widest">TOTAL</span><span className="text-3xl font-black">{formatCurrency(valorTotal)}</span></div>
          </div>
        </div>

        {/* Valor por extenso */}
        <div className="border-2 border-black p-2 mb-4 avoid-break">
          <p className="text-xs"><span className="font-bold uppercase">VALOR TOTAL POR EXTENSO:</span> <span className="italic uppercase">{numeroPorExtenso(valorTotal)}</span></p>
        </div>

        {/* DATAS E RESPONSÁVEIS */}
        <div className="grid grid-cols-3 border-2 border-black mb-4 divide-x-2 divide-black text-xs avoid-break">
          <div className="p-3"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">MECÂNICO RESPONSÁVEL</p><p className="font-black uppercase truncate">{os.mecanico?.name || 'NÃO ESPECIFICADO'}</p></div>
          <div className="p-3"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">DATA DE ABERTURA</p><p className="font-black">{formatDateTime(os.data_abertura || os.created_at)}</p></div>
          <div className="p-3"><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">FORMA DE PAGAMENTO</p><p className="font-black uppercase truncate">{os.forma_pagamento || 'A RECEBER / EM ABERTO'}{os.numero_parcelas > 1 ? ` (${os.numero_parcelas}x)` : ''}</p></div>
        </div>

        {/* Assinatura digital */}
        {os.assinatura_hash && (
          <div className="border-2 border-black p-3 mb-4 text-[10px] avoid-break">
            <p className="font-bold uppercase text-zinc-500 mb-1">DOCUMENTO ASSINADO DIGITALMENTE</p>
            <p className="break-all font-mono">HASH SHA-256: {os.assinatura_hash}</p>
            {os.assinatura_timestamp && <p className="mt-1"><span className="font-bold">Data da assinatura:</span> {formatDateTime(os.assinatura_timestamp)}</p>}
          </div>
        )}

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-20 pt-16 pb-6 px-10 avoid-break">
          <div className="border-t-2 border-black pt-3 text-center text-xs"><p className="font-black uppercase">RESPONSÁVEL PELA OFICINA</p><p className="text-[10px] text-zinc-600 mt-1">{company?.nome_fantasia || BRANDING.name}</p></div>
          <div className="border-t-2 border-black pt-3 text-center text-xs"><p className="font-black uppercase">ASSINATURA DO CLIENTE</p><p className="text-[10px] text-zinc-600 mt-1">{os.cliente?.nome || ''}</p></div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-4 border-t-2 border-black avoid-break">
          <p className="text-[9px] uppercase font-bold text-zinc-500">ESTE DOCUMENTO É UMA REPRESENTAÇÃO DOS SERVIÇOS EXECUTADOS E PEÇAS APLICADAS, NÃO TENDO VALOR FISCAL.</p>
          {company?.rodape_personalizado && <p className="text-[10px] font-bold text-zinc-700 mt-2 italic whitespace-pre-wrap">{company.rodape_personalizado}</p>}
          <p className="text-[10px] uppercase font-black text-zinc-800 mt-3">{company?.cidade || 'CIDADE'}, {dataFormatada}</p>
          <p className="text-[9px] font-bold text-zinc-500 mt-1">
            Emitido em {emitidoEm.toLocaleString('pt-BR')}
          </p>
          <p className="text-[9px] font-bold text-zinc-400 mt-1">{BRANDING.name} — {BRANDING.slogan}</p>
        </div>

      </div>
    </div>
  );
}
