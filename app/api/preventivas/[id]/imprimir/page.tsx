'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { BRANDING } from '@/lib/branding';

export default function ImprimirPreventivaPage() {
  const params = useParams();
  const id = params?.id;

  const [preventiva, setPreventiva] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 print:hidden">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !preventiva) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 gap-4 print:hidden">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-bold text-zinc-800">Erro ao carregar dados do relatório.</h1>
        <button onClick={() => fetchData()} className="px-4 py-2 bg-zinc-900 text-white rounded-lg">Tentar Novamente</button>
      </div>
    );
  }

  const veiculo = preventiva.Veiculo || preventiva.veiculo;
  const cliente = veiculo?.Cliente || veiculo?.cliente;
  const fotos = preventiva.fotos && Array.isArray(preventiva.fotos) ? preventiva.fotos : [];
  
  const logo = company?.logo_url || BRANDING?.logo?.url || null;

  return (
    <div className="min-h-screen bg-zinc-200 py-8 px-4 print:bg-white print:py-0 print:px-0 font-sans text-zinc-900">
      {/* Botões de Ação (ocultos na impressão) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
        <Link href="/preventivas" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-xs font-bold uppercase tracking-widest transition">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition shadow-md">
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Folha A4 */}
      <div className="max-w-[210mm] mx-auto bg-white p-8 md:p-12 shadow-xl print:shadow-none print:p-0 border border-zinc-200 print:border-none">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-6 mb-8">
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt={BRANDING.name} className="w-24 h-24 object-contain" />
            ) : (
              <div className="w-24 h-24 bg-zinc-100 rounded flex items-center justify-center font-black text-xl">{BRANDING.name}</div>
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{company?.razao_social || company?.nome_fantasia || BRANDING.name}</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">CNPJ: {company?.cnpj || '—'} | TEL: {company?.telefone || '—'}</p>
              <p className="text-xs text-zinc-600 font-mono">{company?.endereco || 'Endereço não configurado'}, {company?.numero || 'S/N'} - {company?.cidade || 'Cidade'} / {company?.uf || 'UF'}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-zinc-900 text-white px-4 py-2 rounded-lg inline-block">
              <h2 className="text-sm font-black uppercase tracking-widest">Ficha de Preventiva</h2>
            </div>
            <p className="text-[10px] font-mono mt-2 uppercase text-zinc-500">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Dados do Cliente e Veículo */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border border-zinc-300 rounded-lg p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 pb-2 mb-2">Dados do Cliente</h3>
            <p className="text-sm font-bold uppercase">{cliente?.nome || 'Não informado'}</p>
            <p className="text-xs font-mono text-zinc-600 mt-1">CPF/CNPJ: {cliente?.cpf_cnpj || '—'}</p>
            <p className="text-xs font-mono text-zinc-600">Tel: {cliente?.telefone || '—'}</p>
          </div>
          <div className="border border-zinc-300 rounded-lg p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 pb-2 mb-2">Dados do Veículo</h3>
            <div className="flex gap-3">
              <span className="bg-zinc-900 text-white px-2 py-0.5 rounded text-xs font-bold font-mono">{veiculo?.placa || '---'}</span>
              <p className="text-sm font-bold uppercase">{veiculo?.marca} {veiculo?.modelo}</p>
            </div>
            <div className="flex gap-4 mt-2 text-xs font-mono text-zinc-600">
              <p>Ano: <strong className="text-zinc-900">{veiculo?.ano || '—'}</strong></p>
              <p>KM Atual: <strong className="text-zinc-900">{veiculo?.quilometragem?.toLocaleString('pt-BR') || '—'}</strong></p>
              <p>Horímetro: <strong className="text-zinc-900">{veiculo?.horimetro_atual || '0'}h</strong></p>
            </div>
          </div>
        </div>

        {/* Detalhes do Serviço */}
        <div className="border border-zinc-300 rounded-lg p-5 mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-200 pb-2 mb-3">Detalhes do Plano Preventivo</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Serviço / Componente</p>
              <p className="text-sm font-black uppercase">{preventiva.nome || preventiva.servico} ({preventiva.componente})</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Status Atual</p>
              <p className="text-sm font-bold uppercase">{preventiva.status}</p>
            </div>
          </div>

          {preventiva.descricao && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Descrição Técnica / Observações</p>
              <p className="text-xs text-zinc-700 italic border-l-2 border-zinc-300 pl-3 py-1">{preventiva.descricao}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 bg-zinc-50 border border-zinc-200 p-3 rounded text-xs font-mono">
            <div>
              <span className="block text-[9px] text-zinc-500 uppercase">Último KM</span>
              <span className="font-bold">{preventiva.ultimo_km?.toLocaleString('pt-BR') || '—'}</span>
            </div>
            <div>
              <span className="block text-[9px] text-zinc-500 uppercase">Próximo KM Alvo</span>
              <span className="font-bold">{preventiva.proximo_km?.toLocaleString('pt-BR') || '—'}</span>
            </div>
            <div>
              <span className="block text-[9px] text-zinc-500 uppercase">Data Prevista</span>
              <span className="font-bold">{preventiva.proxima_data ? new Date(preventiva.proxima_data).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </div>
        </div>

        {/* Galeria de Fotos */}
        {fotos.length > 0 && (
          <div className="mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-300 pb-2 mb-4">Registro Fotográfico ({fotos.length})</h3>
            <div className="grid grid-cols-3 gap-4">
              {fotos.map((foto: string, index: number) => (
                <div key={index} className="border border-zinc-200 rounded-lg overflow-hidden aspect-square relative group">
                  <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover print:object-contain" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-1 font-mono print:hidden">
                    Foto {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-12 mt-20 pt-8 border-t border-zinc-300">
          <div className="text-center">
            <div className="border-t border-zinc-900 w-full mb-2"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Assinatura do Responsável Técnico</p>
            <p className="text-[10px] text-zinc-600">{company?.nome_fantasia || BRANDING.name}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-zinc-900 w-full mb-2"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Assinatura do Cliente</p>
            <p className="text-[10px] text-zinc-600">{cliente?.nome || ''}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
