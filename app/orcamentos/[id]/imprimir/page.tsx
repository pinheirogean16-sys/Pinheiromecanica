'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ImprimirOrcamentoPage() {
  const params = useParams();
  const id = params?.id;
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    // A31: usa a rota pública (acessível a todos os papéis).
    const fetchCompany = async () => {
      try {
        const res = await fetch('/api/configuracoes/empresa/publico');
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setCompany(data);
          }
        }
      } catch {
        // Silencioso — impressão usa fallback
      }
    };
    fetchCompany();

    const fetchOrcamento = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/orcamentos/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrcamento(data);
        }
      } catch {
        // Silencioso
      } finally {
        setLoading(false);
      }
    };
    fetchOrcamento();
  }, [id]);

  const formatCurrency = (val: number) => {
    if (typeof val !== 'number') return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Orçamento...</p>
        </div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6">
        <h1 className="text-xl font-black uppercase tracking-tighter">ORÇAMENTO NÃO ENCONTRADO</h1>
        <Link href="/orcamentos" className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
          Voltar para Listagem
        </Link>
      </div>
    );
  }

  const logo = company?.logo_url;

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-mono text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between no-print shadow-xl gap-4">
        <Link href={`/orcamentos/${id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest w-full sm:w-auto justify-center sm:justify-start">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button 
          onClick={() => window.print()}
          className="w-full sm:w-auto px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-orange-900/40 justify-center"
        >
          <Printer size={16} /> Imprimir Orçamento
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-2xl p-4 sm:p-8 print:shadow-none print:p-0 border border-black">
        
        {/* CABEÇALHO */}
        <div className="flex border-b border-black pb-4 mb-4">
          <div className="w-1/3 flex items-center justify-center border-r border-black pr-4">
            {logo ? (
              <img src={logo} alt="Logo" className="max-h-24 object-contain" />
            ) : (
              <div className="text-xl font-black italic uppercase leading-none text-center">
                {company?.nome_fantasia || 'RAZÃO SOCIAL NÃO CONFIGURADA'}
              </div>
            )}
          </div>
          <div className="w-2/3 pl-4 space-y-1">
            <h1 className="text-xl font-black uppercase">
              {company?.razao_social || company?.nome_fantasia || 'RAZÃO SOCIAL NÃO CONFIGURADA'}
            </h1>
            <p className="text-[10px] leading-tight font-bold">
              CNPJ: {company?.cnpj || '—'} | IE: {company?.inscricao_estadual || 'ISENTO'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-800">
              {company?.endereco
                ? `${company.endereco}${company.numero ? `, ${company.numero}` : ''}${company.cidade ? ` - ${company.cidade}` : ''}${company.uf ? `/${company.uf}` : ''}`
                : 'Endereço não configurado'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-800">
              TEL: {company?.telefone || '—'} | EMAIL: {company?.email || '—'}
            </p>
          </div>
        </div>

        <div className="flex border-b border-black mb-4">
          <div className="flex-1 p-2 bg-zinc-100 flex items-center justify-center border-r border-black">
            <h2 className="text-2xl font-black uppercase tracking-widest">ORÇAMENTO / PROPOSTA</h2>
          </div>
          <div className="w-48 p-2 text-center">
            <p className="text-[10px] font-bold uppercase">NÚMERO</p>
            <p className="text-2xl font-black">{orcamento.numero}</p>
          </div>
        </div>

        {/* CLIENTE */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">DADOS DO CLIENTE</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase"><span className="font-bold">NOME:</span> {orcamento.cliente?.nome}</p>
              <p className="text-[10px] uppercase"><span className="font-bold">CPF/CNPJ:</span> {orcamento.cliente?.cpf_cnpj}</p>
              <p className="text-[10px] uppercase"><span className="font-bold">ENDEREÇO:</span> {orcamento.cliente?.endereco || 'N/A'}</p>
              <p className="text-[10px] uppercase"><span className="font-bold">CIDADE:</span> {orcamento.cliente?.cidade || '—'}</p>
              <p className="text-[10px] uppercase"><span className="font-bold">ESTADO:</span> {orcamento.cliente?.estado || orcamento.cliente?.uf || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase"><span className="font-bold">CONTATO:</span> {orcamento.cliente?.telefone}</p>
              <p className="text-[10px] uppercase"><span className="font-bold">EMAIL:</span> {orcamento.cliente?.email || 'NÃO INFORMADO'}</p>
              <p className="text-[10px] uppercase"><span className="font-bold">DATA EMISSÃO:</span> {formatDate(orcamento.created_at)}</p>
              <p className="text-[10px] uppercase"><span className="font-bold text-red-600">VALIDADE:</span> {orcamento.data_validade ? formatDate(orcamento.data_validade) : '7 DIAS AVANTE'}</p>
            </div>
          </div>
        </div>

        {/* VEÍCULO */}
        {orcamento.veiculo && (
          <div className="border border-black mb-4">
            <div className="bg-zinc-100 p-1 border-b border-black">
              <p className="text-[10px] font-black uppercase px-1">DADOS DO VEÍCULO / ATIVO</p>
            </div>
            <div className="p-2 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[8px] font-bold uppercase text-zinc-500">MÁQUINA/MODELO</p>
                <p className="text-[10px] font-black uppercase">{orcamento.veiculo.marca} {orcamento.veiculo.modelo}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase text-zinc-500">PLACA/SÉRIE</p>
                <p className="text-[10px] font-black border border-black px-2 py-1 bg-zinc-50 w-fit">{orcamento.veiculo.placa}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase text-zinc-500">HORÍMETRO/KM</p>
                <p className="text-[10px] font-black uppercase">{orcamento.veiculo.horimetro_atual || orcamento.veiculo.quilometragem || '0'}</p>
              </div>
            </div>
          </div>
        )}

        {/* SERVIÇOS */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">DESCRIÇÃO DOS SERVIÇOS (MÃO DE OBRA)</p>
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-black">
                <th className="p-2 border-r border-black uppercase w-1/2">Descrição</th>
                <th className="p-2 border-r border-black uppercase text-center">Hrs/Un</th>
                <th className="p-2 border-r border-black uppercase text-right">Vlr Unit</th>
                <th className="p-2 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {orcamento.servicos.map((s: any) => (
                <tr key={s.id}>
                  <td className="p-2 border-r border-black uppercase font-bold">{s.descricao}</td>
                  <td className="p-2 border-r border-black text-center">{s.horas}h</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(s.valor_hora)}</td>
                  <td className="p-2 text-right font-black">{formatCurrency(s.valor_total)}</td>
                </tr>
              ))}
              {orcamento.servicos.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center italic text-zinc-500 uppercase">Nenhum serviço especificado</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* PEÇAS */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">PEÇAS E MATERIAIS APLICADOS</p>
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-black">
                <th className="p-2 border-r border-black uppercase w-1/2">Descrição</th>
                <th className="p-2 border-r border-black uppercase text-center">Qtd</th>
                <th className="p-2 border-r border-black uppercase text-right">Vlr Unit</th>
                <th className="p-2 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {orcamento.pecas.map((p: any) => (
                <tr key={p.id}>
                  <td className="p-2 border-r border-black uppercase font-bold">{p.descricao}</td>
                  <td className="p-2 border-r border-black text-center">{p.quantidade}</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(p.valor_unit)}</td>
                  <td className="p-2 text-right font-black">{formatCurrency(p.valor_total)}</td>
                </tr>
              ))}
              {orcamento.pecas.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center italic text-zinc-500 uppercase">Nenhuma peça especificada</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* TOTAIS */}
        <div className="flex border border-black mb-8 min-h-[140px]">
          <div className="flex-1 p-3 border-r border-black">
            <p className="text-[10px] font-black uppercase mb-1">Termos e Condições:</p>
            <p className="text-[10px] italic text-zinc-700 whitespace-pre-wrap">{orcamento.termos_condicoes || 'Preços sujeitos a alteração conforme disponibilidade de estoque.'}</p>
            {orcamento.observacoes && (
              <div className="mt-4">
                <p className="text-[8px] font-black uppercase text-zinc-400">Observações Extras:</p>
                <p className="text-[9px] uppercase border-l-2 border-zinc-200 pl-2">{orcamento.observacoes}</p>
              </div>
            )}
          </div>
          <div className="w-64 bg-zinc-50 divide-y divide-zinc-200">
            <div className="p-2 flex justify-between">
              <span className="text-[10px] font-bold">TOTAL SERVIÇOS:</span>
              <span className="text-[10px] font-black">{formatCurrency(orcamento.valor_servicos)}</span>
            </div>
            <div className="p-2 flex justify-between">
              <span className="text-[10px] font-bold">TOTAL PEÇAS:</span>
              <span className="text-[10px] font-black">{formatCurrency(orcamento.valor_pecas)}</span>
            </div>
            <div className="p-2 flex justify-between bg-zinc-100">
              <span className="text-[10px] font-bold">DESCONTO:</span>
              <span className="text-[10px] font-black">-{formatCurrency(orcamento.desconto)}</span>
            </div>
            <div className="p-4 flex justify-between items-center bg-black text-white mt-auto">
              <span className="text-xs font-black uppercase">INVESTIMENTO:</span>
              <span className="text-xl font-black">{formatCurrency(orcamento.valor_total)}</span>
            </div>
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-16 pb-12 px-8">
          <div className="border-t border-black pt-2 text-center text-[10px]">
            <p className="font-black uppercase">RESPONSÁVEL TÉCNICO</p>
          </div>
          <div className="border-t border-black pt-2 text-center text-[10px]">
            <p className="font-black uppercase">ACEITE DO CLIENTE (DATA E ASSINATURA)</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-4 border-t border-black">
          <p className="text-[8px] uppercase font-bold text-zinc-400">
            PROPOSTA COMERCIAL VÁLIDA POR TEMPO LIMITADO. ESTE DOCUMENTO NÃO POSSUI VALOR FISCAL.
          </p>
          {company?.rodape_personalizado && (
            <p className="text-[9px] font-bold text-zinc-700 mt-1.5 italic whitespace-pre-wrap">
              {company.rodape_personalizado}
            </p>
          )}
          <p className="text-[9px] uppercase font-black text-zinc-800 mt-2">
            {company?.cidade || 'CIDADE'}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
          </p>
        </div>

      </div>
    </div>
  );
}
