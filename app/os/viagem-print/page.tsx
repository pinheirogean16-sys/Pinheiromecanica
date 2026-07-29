'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ChevronLeft, MapPin, Milestone, Receipt, Users, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function ViagemPrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch('/api/configuracoes/empresa');
        if (res.ok) {
          const data = await res.json();
          setCompany(data);
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
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando Relatório de Viagem...</p>
        </div>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 p-10 gap-6">
        <h1 className="text-xl font-black uppercase tracking-tighter">ORDEM DE SERVIÇO DE ORIGEM NÃO ENCONTRADA</h1>
        <Link href="/os" className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
          Voltar para Listagem
        </Link>
      </div>
    );
  }

  const logo = company?.logo_url;

  let timeline: any[] = [];
  try {
    timeline = typeof os.timeline_viagem === 'string' ? JSON.parse(os.timeline_viagem || '[]') : (os.timeline_viagem || []);
  } catch (e) {
    timeline = [];
  }

  let equipe: any[] = [];
  try {
    equipe = typeof os.mao_obra_equipe === 'string' ? JSON.parse(os.mao_obra_equipe || '[]') : (os.mao_obra_equipe || []);
  } catch (e) {
    equipe = [];
  }

  const totalDespesas = (
    Number(os.despesa_pedagio || 0) +
    Number(os.despesa_combustivel || 0) +
    Number(os.despesa_hospedagem || 0) +
    Number(os.despesa_alimentacao || 0) +
    Number(os.despesa_diaria_tecnica || 0) +
    Number(os.despesa_guincho || 0) +
    Number(os.despesa_outros || 0)
  );

  let comprovantes: any = {};
  try {
    comprovantes = typeof os.despesas_comprovantes === 'string' ? JSON.parse(os.despesas_comprovantes || '{}') : (os.despesas_comprovantes || {});
  } catch (e) {
    comprovantes = {};
  }

  const subtotalPecas = os.pecas_aplicadas ? os.pecas_aplicadas.reduce((acc: number, p: any) => acc + Number(p.valor_total || 0), 0) : 0;
  const subtotalServicos = os.servicos ? os.servicos.reduce((acc: number, s: any) => acc + Number(s.valor_total || 0), 0) : 0;
  const totalDeslocamento = Number(os.total_deslocamento || 0);
  const totalDespesasReembolso = Number(totalDespesas || 0);
  const totalMaoObraExterna = Number(os.mao_obra_externa_total || 0);

  const totalGeralOS = totalDeslocamento + subtotalPecas + subtotalServicos + totalDespesasReembolso + totalMaoObraExterna;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-mono print:text-black">
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
          .print-bg-white {
            background-color: white !important;
            color: black !important;
            border-color: black !important;
          }
          .print-text-black {
            color: black !important;
          }
          .print-border-black {
            border-color: black !important;
          }
          .print-divider-black {
            border-bottom: 1px solid black !important;
          }
          .print-bg-zinc-100 {
            background-color: #f4f4f5 !important;
            color: black !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      {/* Controle Superior (Escondido na Impressão) */}
      <div className="max-w-4xl mx-auto mb-6 bg-zinc-900 p-4 rounded-2xl flex items-center justify-between no-print shadow-xl border border-zinc-800">
        <Link href={`/os/${os.id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
          <ChevronLeft size={16} /> Voltar para OS
        </Link>
        <button 
          onClick={() => window.print()}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-amber-900/40"
        >
          <Printer size={16} /> Imprimir Relatório
        </button>
      </div>

      {/* DOCUMENTO PRINCIPAL */}
      <div className="max-w-4xl mx-auto bg-zinc-900 text-zinc-100 shadow-2xl p-8 print:shadow-none print:p-0 border border-amber-500/40 rounded-3xl print:rounded-none print:border-black print:bg-white print:text-black print-bg-white">
        
        {/* CABEÇALHO */}
        <div className="flex border-b border-zinc-800 pb-4 mb-4 print:border-black">
          <div className="w-1/3 flex items-center justify-center border-r border-zinc-800 pr-4 print:border-black">
            {logo ? (
              <img src={logo} alt="Logo" className="max-h-24 object-contain brightness-100 print:brightness-100" />
            ) : (
              <div className="text-xl font-black italic uppercase leading-none text-center text-amber-500 print:text-black">
                {company?.nome_fantasia || 'PINHEIRO DIESEL'}
              </div>
            )}
          </div>
          <div className="w-2/3 pl-4 space-y-1">
            <h1 className="text-lg font-black uppercase text-amber-500 print:text-black">{company?.razao_social || company?.nome_fantasia || 'PINHEIRO MECÂNICA DIESEL'}</h1>
            <p className="text-[10px] leading-tight text-zinc-400 print:text-black">
              CNPJ: {company?.cnpj || '00.000.000/0001-00'} | IE: {company?.inscricao_estadual || 'ISENTO'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-400 print:text-black">
              {company?.endereco || 'RUA ERNESTO GIANINI, 102 - PARQUE INDUSTRIAL - MARÍLIA/SP'}
            </p>
            <p className="text-[10px] leading-tight text-zinc-400 print:text-black">
              TEL: {company?.telefone || '(14) 3456-7890'} | EMAIL: {company?.email || 'contato@pinheirodiesel.com.br'}
            </p>
          </div>
        </div>

        {/* TÍTULO DO RELATÓRIO DE VIAGEM */}
        <div className="bg-amber-600 text-black py-2 px-4 text-center font-black uppercase tracking-widest text-sm mb-4 rounded-xl print:rounded-none print:bg-black print:text-white">
          RELATÓRIO DE ATENDIMENTO EXTERNO E CONTROLE DE KM - PROTOCOLO #{os.numero || os.id.slice(0,6).toUpperCase()}
        </div>

        {/* METADADOS DA OS DO CLIENTE */}
        <div className="grid grid-cols-2 border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="p-4 border-r border-zinc-800 space-y-1 print:border-black">
            <h2 className="text-[11px] font-black uppercase border-b border-zinc-800 pb-1 mb-2 text-amber-500 print:text-black print:border-black">DADOS DO CLIENTE</h2>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">CLIENTE: <span className="font-normal text-zinc-100 print:text-black">{os.cliente?.nome}</span></p>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">CNPJ/CPF: <span className="font-normal text-zinc-100 print:text-black">{os.cliente?.cpf_cnpj}</span></p>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">TELEFONE: <span className="font-normal text-zinc-100 print:text-black">{os.cliente?.telefone}</span></p>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">EMAIL: <span className="font-normal text-zinc-100 print:text-black">{os.cliente?.email || 'NÃO CONFIGURADO'}</span></p>
          </div>
          <div className="p-4 space-y-1">
            <h2 className="text-[11px] font-black uppercase border-b border-zinc-800 pb-1 mb-2 text-amber-500 print:text-black print:border-black">DADOS DO EQUIPAMENTO / VEÍCULO</h2>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">FROTA / PLACA: <span className="text-amber-500 font-extrabold print:text-black">{os.veiculo?.placa}</span></p>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">MARCA/MODELO: <span className="font-normal uppercase text-zinc-100 print:text-black">{os.veiculo?.marca} {os.veiculo?.modelo}</span></p>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">ANO: <span className="font-normal text-zinc-100 print:text-black">{os.veiculo?.ano}</span></p>
            <p className="text-[11px] font-bold text-zinc-300 print:text-black">TIPO SERVIÇO: <span className="text-amber-500 font-extrabold print:text-black">{os.tipo_atendimento}</span></p>
            {os.veiculo?.horimetro_atual && (
              <p className="text-[11px] font-bold text-zinc-300 print:text-black">HORÍMETRO ATUAL: <span className="font-normal text-zinc-100 print:text-black">{os.veiculo.horimetro_atual}h</span></p>
            )}
          </div>
        </div>

        {/* CONTROLE DE KM E DESLOCAMENTO */}
        <div className="border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="bg-zinc-800/60 px-4 py-2 border-b border-zinc-800 font-black uppercase text-xs tracking-wider text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
            1. CONTROLE DE QUILOMETRAGEM (QUILÔMETRO DE DESLOCAMENTO)
          </div>
          <div className="grid grid-cols-5 p-4 text-center divide-x divide-zinc-800 print:divide-black">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase">KM Ida</p>
              <p className="text-sm font-black mt-1 text-zinc-100 print:text-black">{os.km_saida || 0} km</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-500 uppercase">KM Volta</p>
              <p className="text-sm font-black mt-1 text-zinc-100 print:text-black">{os.km_retorno || 0} km</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-500 uppercase">Total KM Rodado</p>
              <p className="text-sm font-black text-amber-500 mt-1 print:text-black">{os.km_total || 0} km</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-500 uppercase">Valor cobrado / KM</p>
              <p className="text-sm font-black mt-1 text-zinc-100 print:text-black">{formatCurrency(os.valor_km || 0)}</p>
            </div>
            <div>
              <p className="text-[9px] text-amber-500 uppercase font-black print:text-black">Total Deslocamento</p>
              <p className="text-sm font-black text-amber-500 mt-1 print:text-black">{formatCurrency(os.total_deslocamento || 0)}</p>
            </div>
          </div>
        </div>

        {/* LOCALIZAÇÃO E MAPA SIMPLIFICADO */}
        <div className="grid grid-cols-3 border border-zinc-800 mb-4 gap-0 divide-x divide-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white print:divide-black">
          <div className="col-span-2 p-4 space-y-2">
            <h3 className="text-[11px] font-black uppercase text-amber-500 print:text-black">2. LOCAL DE ATENDIMENTO</h3>
            <div className="space-y-1">
              <p className="text-[12px] font-black text-zinc-100 uppercase print:text-black">
                {os.local_atendimento || 'Endereço não informado'}
              </p>
              <p className="text-xs text-zinc-400 print:text-black">
                CIDADE: {os.local_cidade || '-'} | ESTADO: {os.local_estado || '-'}
              </p>
              {os.local_gps && (
                <p className="text-xs text-zinc-500 font-mono print:text-black">
                  LOCALIZAÇÃO DE SATÉLITE GPS (CAPTURA): {os.local_gps}
                </p>
              )}
            </div>
          </div>
          <div className="p-4 flex flex-col justify-center items-center bg-zinc-900/30 text-center select-none print:bg-zinc-50">
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-tight mb-2">Mapa Esquemático de Rota</p>
            <div className="w-full flex items-center justify-center py-2">
              {/* Rota visual em SVG */}
              <svg className="w-4/5 h-12" viewBox="0 0 100 30" fill="none">
                <circle cx="10" cy="15" r="4" fill="#f59e0b" className="print:fill-black" />
                <text x="10" y="27" fontSize="5" textAnchor="middle" fill="#71717a" className="print:fill-black" fontWeight="bold">OFICINA</text>
                
                <path d="M 14 15 Q 30 5, 50 15 T 86 15" stroke="#f59e0b" className="print:stroke-black" strokeWidth="2" strokeDasharray="3 2" />
                <path d="M 86 15 L 82 11 M 86 15 L 82 19" stroke="#f59e0b" className="print:stroke-black" strokeWidth="1.5" />
                
                <circle cx="90" cy="15" r="4" fill="#f59e0b" className="print:fill-black" />
                <text x="90" y="27" fontSize="5" textAnchor="middle" fill="#f59e0b" className="print:fill-black" fontWeight="bold">DESTINO</text>
              </svg>
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold print:text-black">Oficina → Obra de Campo</p>
          </div>
        </div>

        {/* DETALHAMENTO DE DESPESAS DE CAMPO */}
        <div className="border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="bg-zinc-800/60 px-4 py-2 border-b border-zinc-800 font-black uppercase text-xs tracking-wider text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
            3. DESPESAS E CUSTOS OPERACIONAIS DE CAMPO
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-xs text-left">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-805 font-black text-zinc-300 print:bg-zinc-50 print:text-black print:border-black">
                <th className="p-2 border-r border-zinc-800 print:border-black">Item de Despesa</th>
                <th className="p-2 border-r border-zinc-800 text-right print:border-black font-semibold">Valor Registrado</th>
                <th className="p-2 text-center">Status / Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 print:divide-black">
              {os.despesa_pedagio > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Pedágio Rodoviário</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_pedagio)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_pedagio ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {os.despesa_combustivel > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Combustível / Abastecimento</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_combustivel)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_combustivel ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {os.despesa_hospedagem > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Hospedagem / Estadia</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_hospedagem)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_hospedagem ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {os.despesa_alimentacao > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Alimentação / Refeição</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_alimentacao)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_alimentacao ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {os.despesa_diaria_tecnica > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Diária Técnica de Campo</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_diaria_tecnica)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_diaria_tecnica ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {os.despesa_guincho > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Serviço de Guincho Extramuros</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_guincho)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_guincho ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {os.despesa_outros > 0 && (
                <tr className="border-b border-zinc-800 print:border-black">
                  <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-300 print:text-black print:border-black">Outras Despesas Incidentes</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono text-zinc-100 print:text-black print:border-black">{formatCurrency(os.despesa_outros)}</td>
                  <td className="p-2 text-center text-[10px] uppercase font-bold text-zinc-400 print:text-black">{comprovantes.despesa_outros ? '✔ Anexado' : 'Não Anexado'}</td>
                </tr>
              )}
              {totalDespesas === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-zinc-500 font-mono uppercase text-[10px] print:text-black">Não foram informadas despesas de viagem adicionais.</td>
                </tr>
              )}
              {totalDespesas > 0 && (
                <tr className="bg-zinc-950 font-black text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
                  <td className="p-2 border-r border-zinc-800 text-right print:border-black">Subtotal de Custos Reembolsáveis</td>
                  <td className="p-2 border-r border-zinc-800 text-right font-mono print:border-black">{formatCurrency(totalDespesas)}</td>
                  <td className="p-2 text-center text-[9px] uppercase">Reembolso com faturamento consolidado</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* MÃO DE OBRA ADICIONAL DE CAMPO (EXTRA) */}
        <div className="border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="bg-zinc-800/60 px-4 py-2 border-b border-zinc-800 font-black uppercase text-xs tracking-wider text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
            4. HORAS ADICIONAIS E EQUIPE TÉCNICA EXTERNA (EQUIPE ADICIONAL)
          </div>
          <div className="p-4 grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">Resumo da Mão de Obra Externa: </p>
              <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded print:bg-zinc-50 print:border-black">
                <p className="text-xs text-zinc-300 print:text-black">Horas Extras: <span className="font-bold text-zinc-100 print:text-black">{os.mao_obra_externa_horas || 0}h</span></p>
                <p className="text-xs text-zinc-300 print:text-black">Valor Cobrado/Hora: <span className="font-bold text-zinc-100 print:text-black">{formatCurrency(os.mao_obra_externa_valor || 0)}</span></p>
                <p className="text-xs pt-1 border-t border-zinc-800 mt-1 font-bold text-zinc-300 print:border-black print:text-black">Total M.O Externa: <span className="text-amber-500 font-black">{formatCurrency(os.mao_obra_externa_total || 0)}</span></p>
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase">Colaboradores da Equipe Relacionados: </p>
              <div className="grid grid-cols-2 gap-2">
                {equipe.length > 0 ? equipe.map((colab: any, i: number) => (
                  <div key={i} className="border border-zinc-800 bg-zinc-900 p-2 rounded text-xs flex justify-between items-center print:bg-white print:border-black">
                    <span className="font-bold uppercase text-zinc-200 truncate print:text-black">{colab.nome || colab.role || colab}</span>
                    <span className="text-[9px] bg-zinc-800 text-zinc-400 rounded px-1 uppercase font-mono print:bg-zinc-200 print:text-black">{colab.funcao || 'Equipe de Apoio'}</span>
                  </div>
                )) : (
                  <p className="col-span-2 text-xs text-zinc-500 italic">Nenhum ajudante ou eletricista extra relacionado.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. PEÇAS E MATERIAIS UTILIZADOS */}
        <div className="border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="bg-zinc-800/60 px-4 py-2 border-b border-zinc-800 font-black uppercase text-xs tracking-wider text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
            5. PEÇAS E MATERIAIS UTILIZADOS NA ORDEM DE SERVIÇO
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-left text-[11px] print:text-[10px]">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800 font-black text-zinc-300 print:bg-zinc-50 print:text-black print:border-black">
                <th className="p-2 border-r border-zinc-800 w-24 print:border-black">Código</th>
                <th className="p-2 border-r border-zinc-800 print:border-black">Peça</th>
                <th className="p-2 border-r border-zinc-800 text-center w-16 print:border-black">Quantidade</th>
                <th className="p-2 border-r border-zinc-800 text-right w-24 print:border-black">Valor Unitário</th>
                <th className="p-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 print:divide-black text-zinc-300 print:text-black">
              {os.pecas_aplicadas && os.pecas_aplicadas.length > 0 ? (
                os.pecas_aplicadas.map((p: any) => (
                  <tr key={p.id} className="border-b border-zinc-800 print:border-black">
                    <td className="p-2 border-r border-zinc-800 font-bold uppercase print:border-black">{p.peca?.codigo || '—'}</td>
                    <td className="p-2 border-r border-zinc-800 uppercase truncate max-w-[300px] print:border-black">{p.peca?.descricao || '—'}</td>
                    <td className="p-2 border-r border-zinc-800 text-center print:border-black">{p.quantidade?.toString() || '0'}</td>
                    <td className="p-2 border-r border-zinc-800 text-right font-mono print:border-black">{formatCurrency(p.valor_unit)}</td>
                    <td className="p-2 text-right font-bold font-mono text-zinc-100 print:text-black">{formatCurrency(p.valor_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center italic text-zinc-500 uppercase print:text-black">Nenhuma peça ou material aplicado registrado.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-950 font-black text-amber-500 border-t border-zinc-800 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
              <tr>
                <td colSpan={4} className="p-2 text-right border-r border-zinc-800 uppercase print:border-black">SUBTOTAL PEÇAS:</td>
                <td className="p-2 text-right font-mono">{formatCurrency(subtotalPecas)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* 6. MÃO DE OBRA / SERVIÇOS EXECUTADOS */}
        <div className="border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="bg-zinc-800/60 px-4 py-2 border-b border-zinc-800 font-black uppercase text-xs tracking-wider text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
            6. MÃO DE OBRA / SERVIÇOS EXECUTADOS
          </div>
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="min-w-full text-left text-[11px] print:text-[10px]">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800 font-black text-zinc-300 print:bg-zinc-50 print:text-black print:border-black">
                <th className="p-2 border-r border-zinc-800 print:border-black">Serviço</th>
                <th className="p-2 border-r border-zinc-800 text-center w-20 print:border-black">Horas</th>
                <th className="p-2 border-r border-zinc-800 text-right w-24 print:border-black">Valor p/ Hora</th>
                <th className="p-2 text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 print:divide-black text-zinc-300 print:text-black">
              {os.servicos && os.servicos.length > 0 ? (
                os.servicos.map((s: any) => (
                  <tr key={s.id} className="border-b border-zinc-800 print:border-black">
                    <td className="p-2 border-r border-zinc-800 uppercase font-bold truncate max-w-[350px] print:border-black">{s.descricao}</td>
                    <td className="p-2 border-r border-zinc-800 text-center print:border-black">{s.horas || 1}h</td>
                    <td className="p-2 border-r border-zinc-800 text-right font-mono print:border-black">{formatCurrency(s.valor_hora)}</td>
                    <td className="p-2 text-right font-bold font-mono text-zinc-100 print:text-black">{formatCurrency(s.valor_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center italic text-zinc-500 uppercase print:text-black">Nenhum serviço registrado para esta OS.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-950 font-black text-amber-500 border-t border-zinc-800 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
              <tr>
                <td colSpan={3} className="p-2 text-right border-r border-zinc-800 uppercase print:border-black">SUBTOTAL SERVIÇOS:</td>
                <td className="p-2 text-right font-mono">{formatCurrency(subtotalServicos)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* LINHA DO TEMPO DA VIAGEM */}
        {timeline.length > 0 && (
          <div className="border border-zinc-800 mb-4 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
            <div className="bg-zinc-800/60 px-4 py-2 border-b border-zinc-800 font-black uppercase text-xs tracking-wider text-amber-500 print:bg-zinc-100 print:text-black print:border-black print-bg-zinc-100">
              7. REGISTRO TÉCNICO DE VIAGEM E PARADAS (TIMELINE)
            </div>
            <div className="p-4 space-y-3">
              {timeline.map((point: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start text-xs relative text-zinc-300 print:text-black">
                  <div className="flex flex-col items-center">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] text-black flex items-center justify-center font-black print:bg-black print:text-white">
                      {idx + 1}
                    </span>
                    {idx < timeline.length - 1 && <div className="w-0.5 h-8 bg-zinc-800 print:bg-black"></div>}
                  </div>
                  <div className="flex-1 bg-zinc-900 p-2.5 rounded border border-zinc-800 print:bg-zinc-50 print:border-black print:text-black">
                    <div className="flex justify-between font-black uppercase">
                      <span className="text-zinc-200 print:text-black">{point.status || 'PARADA REGISTRADA'}</span>
                      <span className="text-zinc-500 font-mono print:text-black">
                        {point.timestamp ? new Date(point.timestamp).toLocaleDateString('pt-BR') : ''} {point.timestamp ? new Date(point.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </div>
                    <p className="text-zinc-400 mt-1 print:text-black">{point.descricao || 'Nenhuma observação técnica anotada.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSOLIDAÇÃO DOS VALORES DA VIAGEM */}
        <div className="border border-zinc-800 mb-8 rounded-2xl overflow-hidden bg-zinc-950/40 print:rounded-none print:border-black print:bg-white print-bg-white">
          <div className="bg-zinc-950 px-4 py-2 font-black uppercase text-xs tracking-wider flex justify-between text-amber-500 print:bg-black print:text-white print:border-black">
            <span>RESUMO TÉCNICO E CONSOLIDADO MONETÁRIO DE ATENDIMENTO DE CAMPO</span>
            <span>OS #{os.numero || os.id.slice(0,6).toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-5 p-4 text-right divide-x divide-zinc-800 text-zinc-300 print:text-black print:divide-black">
            <div className="pr-2">
              <p className="text-[9px] text-zinc-500 uppercase">Peças + Mat.</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(subtotalPecas)}</p>
            </div>
            <div className="px-2">
              <p className="text-[9px] text-zinc-500 uppercase">Serviços / M.O</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(subtotalServicos)}</p>
            </div>
            <div className="px-2">
              <p className="text-[9px] text-zinc-500 uppercase">Logística / KM</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(totalDeslocamento)}</p>
            </div>
            <div className="px-2">
              <p className="text-[9px] text-zinc-500 uppercase">Outras Despesas</p>
              <p className="text-xs font-black mt-1 font-mono text-zinc-100 print:text-black">{formatCurrency(totalDespesasReembolso + totalMaoObraExterna)}</p>
            </div>
            <div className="pl-2">
              <p className="text-[10px] text-amber-500 font-extrabold uppercase print:text-black">TOTAL GERAL DA OS</p>
              <p className="text-base font-black text-amber-500 mt-1 font-mono print:text-black">
                {formatCurrency(totalGeralOS)}
              </p>
            </div>
          </div>
        </div>

        {/* PARTE DE ASSINATURAS E QR CODE */}
        <div className="grid grid-cols-4 gap-8 pt-8">
          <div className="col-span-1 flex flex-col items-center justify-center p-2 border border-zinc-800 rounded bg-zinc-950/40 text-center print:bg-white print:border-black">
            {/* QR CODE Verificador */}
            <p className="text-[8px] font-mono text-zinc-500 uppercase font-bold mb-1">Validação Digital</p>
            <svg className="w-20 h-20 filter invert brightness-200 print:filter-none" viewBox="0 0 100 100" fill="black">
              {/* Desenhando um QR-Code esquemático com caminhos pretos */}
              <rect x="5" y="5" width="25" height="25" fill="none" stroke="black" strokeWidth="4" />
              <rect x="12" y="12" width="11" height="11" fill="black" />
              <rect x="70" y="5" width="25" height="25" fill="none" stroke="black" strokeWidth="4" />
              <rect x="77" y="12" width="11" height="11" fill="black" />
              <rect x="5" y="70" width="25" height="25" fill="none" stroke="black" strokeWidth="4" />
              <rect x="12" y="77" width="11" height="11" fill="black" />
              <path d="M 40 10 H 45 V 40 H 40 Z M 50 15 H 55 V 30 H 50 Z M 45 45 H 65 V 50 H 45 Z" />
              <path d="M 75 40 H 90 V 45 H 75 Z M 80 50 H 95 V 55 H 80 Z M 70 60 H 85 V 65 H 70 Z" />
              <path d="M 35 75 H 55 V 80 H 35 Z M 40 85 H 60 V 90 H 40 Z M 50 70 H 65 V 75 H 50 Z" />
              <path d="M 40 50 H 45 V 60 H 40 Z M 55 55 H 60 V 65 H 55 Z" />
            </svg>
            <p className="text-[8px] text-zinc-500 font-mono mt-2 uppercase tracking-tighter print:text-black">PinheiroSeg ID: #{os.id.slice(0, 8)}</p>
          </div>

          <div className="col-span-3 grid grid-cols-2 gap-8 text-center text-zinc-300 print:text-black">
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
        </div>

        {/* REGRAS E NOTAS DE RODAPÉ */}
        <div className="mt-12 pt-4 border-t border-zinc-850 text-center text-[8px] text-zinc-500 leading-tight print:border-black">
          A responsabilidade técnico-metrológica de quilometragem e tempo de parada declarados competem sob os critérios contratuais de atendimento extramuros.
          <br />
          Registo de Viagem auditado electronicamente sob QR Code e Certificação Pinheiro Mecânica Diesel.
        </div>

      </div>
    </div>
  );
}

export default function ViagemPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        Carregando...
      </div>
    }>
      <ViagemPrintContent />
    </Suspense>
  );
}
