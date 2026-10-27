'use client';

import '@/styles/print.css';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ChevronLeft, AlertTriangle, Loader2, RefreshCw, MapPin, Truck, Users, Wrench } from 'lucide-react';
import Link from 'next/link';
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

function ViagemPrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
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
      if (compData && Object.keys(compData).length > 0) {
        setCompany(compData);
      }

      if (!id) {
        setError(true);
        return;
      }

      const osData = await apiFetch<any>(`/api/ordens/${id}`, { signal });
      setOs(osData);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar dados da viagem.' });
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
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6 print:hidden">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase tracking-tighter text-center">Ordem de Serviço não encontrada</h1>
        <p className="text-sm text-zinc-500 text-center max-w-md">Não foi possível carregar os dados da viagem. Verifique o ID ou tente novamente.</p>
        <div className="flex gap-4">
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

  // Parse seguro de JSONs
  let timeline: any[] = [];
  try { timeline = typeof os.timeline_viagem === 'string' ? JSON.parse(os.timeline_viagem || '[]') : (os.timeline_viagem || []); } catch { timeline = []; }

  let equipe: any[] = [];
  try { equipe = typeof os.mao_obra_equipe === 'string' ? JSON.parse(os.mao_obra_equipe || '[]') : (os.mao_obra_equipe || []); } catch { equipe = []; }

  // Cálculos
  const totalDespesas = (
    Number(os.despesa_pedagio || 0) +
    Number(os.despesa_combustivel || 0) +
    Number(os.despesa_hospedagem || 0) +
    Number(os.despesa_alimentacao || 0) +
    Number(os.despesa_diaria_tecnica || 0) +
    Number(os.despesa_guincho || 0) +
    Number(os.despesa_outros || 0)
  );

  const subtotalPecas = os.pecas_aplicadas ? os.pecas_aplicadas.reduce((acc: number, p: any) => acc + Number(p.valor_total || 0), 0) : 0;
  const subtotalServicos = os.servicos ? os.servicos.reduce((acc: number, s: any) => acc + Number(s.valor_total || 0), 0) : 0;
  const totalDeslocamento = Number(os.total_deslocamento || 0);
  const totalMaoObraExterna = Number(os.mao_obra_externa_total || 0);
  const desconto = Number(os.desconto || 0);

  const totalGeralOS = os.valor_total !== undefined 
    ? Number(os.valor_total) 
    : (totalDeslocamento + subtotalPecas + subtotalServicos + totalDespesas + totalMaoObraExterna - desconto);

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase();

  const despesasList = [
    { label: 'Pedágio', value: os.despesa_pedagio },
    { label: 'Combustível', value: os.despesa_combustivel },
    { label: 'Hospedagem', value: os.despesa_hospedagem },
    { label: 'Alimentação', value: os.despesa_alimentacao },
    { label: 'Diária Técnica', value: os.despesa_diaria_tecnica },
    { label: 'Guincho / Reboque', value: os.despesa_guincho },
    { label: 'Outros', value: os.despesa_outros },
  ].filter(d => Number(d.value || 0) > 0);

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
          @page { size: A4 portrait; margin: 12mm 15mm; }
          .avoid-break { page-break-inside: avoid; }
          .breakable { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Barra de Ações */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl print:hidden">
        <Link href={`/os/${os.id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar para OS
        </Link>
        <button onClick={handlePrint} disabled={printing} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition">
          {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {printing ? 'Preparando...' : 'Imprimir Relatório'}
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
            <h2 className="text-2xl font-black uppercase text-zinc-900 tracking-tight">Relatório de Atendimento Externo</h2>
            <p className="text-[10px] font-bold uppercase text-orange-600 tracking-widest mt-1">Controle de Deslocamento e Viagem</p>
          </div>
          <div className="w-48 p-4 text-center flex flex-col justify-center bg-white">
            <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">PROTOCOLO</p>
            <p className="text-2xl font-black text-zinc-900 leading-none">#{os.numero || os.id.slice(0,6).toUpperCase()}</p>
          </div>
        </div>

        {/* DADOS CLIENTE E VEÍCULO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 avoid-break">
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Dados do Cliente</h3>
            <div className="text-xs space-y-1.5">
              <p><span className="font-bold text-zinc-900">NOME:</span> {os.cliente?.nome || '—'}</p>
              <p><span className="font-bold text-zinc-900">CPF/CNPJ:</span> {formatCpfCnpj(os.cliente?.cpf_cnpj)}</p>
              <p><span className="font-bold text-zinc-900">TELEFONE:</span> {os.cliente?.telefone || '—'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Dados do Veículo</h3>
            <div className="text-xs space-y-2">
              <div className="flex gap-4">
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Placa</p>
                  <p className="font-black text-sm border border-zinc-300 px-2 py-1 rounded bg-zinc-50">{os.veiculo?.placa || '—'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Marca / Modelo</p>
                  <p className="font-bold uppercase">{os.veiculo?.marca || '—'} {os.veiculo?.modelo || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOGÍSTICA E EQUIPE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 avoid-break">
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Logística de Campo</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex gap-6">
               <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">KM Rodado</p>
                  <p className="font-black text-lg">{os.km_rodado || 0} KM</p>
               </div>
               <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Data de Saída</p>
                  <p className="font-bold text-xs">{formatDateTime(os.data_saida)}</p>
               </div>
               <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Retorno</p>
                  <p className="font-bold text-xs">{formatDateTime(os.data_retorno)}</p>
               </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Equipe Técnica Externa</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
              {equipe.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {equipe.map((m: any, i: number) => (
                    <li key={i} className="flex justify-between border-b border-zinc-200 pb-1 last:border-0 last:pb-0">
                      <span className="font-bold uppercase">{m.nome || m.name}</span>
                      <span className="text-zinc-500">{m.funcao || 'Técnico'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500 italic">Nenhum membro externo listado.</p>
              )}
            </div>
          </div>
        </div>

        {/* DESPESAS DE VIAGEM */}
        {despesasList.length > 0 && (
          <div className="mb-8 breakable">
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Despesas de Deslocamento</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 text-zinc-900 border-b-2 border-zinc-300">
                  <th className="py-2 px-2 font-bold uppercase">Descrição da Despesa</th>
                  <th className="py-2 px-2 font-bold uppercase text-right w-32">Valor</th>
                </tr>
              </thead>
              <tbody>
                {despesasList.map((d, i) => (
                  <tr key={i} className="border-b border-zinc-200 even:bg-zinc-50/50">
                    <td className="py-2 px-2 uppercase">{d.label}</td>
                    <td className="py-2 px-2 text-right font-bold">{formatCurrency(Number(d.value))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-zinc-50">
                  <td className="py-2 px-2 text-right font-bold uppercase text-zinc-600 text-[10px]">Subtotal Despesas:</td>
                  <td className="py-2 px-2 text-right font-black">{formatCurrency(totalDespesas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* SERVIÇOS E PEÇAS */}
        <div className="mb-8 breakable">
          <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Serviços Executados e Peças Aplicadas</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 border-b-2 border-zinc-300">
                <th className="py-2 px-2 font-bold uppercase">Descrição</th>
                <th className="py-2 px-2 font-bold uppercase text-center w-16">Qtd/Hrs</th>
                <th className="py-2 px-2 font-bold uppercase text-right w-24">Vlr. Unit</th>
                <th className="py-2 px-2 font-bold uppercase text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos?.map((s: any) => (
                <tr key={s.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="py-2 px-2 uppercase">{s.descricao} (M.O)</td>
                  <td className="py-2 px-2 text-center">{s.horas}h</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(s.valor_hora)}</td>
                  <td className="py-2 px-2 text-right font-bold">{formatCurrency(s.valor_total)}</td>
                </tr>
              ))}
              {os.pecas_aplicadas?.map((p: any) => (
                <tr key={p.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                  <td className="py-2 px-2 uppercase">{p.peca?.descricao || p.descricao} (Peça)</td>
                  <td className="py-2 px-2 text-center">{p.quantidade}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(p.valor_unit)}</td>
                  <td className="py-2 px-2 text-right font-bold">{formatCurrency(p.valor_total)}</td>
                </tr>
              ))}
              {(!os.servicos?.length && !os.pecas_aplicadas?.length) && (
                <tr><td colSpan={4} className="py-4 text-center italic text-zinc-400">Nenhum serviço ou peça registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CONSOLIDAÇÃO FINAL E TOTAIS */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8 breakable">
          <div className="flex-1">
            <h3 className="text-[11px] font-black uppercase text-orange-600 border-b border-zinc-200 pb-1 mb-2 tracking-wider">Observações / Relato</h3>
            <p className="text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap">{os.diagnostico || 'Nenhuma observação registrada.'}</p>
          </div>
          
          <div className="w-full sm:w-80 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Peças + Mat.</span><span className="font-bold">{formatCurrency(subtotalPecas)}</span></div>
            <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Serviços / M.O</span><span className="font-bold">{formatCurrency(subtotalServicos)}</span></div>
            <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Logística / KM</span><span className="font-bold">{formatCurrency(totalDeslocamento)}</span></div>
            <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-zinc-600"><span className="font-bold uppercase">Despesas + M.O Ext</span><span className="font-bold">{formatCurrency(totalDespesas + totalMaoObraExterna)}</span></div>
            {desconto > 0 && <div className="p-3 flex justify-between text-xs border-b border-zinc-200 text-red-600"><span className="font-bold uppercase">Desconto</span><span className="font-bold">- {formatCurrency(desconto)}</span></div>}
            <div className="p-4 flex justify-between items-center bg-zinc-900 text-white">
              <span className="text-[10px] font-black uppercase tracking-widest">Total Geral</span>
              <span className="text-xl font-black">{formatCurrency(totalGeralOS)}</span>
            </div>
          </div>
        </div>

        {/* EXTENSO */}
        <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-3 mb-10 breakable">
          <p className="text-[11px] text-zinc-600"><span className="font-bold uppercase text-zinc-900">Valor por extenso:</span> <span className="italic capitalize">{numeroPorExtenso(totalGeralOS)}</span></p>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-12 pb-8 px-8 avoid-break">
          <div className="border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p className="font-black uppercase text-zinc-800">Técnico Encarregado</p>
            <p className="text-zinc-500">{os.mecanico?.name || 'Assinatura'}</p>
          </div>
          <div className="border-t border-zinc-400 pt-2 text-center text-[10px]">
            <p className="font-black uppercase text-zinc-800">Cliente / Responsável</p>
            <p className="text-zinc-500">{os.cliente?.nome || 'Assinatura'}</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-6 border-t border-zinc-200 avoid-break">
          <p className="text-[9px] uppercase text-zinc-400">A responsabilidade técnico-metrológica de quilometragem e tempo de parada declarados competem sob os critérios contratuais de atendimento extramuros.</p>
          {company?.rodape_personalizado && <p className="text-[10px] text-zinc-600 mt-2 italic whitespace-pre-wrap">{company.rodape_personalizado}</p>}
          <p className="text-[10px] uppercase font-bold text-zinc-800 mt-4">{company?.cidade || 'CIDADE'}, {dataFormatada}</p>
          <p className="text-[9px] text-zinc-500 mt-1">Emitido em {emitidoEm.toLocaleString('pt-BR')}</p>
          <p className="text-[9px] font-bold text-zinc-300 mt-1 uppercase tracking-widest">{BRANDING.name}</p>
        </div>

      </div>
    </div>
  );
}

export default function ViagemPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-10 print:hidden">
        <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
      </div>
    }>
      <ViagemPrintContent />
    </Suspense>
  );
}
