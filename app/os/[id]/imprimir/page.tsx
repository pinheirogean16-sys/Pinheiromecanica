'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { formatHoras } from '@/lib/utils';

export default function ImprimirOSPage() {
  const params = useParams();
  const id = params?.id;
  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [logo, setLogo] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('companyData');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCompany(parsed);
          if (parsed.logo_url) {
            setLogo(parsed.logo_url);
          } else {
            const savedLogo = localStorage.getItem('logo');
            if (savedLogo) setLogo(savedLogo);
          }
        } else {
          const savedLogo = localStorage.getItem('logo');
          if (savedLogo) setLogo(savedLogo);
        }
      } catch (e) {
        console.error('Erro ao carregar dados da empresa:', e);
      }
    }

    const fetchCompany = async () => {
      try {
        const res = await fetch('/api/configuracoes/empresa');
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            setCompany(data);
            if (data.logo_url) {
              setLogo(data.logo_url);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados da empresa:', err);
      }
    };
    fetchCompany();

    const fetchOS = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/ordens/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOs(data);
        }
      } catch (err) { 
        console.error('Erro ao buscar OS:', err); 
      } finally {
        setLoading(false);
      }
    };
    fetchOS();
  }, [id]);

  const formatCurrency = (val: number) => {
    if (typeof val !== 'number') return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Ordem de Serviço...</p>
        </div>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6">
        <h1 className="text-xl font-black uppercase tracking-tighter">ORDEM DE SERVIÇO NÃO ENCONTRADA</h1>
        <Link href="/os" className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
          Voltar para Listagem
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-mono text-black">
      {/* Estilos de Impressão nativos */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border: 1px solid black !important;
          }
        }
      `}</style>

      {/* Controle Superior (Escondido na Impressão) */}
      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl">
        <Link href={`/os/${id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar para OS
        </Link>
        <button 
          onClick={() => window.print()}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-orange-900/40"
        >
          <Printer size={16} /> Imprimir DANFE / OS
        </button>
      </div>

      {/* DOCUMENTO PRINCIPAL */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl p-4 sm:p-8 print:shadow-none print:p-0 border border-black">
        
        {/* CABEÇALHO - DADOS DA EMPRESA */}
        <div className="flex border-b border-black pb-4 mb-4">
          <div className="w-1/3 flex items-center justify-center border-r border-black pr-4">
            {logo ? (
              <img src={logo} alt="Logo" className="max-h-24 object-contain" />
            ) : (
              <div className="text-xl font-black italic uppercase leading-none text-center">
                {company?.nomeFantasia || 'PINHEIRO DIESEL'}
              </div>
            )}
          </div>
          <div className="w-2/3 pl-4 space-y-1">
            <h1 className="text-xl font-black uppercase">{company?.razao_social || company?.nome_fantasia || 'PINHEIRO DIESEL LTDA'}</h1>
            <p className="text-[10px] leading-tight">
              CNPJ: {company?.cnpj || '00.000.000/0001-00'} | IE: {company?.inscricao_estadual || 'ISENTO'} {company?.inscricao_municipal ? `| IM: ${company.inscricao_municipal}` : ''}
            </p>
            <p className="text-[10px] leading-tight text-zinc-800">
              {company?.endereco || 'RUA EXEMPLO, 123 - CENTRO - SÃO PAULO/SP'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-800">
              TEL: {company?.telefone || '(00) 00000-0000'} | EMAIL: {company?.email || 'CONTATO@EXEMPLO.COM'}
            </p>
          </div>
        </div>

        {/* TÍTULO E NÚMERO */}
        <div className="flex border-b border-black mb-4">
          <div className="flex-1 p-2 bg-zinc-100 flex items-center justify-center border-r border-black">
            <h2 className="text-2xl font-black uppercase tracking-widest">ORDEM DE SERVIÇO</h2>
          </div>
          <div className="w-48 p-2 text-center">
            <p className="text-[10px] font-bold uppercase">NÚMERO</p>
            <p className="text-2xl font-black">#{os.numero ? os.numero.toString().padStart(6, '0') : '000000'}</p>
          </div>
        </div>

        {/* DADOS DO CLIENTE */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">DADOS DO CLIENTE</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] truncate"><span className="font-bold">NOME/RAZÃO SOCIAL:</span> {os.cliente?.nome || '—'}</p>
              <p className="text-[10px] truncate"><span className="font-bold">CPF/CNPJ:</span> {os.cliente?.cpf_cnpj || '—'}</p>
              <p className="text-[10px] truncate"><span className="font-bold">ENDEREÇO:</span> {os.cliente?.endereco || 'NÃO INFORMADO'}</p>
              <p className="text-[10px] truncate"><span className="font-bold">EMAIL:</span> {os.cliente?.email || 'NÃO INFORMADO'}</p>
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] truncate"><span className="font-bold">TELEFONE:</span> {os.cliente?.telefone || '—'}</p>
              <p className="text-[10px] truncate"><span className="font-bold">CIDADE:</span> {os.cliente?.cidade || '—'}</p>
              <p className="text-[10px] truncate"><span className="font-bold">ESTADO:</span> {os.cliente?.estado || os.cliente?.uf || '—'}</p>
            </div>
          </div>
        </div>

        {/* DADOS DO VEÍCULO */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">DADOS DO VEÍCULO</p>
          </div>
          <div className="p-2 grid grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase">PLACA</p>
              <p className="text-sm font-black uppercase border border-black p-1 text-center bg-zinc-50">{os.veiculo?.placa || '—'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase truncate">MARCA/MODELO</p>
              <p className="text-[10px] uppercase truncate">{os.veiculo?.marca} {os.veiculo?.modelo || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase">ANO</p>
              <p className="text-[10px]">{os.veiculo?.ano || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase">KM</p>
              <p className="text-[10px]">{os.quilometragem?.toLocaleString() || '0'} KM</p>
            </div>
          </div>
        </div>

        {/* SERVIÇOS REALIZADOS */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">SERVIÇOS REALIZADOS / MÃO DE OBRA</p>
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-left text-[10px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-black font-bold">
                <th className="p-2 border-r border-black">DESCRIÇÃO DO SERVIÇO</th>
                <th className="p-2 border-r border-black text-center w-20">HORAS</th>
                <th className="p-2 border-r border-black text-right w-24">VLR. HORA</th>
                <th className="p-2 text-right w-28">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {os.servicos?.length > 0 ? (os.servicos || []).map((s: any) => (
                <tr key={s.id}>
                  <td className="p-2 border-r border-black uppercase font-bold truncate max-w-[300px]">{s.descricao}</td>
                  <td className="p-2 border-r border-black text-center">{formatHoras(s.horas || 0)}</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(s.valor_hora)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(s.valor_total)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center italic text-zinc-500 uppercase">Nenhum serviço registrado para esta OS.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-100 border-t border-black font-bold">
              <tr>
                <td colSpan={3} className="p-2 text-right border-r border-black uppercase">SUBTOTAL SERVIÇOS:</td>
                <td className="p-2 text-right">{formatCurrency(os.servicos ? os.servicos.reduce((acc: number, s: any) => acc + s.valor_total, 0) : 0)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* PEÇAS APLICADAS */}
        <div className="border border-black mb-4">
          <div className="bg-zinc-100 p-1 border-b border-black">
            <p className="text-[10px] font-black uppercase px-1">PEÇAS E MATERIAIS APLICADOS</p>
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-left text-[10px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-black font-bold">
                <th className="p-2 border-r border-black w-24">CÓDIGO</th>
                <th className="p-2 border-r border-black">DESCRIÇÃO DA PEÇA</th>
                <th className="p-2 border-r border-black text-center w-16">QTD</th>
                <th className="p-2 border-r border-black text-right w-24">VLR. UNIT</th>
                <th className="p-2 text-right w-28">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {os.pecas_aplicadas?.length > 0 ? (os.pecas_aplicadas || []).map((p: any) => (
                <tr key={p.id}>
                  <td className="p-2 border-r border-black font-bold uppercase">{p.peca?.codigo || '—'}</td>
                  <td className="p-2 border-r border-black uppercase truncate max-w-[300px]">{p.peca?.descricao || '—'}</td>
                  <td className="p-2 border-r border-black text-center">{p.quantidade?.toString() || '0'}</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(p.valor_unit)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(p.valor_total)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center italic text-zinc-500 uppercase">Nenhuma peça ou material aplicado registrado.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-100 border-t border-black font-bold">
              <tr>
                <td colSpan={4} className="p-2 text-right border-r border-black uppercase">SUBTOTAL PEÇAS:</td>
                <td className="p-2 text-right">{formatCurrency(os.pecas_aplicadas ? os.pecas_aplicadas.reduce((acc: number, p: any) => acc + p.valor_total, 0) : 0)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* RESUMO DE VALORES E OBSERVAÇÕES */}
        <div className="flex border border-black mb-4 min-h-[120px]">
          <div className="flex-1 p-2 border-r border-black">
            <p className="text-[10px] font-black uppercase mb-2">OBSERVAÇÕES / RELATO TÉCNICO:</p>
            <p className="text-[10px] italic leading-relaxed text-zinc-700">{os.diagnostico || 'Nenhuma observação adicional foi registrada para este serviço.'}</p>
          </div>
          <div className="w-72 bg-zinc-50 flex flex-col">
            <div className="p-2 border-b border-black flex justify-between">
              <span className="text-[10px] font-bold uppercase">TOTAL SERVIÇOS:</span>
              <span className="text-[10px] font-black">{formatCurrency(os.servicos ? os.servicos.reduce((acc: number, s: any) => acc + s.valor_total, 0) : 0)}</span>
            </div>
            <div className="p-2 border-b border-black flex justify-between">
              <span className="text-[10px] font-bold uppercase">TOTAL PEÇAS:</span>
              <span className="text-[10px] font-black">{formatCurrency(os.pecas_aplicadas ? os.pecas_aplicadas.reduce((acc: number, p: any) => acc + p.valor_total, 0) : 0)}</span>
            </div>
            <div className="p-2 border-b border-black flex justify-between text-red-600">
              <span className="text-[10px] font-bold uppercase">DESCONTO:</span>
              <span className="text-[10px] font-black">-{formatCurrency(os.desconto || 0)}</span>
            </div>
            <div className="p-3 flex justify-between items-center bg-black text-white mt-auto">
              <span className="text-xs font-black uppercase tracking-widest">VALOR TOTAL:</span>
              <span className="text-xl font-black">{formatCurrency(os.valor_total)}</span>
            </div>
          </div>
        </div>

        {/* DATAS E RESPONSÁVEIS */}
        <div className="grid grid-cols-3 border border-black mb-4 divide-x divide-black text-[10px]">
          <div className="p-2">
            <p className="text-[9px] font-bold uppercase text-zinc-500 mb-1">MECÂNICO RESPONSÁVEL</p>
            <p className="font-black uppercase">{os.mecanico?.name || ' NÃO ESPECIFICADO'}</p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-bold uppercase text-zinc-500 mb-1">DATA DE ENTRADA</p>
            <p className="font-black">{os.data_entrada ? new Date(os.data_entrada).toLocaleString('pt-BR') : '—'}</p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-bold uppercase text-zinc-500 mb-1">FORMA DE PAGAMENTO</p>
            <p className="font-black uppercase">{os.financeiro && os.financeiro[0] ? os.financeiro[0].forma_pagamento : 'A RECEBER / EM ABERTO'}</p>
          </div>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-2 gap-16 pt-20 pb-10 px-8">
          <div className="border-t border-black pt-2 text-center text-[10px]">
            <p className="font-black uppercase">RESPONSÁVEL PELA OFICINA</p>
          </div>
          <div className="border-t border-black pt-2 text-center text-[10px]">
            <p className="font-black uppercase">ASSINATURA DO CLIENTE</p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pt-4 border-t border-black">
          <p className="text-[8px] uppercase font-bold text-zinc-400">
            ESTE DOCUMENTO É UMA REPRESENTAÇÃO DOS SERVIÇOS EXECUTADOS E PEÇAS APLICADAS, NÃO TENDO VALOR FISCAL.
          </p>
          <p className="text-[9px] uppercase font-black text-zinc-800 mt-2">
            {company?.cidade || 'SÃO PAULO'}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
          </p>
          <p className="text-[9px] font-bold text-zinc-500 mt-1 italic whitespace-pre-wrap">
            {company?.rodape_personalizado || `${company?.nome_fantasia || 'PINHEIRO DIESEL PRO'} - Sistema de Gestão Automotiva`}
          </p>
        </div>

      </div>
    </div>
  );
}
