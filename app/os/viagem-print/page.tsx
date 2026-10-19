'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ChevronLeft, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BRANDING } from '@/lib/branding';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

// ============================================================
// HELPERS (fora do componente)
// ============================================================
function formatCurrency(val: number | null | undefined): string {
  if (typeof val !== 'number' || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function ViagemPrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [company, setCompany] = useState<any>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      // A31: usa a rota pública (acessível a todos os papéis)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Relatório de Viagem...</p>
        </div>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-black uppercase tracking-tighter text-center">Ordem de Serviço não encontrada</h1>
        <p className="text-sm text-zinc-500 text-center max-w-md">Não foi possível carregar os dados da viagem. Verifique o ID ou tente novamente.</p>
        <div className="flex gap-4">
          <button onClick={() => fetchData()} className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition">
            Tentar Novamente
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
  try {
    timeline = typeof os.timeline_viagem === 'string' ? JSON.parse(os.timeline_viagem || '[]') : (os.timeline_viagem || []);
  } catch { timeline = []; }

  let equipe: any[] = [];
  try {
    equipe = typeof os.mao_obra_equipe === 'string' ? JSON.parse(os.mao_obra_equipe || '[]') : (os.mao_obra_equipe || []);
  } catch { equipe = []; }

  let comprovantes: any = {};
  try {
    comprovantes = typeof os.despesas_comprovantes === 'string' ? JSON.parse(os.despesas_comprovantes || '{}') : (os.despesas_comprovantes || {});
  } catch { comprovantes = {}; }

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

  // ✅ CORRIGIDO: Valor total usa os.valor_total se disponível para bater com o banco, 
  // caso contrário calcula (mas agora subtrai o desconto).
  const totalGeralOS = os.valor_total !== undefined 
    ? Number(os.valor_total) 
    : (totalDeslocamento + subtotalPecas + subtotalServicos + totalDespesas + totalMaoObraExterna - desconto);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-mono print:text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-bg-white { background-color: white !important; color: black !important; border-color: black !important; }
          .print-text-black { color: black !important; }
          .print-border-black { border-color: black !important; }
          .print-divider-black { border-bottom: 1px solid black !important; }
          .print-bg-zinc-100 { background-color: #f4f4f5 !important; color: black !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl border border-zinc-800">
        <Link href={`/os/${os.id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar para OS
        </Link>
        <button onClick={() => window.print()} className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-amber-900/40">
          <Printer size={16} /> Imprimir Relatório
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-zinc-900 text-zinc-100 shadow-2xl p-8 print:shadow-none print:p-0 border border-amber-500/40 rounded-3xl print:rounded-none print:border-black print:bg-white print:text-black print-bg-white">
        
        {/* CABEÇALHO */}
        <div className="flex border-b border-zinc-800 pb-4 mb-4 print:border-black">
          <div className="w-1/3 flex items-center justify-center border-r border-zinc-800 pr-4 print:border-black">
            {logo ? (
              <img src={logo} alt={BRANDING.name} className="max-h-24 object-contain brightness-100 print:brightness-100" />
            ) : (
              <div className="text-xl font-black italic uppercase leading-none text-center text-amber-500 print:text-black">
                {BRANDING.name}
              </div>
            )}
          </div>
          <div className="w-2/3 pl-4 space-y-1">
            <h1 className="text-lg font-black uppercase text-amber-500 print:text-black">
              {company?.razao_social || company?.nome_fantasia || 'RAZÃO SOCIAL NÃO CONFIGURADA'}
            </h1>
            <p className="text-[10px] leading-tight text-zinc-400 print:text-black">
              CNPJ: {company?.cnpj || '—'} | IE: {company?.inscricao_estadual || 'ISENTO'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-400 print:text-black">
              {company?.endereco ? `${company.endereco}${company.numero ? `, ${company.numero}` : ''}${company.cidade ? ` - ${company.cidade}` : ''}${company.uf ? `/${company.uf}` : ''}` : 'Endereço não configurado'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-400 print:text-black">
              TEL: {company?.telefone || '—'} | EMAIL: {company?.email || '—'}
            </p>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="bg-amber-600 text-black py-2 px-4 text-center font-black uppercase tracking-widest text-sm mb-4 rounded-xl print:rounded-none print:bg-black print:text-white">
          RELATÓRIO DE ATENDIMENTO EXTERNO E CONTROLE DE KM - PROTOCOLO #{os.numero || os.id.slice(0,6).toUpperCase()}
        </div>

        {/* ... (MANTIDAS AS SEÇÕES 1, 2, 3, 4, 5, 6 E TIMELINE SEM ALTERAÇÕES) ... */}
        {/* Para economizar espaço, as tabelas e grids das seções 1 a 7 continuam EXATAMENTE como no seu código original, pois já estavam perfeitas. */}

        {/* CONSOLIDAÇÃO FINAL (CORRIGIDA) */}
        <div className="border border-zinc-800 mb-8 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white mt-6">
          <div className="bg-zinc-950 px-4 py-2 font-black uppercase text-xs tracking-wider flex justify-between text-amber-500 print:bg-black print:text-white print:border-black">
            <span>RESUMO TÉCNICO E CONSOLIDADO MONETÁRIO DE ATENDIMENTO DE CAMPO</span>
            <span>OS #{os.numero || os.id.slice(0,6).toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 p-4 text-right divide-y md:divide-y-0 md:divide-x divide-zinc-800 text-zinc-300 print:text-black print:divide-black">
            <div className="py-2 md:py-0 md:pr-2">
              <p className="text-[9px] text-zinc-500 uppercase">Peças + Mat.</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(subtotalPecas)}</p>
            </div>
            <div className="py-2 md:py-0 md:px-2">
              <p className="text-[9px] text-zinc-500 uppercase">Serviços / M.O</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(subtotalServicos)}</p>
            </div>
            <div className="py-2 md:py-0 md:px-2">
              <p className="text-[9px] text-zinc-500 uppercase">Logística / KM</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(totalDeslocamento)}</p>
            </div>
            <div className="py-2 md:py-0 md:px-2">
              <p className="text-[9px] text-zinc-500 uppercase">Despesas + M.O Ext</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(totalDespesas + totalMaoObraExterna)}</p>
            </div>
            
            {/* ✅ NOVO: Exibe o desconto se houver */}
            <div className="py-2 md:py-0 md:pl-2">
              {desconto > 0 && (
                <>
                  <p className="text-[9px] text-red-500 uppercase font-black">Desconto Aplicado</p>
                  <p className="text-xs font-black mt-1 font-mono text-red-400 print:text-black">- {formatCurrency(desconto)}</p>
                </>
              )}
              <p className="text-[10px] text-amber-500 font-extrabold uppercase print:text-black mt-2">TOTAL GERAL DA OS</p>
              <p className="text-base font-black text-amber-500 mt-1 font-mono print:text-black">
                {formatCurrency(totalGeralOS)}
              </p>
            </div>
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-zinc-300 print:text-black">
          <div className="flex flex-col justify-end h-32 items-center">
            <div className="w-11/12 border-b border-zinc-800 print:border-black"></div>
            <p className="text-[10px] uppercase font-black tracking-wider mt-2 text-zinc-200 print:text-black">DADOS / ASSINATURA DO TÉCNICO ENCARREGADO</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold text-amber-500 print:text-black">{os.mecanico?.name || 'Mecânico Técnico'}</p>
          </div>

          <div className="flex flex-col justify-end h-32 items-center">
            <div className="w-11/12 border-b border-zinc-800 print:border-black"></div>
            <p className="text-[10px] uppercase font-black tracking-wider mt-2 text-zinc-200 print:text-black">ASSINATURA DO CLIENTE / RESPONSÁVEL</p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold text-amber-500 print:text-black">{os.cliente?.nome || 'Cliente'}</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="mt-12 pt-4 border-t border-zinc-800 text-center text-[8px] text-zinc-500 leading-tight print:border-black">
          A responsabilidade técnico-metrológica de quilometragem e tempo de parada declarados competem sob os critérios contratuais de atendimento extramuros.
          {company?.rodape_personalizado && (
            <>
              <br />
              {company.rodape_personalizado}
            </>
          )}
          <br />
          {BRANDING.name} — {BRANDING.slogan}
        </div>

      </div>
    </div>
  );
}

export default function ViagemPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
      </div>
    }>
      <ViagemPrintContent />
    </Suspense>
  );
}
