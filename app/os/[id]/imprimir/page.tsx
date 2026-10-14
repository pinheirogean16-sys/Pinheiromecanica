'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { formatHoras } from '@/lib/utils';
import { BRANDING } from '@/lib/branding';

// ============================================================
// HELPER — Número por extenso (para o total)
// ============================================================
function numeroPorExtenso(valor: number): string {
  const unidades = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
  const dezenas = ['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const especiais = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

  function converteGrupo(n: number): string {
    if (n === 0) return '';
    let resultado = '';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c > 0) {
      if (c === 1 && resto === 0) resultado += 'cem';
      else resultado += centenas[c];
    }
    if (resto > 0) {
      if (resultado) resultado += ' e ';
      if (resto < 10) resultado += unidades[resto];
      else if (resto < 20) resultado += especiais[resto - 10];
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        resultado += dezenas[d];
        if (u > 0) resultado += ' e ' + unidades[u];
      }
    }
    return resultado;
  }

  if (valor === 0) return 'zero reais';

  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);

  let texto = '';
  if (reais === 0) {
    texto = '';
  } else if (reais < 1000) {
    texto = converteGrupo(reais);
  } else if (reais < 1000000) {
    const mil = Math.floor(reais / 1000);
    const resto = reais % 1000;
    texto = converteGrupo(mil) + (mil === 1 ? ' mil' : ' mil');
    if (resto > 0) texto += ' e ' + converteGrupo(resto);
  } else {
    const milhao = Math.floor(reais / 1000000);
    const resto = reais % 1000000;
    texto = converteGrupo(milhao) + (milhao === 1 ? ' milhão' : ' milhões');
    if (resto > 0) texto += ' e ' + converteGrupo(resto);
  }

  texto += reais === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    texto += ' e ' + converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return texto;
}

export default function ImprimirOSPage() {
  const params = useParams();
  const id = params?.id;
  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('companyData');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch('/api/configuracoes/empresa');
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            setCompany(data);
          }
        }
      } catch (err) {
        // Silencioso
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
        // Silencioso
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

  // ============================================================
  // DADOS CALCULADOS
  // ============================================================
  const logo = company?.logo_url || BRANDING.logo.url;

  const totalServicos = os.servicos?.reduce((acc: number, s: any) => acc + (s.valor_total || 0), 0) || 0;
  const totalPecas = os.pecas_aplicadas?.reduce((acc: number, p: any) => acc + (p.valor_total || 0), 0) || 0;
  const desconto = os.desconto || 0;
  const valorTotal = os.valor_total || (totalServicos + totalPecas - desconto);

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  const tipoOSLabel = os.tipoOS === 'CAMPO' || os.tipo_atendimento === 'CAMPO'
    ? 'ATENDIMENTO EXTERNO / CAMPO'
    : 'OFICINA';

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-mono text-black">
      {/* ============================================================
          CSS DE IMPRESSÃO A4
          ============================================================ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            font-size: 10pt;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-border {
            border: 1px solid #000 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ============================================================
          CONTROLE SUPERIOR (escondido na impressão)
          ============================================================ */}
      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl">
        <Link
          href={`/os/${id}`}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Voltar para OS
        </Link>
        <button
          onClick={() => window.print()}
          className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-orange-900/40"
        >
          <Printer size={16} /> Imprimir OS
        </button>
      </div>

      {/* ============================================================
          DOCUMENTO PRINCIPAL
          ============================================================ */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl p-4 sm:p-8 print:shadow-none print:p-0 border border-black print-container">

        {/* ============================================================
            CABEÇALHO — DADOS DA EMPRESA + LOGO VEHLOX
            ============================================================ */}
        <div className="flex border-b-2 border-black pb-4 mb-4 avoid-break">
          {/* Logo */}
          <div className="w-1/3 flex items-center justify-center border-r border-black pr-4">
            {logo ? (
              <img
                src={logo}
                alt={BRANDING.name}
                className="max-h-24 max-w-full object-contain"
              />
            ) : (
              <div className="text-xl font-black italic uppercase leading-none text-center">
                {BRANDING.name}
              </div>
            )}
          </div>

          {/* Dados da empresa */}
          <div className="w-2/3 pl-4 space-y-1">
            <h1 className="text-lg font-black uppercase leading-tight">
              {company?.razao_social || company?.nome_fantasia || 'RAZÃO SOCIAL NÃO CONFIGURADA'}
            </h1>
            {company?.nome_fantasia && company.nome_fantasia !== company.razao_social && (
              <p className="text-[10px] font-bold uppercase text-zinc-700">
                {company.nome_fantasia}
              </p>
            )}
            <p className="text-[10px] leading-tight">
              <span className="font-bold">CNPJ:</span> {company?.cnpj || '—'}
              {' | '}
              <span className="font-bold">IE:</span> {company?.inscricao_estadual || 'ISENTO'}
              {company?.inscricao_municipal ? ` | IM: ${company.inscricao_municipal}` : ''}
            </p>
            <p className="text-[10px] leading-tight">
              {company?.endereco || 'Endereço não configurado'}
              {company?.cidade ? ` - ${company.cidade}` : ''}
              {company?.uf ? `/${company.uf}` : ''}
            </p>
            <p className="text-[10px] leading-tight">
              <span className="font-bold">TEL:</span> {company?.telefone || '—'}
              {' | '}
              <span className="font-bold">EMAIL:</span> {company?.email || '—'}
            </p>
          </div>
        </div>

        {/* ============================================================
            TÍTULO E NÚMERO DA OS
            ============================================================ */}
        <div className="flex border-b-2 border-black mb-4 avoid-break">
          <div className="flex-1 p-2 bg-zinc-100 flex flex-col items-center justify-center border-r border-black">
            <h2 className="text-2xl font-black uppercase tracking-widest">ORDEM DE SERVIÇO</h2>
            <p className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider mt-0.5">
              {tipoOSLabel}
            </p>
          </div>
          <div className="w-44 p-2 text-center flex flex-col justify-center">
            <p className="text-[9px] font-bold uppercase text-zinc-600">NÚMERO</p>
            <p className="text-2xl font-black leading-none mt-0.5">
              #{os.numero ? os.numero.toString().padStart(6, '0') : '000000'}
            </p>
            <p className="text-[9px] font-bold uppercase text-zinc-600 mt-2">
              STATUS: <span className="text-black">{os.status?.replace(/_/g, ' ') || '—'}</span>
            </p>
          </div>
        </div>

        {/* ============================================================
            DADOS DO CLIENTE
            ============================================================ */}
        <div className="border border-black mb-3 avoid-break">
          <div className="bg-black text-white p-1">
            <p className="text-[10px] font-black uppercase px-1 tracking-widest">DADOS DO CLIENTE</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] truncate">
                <span className="font-bold">NOME:</span> {os.cliente?.nome || '—'}
              </p>
              <p className="text-[10px] truncate">
                <span className="font-bold">CPF/CNPJ:</span> {os.cliente?.cpf_cnpj || '—'}
              </p>
              <p className="text-[10px] truncate">
                <span className="font-bold">TELEFONE:</span> {os.cliente?.telefone || '—'}
              </p>
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] truncate">
                <span className="font-bold">EMAIL:</span> {os.cliente?.email || '—'}
              </p>
              <p className="text-[10px] truncate">
                <span className="font-bold">ENDEREÇO:</span> {os.cliente?.endereco || '—'}
              </p>
              <p className="text-[10px] truncate">
                <span className="font-bold">CIDADE:</span> {os.cliente?.cidade || '—'}
                {os.cliente?.estado ? ` / ${os.cliente.estado}` : (os.cliente?.uf ? ` / ${os.cliente.uf}` : '')}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================
            DADOS DO VEÍCULO
            ============================================================ */}
        <div className="border border-black mb-3 avoid-break">
          <div className="bg-black text-white p-1">
            <p className="text-[10px] font-black uppercase px-1 tracking-widest">DADOS DO VEÍCULO</p>
          </div>
          <div className="p-2 grid grid-cols-6 gap-2">
            <div className="col-span-1">
              <p className="text-[9px] font-bold uppercase text-zinc-600">PLACA</p>
              <p className="text-sm font-black uppercase border border-black p-1 text-center bg-zinc-50">
                {os.veiculo?.placa || '—'}
              </p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="text-[9px] font-bold uppercase text-zinc-600">MARCA / MODELO</p>
              <p className="text-[10px] uppercase truncate">
                {os.veiculo?.marca || '—'} {os.veiculo?.modelo || ''}
              </p>
            </div>
            <div className="col-span-1">
              <p className="text-[9px] font-bold uppercase text-zinc-600">ANO</p>
              <p className="text-[10px]">
                {os.veiculo?.ano_fabricacao || os.veiculo?.ano || '—'}
                {os.veiculo?.ano_modelo ? `/${os.veiculo.ano_modelo}` : ''}
              </p>
            </div>
            <div className="col-span-1">
              <p className="text-[9px] font-bold uppercase text-zinc-600">KM</p>
              <p className="text-[10px] font-bold">
                {(os.km_entrada || os.veiculo?.quilometragem || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="col-span-1">
              <p className="text-[9px] font-bold uppercase text-zinc-600">HORÍMETRO</p>
              <p className="text-[10px] font-bold">
                {os.horimetro_entrada || os.veiculo?.horimetro_atual || 0}h
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================
            SERVIÇOS REALIZADOS
            ============================================================ */}
        <div className="border border-black mb-3 avoid-break">
          <div className="bg-black text-white p-1">
            <p className="text-[10px] font-black uppercase px-1 tracking-widest">SERVIÇOS REALIZADOS</p>
          </div>
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="bg-zinc-100 border-b border-black font-bold">
                <th className="p-1.5 border-r border-black">DESCRIÇÃO DO SERVIÇO</th>
                <th className="p-1.5 border-r border-black text-center w-16">HORAS</th>
                <th className="p-1.5 border-r border-black text-right w-20">VLR. HORA</th>
                <th className="p-1.5 text-right w-24">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {os.servicos?.length > 0 ? (
                os.servicos.map((s: any) => (
                  <tr key={s.id} className="border-b border-black/30">
                    <td className="p-1.5 border-r border-black uppercase">
                      {s.descricao || '—'}
                    </td>
                    <td className="p-1.5 border-r border-black text-center">
                      {formatHoras(s.horas || 0)}
                    </td>
                    <td className="p-1.5 border-r border-black text-right">
                      {formatCurrency(s.valor_hora || 0)}
                    </td>
                    <td className="p-1.5 text-right font-bold">
                      {formatCurrency(s.valor_total || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center italic text-zinc-500 uppercase">
                    Nenhum serviço registrado para esta OS.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-100 border-t border-black font-bold">
              <tr>
                <td colSpan={3} className="p-1.5 text-right border-r border-black uppercase">
                  SUBTOTAL SERVIÇOS:
                </td>
                <td className="p-1.5 text-right">{formatCurrency(totalServicos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ============================================================
            PEÇAS E MATERIAIS
            ============================================================ */}
        <div className="border border-black mb-3 avoid-break">
          <div className="bg-black text-white p-1">
            <p className="text-[10px] font-black uppercase px-1 tracking-widest">PEÇAS E MATERIAIS APLICADOS</p>
          </div>
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="bg-zinc-100 border-b border-black font-bold">
                <th className="p-1.5 border-r border-black w-20">CÓDIGO</th>
                <th className="p-1.5 border-r border-black">DESCRIÇÃO DA PEÇA</th>
                <th className="p-1.5 border-r border-black text-center w-14">QTD</th>
                <th className="p-1.5 border-r border-black text-right w-20">VLR. UNIT</th>
                <th className="p-1.5 text-right w-24">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {os.pecas_aplicadas?.length > 0 ? (
                os.pecas_aplicadas.map((p: any) => (
                  <tr key={p.id} className="border-b border-black/30">
                    <td className="p-1.5 border-r border-black font-bold uppercase">
                      {p.peca?.codigo || p.peca?.codigo_interno || '—'}
                    </td>
                    <td className="p-1.5 border-r border-black uppercase">
                      {p.peca?.descricao || p.descricao || '—'}
                    </td>
                    <td className="p-1.5 border-r border-black text-center">
                      {p.quantidade || 0} {p.unidade || p.peca?.unidadeMedida || ''}
                    </td>
                    <td className="p-1.5 border-r border-black text-right">
                      {formatCurrency(p.valor_unit || 0)}
                    </td>
                    <td className="p-1.5 text-right font-bold">
                      {formatCurrency(p.valor_total || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center italic text-zinc-500 uppercase">
                    Nenhuma peça ou material aplicado registrado.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-100 border-t border-black font-bold">
              <tr>
                <td colSpan={4} className="p-1.5 text-right border-r border-black uppercase">
                  SUBTOTAL PEÇAS:
                </td>
                <td className="p-1.5 text-right">{formatCurrency(totalPecas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ============================================================
            OBSERVAÇÕES + RESUMO FINANCEIRO
            ============================================================ */}
        <div className="flex border border-black mb-3 avoid-break">
          {/* Observações */}
          <div className="flex-1 p-2 border-r border-black min-h-[110px]">
            <p className="text-[10px] font-black uppercase mb-1.5">
              OBSERVAÇÕES / RELATO TÉCNICO
            </p>
            <p className="text-[10px] italic leading-relaxed text-zinc-800 whitespace-pre-wrap">
              {os.diagnostico || 'Nenhuma observação adicional foi registrada para este serviço.'}
            </p>
            {os.observacoes && (
              <>
                <p className="text-[10px] font-black uppercase mt-2 mb-1">
                  OBSERVAÇÕES ADICIONAIS
                </p>
                <p className="text-[10px] italic leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {os.observacoes}
                </p>
              </>
            )}
          </div>

          {/* Resumo Financeiro */}
          <div className="w-72 bg-zinc-50 flex flex-col">
            <div className="p-1.5 border-b border-black flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase">TOTAL SERVIÇOS</span>
              <span className="text-[10px] font-bold">{formatCurrency(totalServicos)}</span>
            </div>
            <div className="p-1.5 border-b border-black flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase">TOTAL PEÇAS</span>
              <span className="text-[10px] font-bold">{formatCurrency(totalPecas)}</span>
            </div>
            {desconto > 0 && (
              <div className="p-1.5 border-b border-black flex justify-between items-center text-red-700">
                <span className="text-[10px] font-bold uppercase">DESCONTO</span>
                <span className="text-[10px] font-bold">- {formatCurrency(desconto)}</span>
              </div>
            )}
            <div className="p-3 flex justify-between items-center bg-black text-white mt-auto">
              <span className="text-xs font-black uppercase tracking-widest">TOTAL</span>
              <span className="text-2xl font-black">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        </div>

        {/* Valor por extenso */}
        <div className="border border-black p-1.5 mb-3 avoid-break">
          <p className="text-[10px]">
            <span className="font-bold uppercase">VALOR TOTAL POR EXTENSO:</span>{' '}
            <span className="italic uppercase">{numeroPorExtenso(valorTotal)}</span>
          </p>
        </div>

        {/* ============================================================
            DATAS E RESPONSÁVEIS
            ============================================================ */}
        <div className="grid grid-cols-3 border border-black mb-3 divide-x divide-black text-[10px] avoid-break">
          <div className="p-2">
            <p className="text-[9px] font-bold uppercase text-zinc-600 mb-0.5">
              MECÂNICO RESPONSÁVEL
            </p>
            <p className="font-black uppercase truncate">
              {os.mecanico?.name || 'NÃO ESPECIFICADO'}
            </p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-bold uppercase text-zinc-600 mb-0.5">
              DATA DE ABERTURA
            </p>
            <p className="font-black">
              {os.data_abertura
                ? new Date(os.data_abertura).toLocaleString('pt-BR')
                : (os.created_at ? new Date(os.created_at).toLocaleString('pt-BR') : '—')}
            </p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-bold uppercase text-zinc-600 mb-0.5">
              FORMA DE PAGAMENTO
            </p>
            <p className="font-black uppercase truncate">
              {os.forma_pagamento || 'A RECEBER / EM ABERTO'}
              {os.numero_parcelas > 1 ? ` (${os.numero_parcelas}x)` : ''}
            </p>
          </div>
        </div>

        {/* Assinatura digital (se houver) */}
        {os.assinatura_hash && (
          <div className="border border-black p-2 mb-3 text-[9px] avoid-break">
            <p className="font-bold uppercase text-zinc-600 mb-0.5">
              DOCUMENTO ASSINADO DIGITALMENTE
            </p>
            <p className="break-all font-mono">
              HASH SHA-256: {os.assinatura_hash}
            </p>
            {os.assinatura_timestamp && (
              <p className="mt-0.5">
                <span className="font-bold">Data da assinatura:</span>{' '}
                {new Date(os.assinatura_timestamp).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}

        {/* ============================================================
            ASSINATURAS
            ============================================================ */}
        <div className="grid grid-cols-2 gap-16 pt-16 pb-6 px-8 avoid-break">
          <div className="border-t border-black pt-2 text-center text-[10px]">
            <p className="font-black uppercase">RESPONSÁVEL PELA OFICINA</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">
              {company?.nome_fantasia || BRANDING.name}
            </p>
          </div>
          <div className="border-t border-black pt-2 text-center text-[10px]">
            <p className="font-black uppercase">ASSINATURA DO CLIENTE</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">
              {os.cliente?.nome || ''}
            </p>
          </div>
        </div>

        {/* ============================================================
            RODAPÉ
            ============================================================ */}
        <div className="text-center pt-3 border-t border-black avoid-break">
          <p className="text-[8px] uppercase font-bold text-zinc-500">
            ESTE DOCUMENTO É UMA REPRESENTAÇÃO DOS SERVIÇOS EXECUTADOS E PEÇAS APLICADAS, NÃO TENDO VALOR FISCAL.
          </p>
          {company?.rodape_personalizado && (
            <p className="text-[9px] font-bold text-zinc-700 mt-1.5 italic whitespace-pre-wrap">
              {company.rodape_personalizado}
            </p>
          )}
          <p className="text-[9px] uppercase font-black text-zinc-800 mt-2">
            {company?.cidade || 'CIDADE'}, {dataFormatada}
          </p>
          <p className="text-[8px] font-bold text-zinc-400 mt-1">
            {BRANDING.name} — {BRANDING.slogan}
          </p>
        </div>

      </div>
    </div>
  );
}
