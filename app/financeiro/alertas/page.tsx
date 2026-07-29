'use client';

import { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Clock, 
  Bell, 
  CheckCircle2, 
  User, 
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AlertaResponse {
  atrasadas: any[];
  aVencer: any[];
  resumo: {
    totalAtrasadas: number;
    totalAVencer: number;
    countAtrasadas: number;
    countAVencer: number;
  };
}

export default function AlertasFinanceirosPage() {
  const [data, setData] = useState<AlertaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchAlertas = async (verify = false) => {
    try {
      if (verify) setIsVerifying(true);
      const res = await fetch(`/api/financeiro/alertas${verify ? '?verify=true' : ''}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (verify) toast.success('Verificação concluída!');
      } else {
        throw new Error(json.error);
      }
    } catch (err) {
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlertas();
  }, []);

  async function handleDarBaixa(id: string) {
    if (!confirm('Confirmar o recebimento/pagamento desta conta?')) return;
    try {
      const res = await fetch(`/api/financeiro/${id}/pagar`, { 
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Baixa realizada com sucesso!');
        fetchAlertas();
      } else {
        toast.error('Erro ao dar baixa');
      }
    } catch (err) {
      toast.error('Erro na requisição');
    }
  }

  const calcularDiasAtraso = (dataVencimento: string) => {
    const venc = new Date(dataVencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diff = hoje.getTime() - venc.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sincronizando Sistema...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <Bell size={32} className="text-orange-500" />
            Alertas Financeiros
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 ml-1">
            Monitoramento de Fluxo e Inadimplência
          </p>
        </div>
        <button 
          onClick={() => fetchAlertas(true)}
          disabled={isVerifying}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isVerifying ? 'animate-spin' : ''} />
          Sincronizar Vencimentos
        </button>
      </div>

      {/* Resumo de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <AlertCircle size={100} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={18} /></span>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Total em Atraso</span>
            </div>
            <div className="text-4xl font-black text-white italic tracking-tighter">
              {data?.resumo.totalAtrasadas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="mt-2 text-[10px] font-black text-zinc-600 uppercase">
              {data?.resumo.countAtrasadas} Contas com Vencimento Excedido
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <Clock size={100} className="text-amber-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><TrendingUp size={18} /></span>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Próximos 3 Dias</span>
            </div>
            <div className="text-4xl font-black text-white italic tracking-tighter">
              {data?.resumo.totalAVencer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="mt-2 text-[10px] font-black text-zinc-600 uppercase">
              {data?.resumo.countAVencer} Contas a Vencer em Breve
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-6">
        <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
          <Calendar size={14} /> Detalhamento de Pendências
        </h2>

        {(!data?.atrasadas.length && !data?.aVencer.length) ? (
          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-[2rem] p-20 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-emerald-500 mb-4 opacity-50" />
            <p className="text-sm font-black text-white uppercase italic tracking-widest">Nenhuma Pendência Grave</p>
            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">O fluxo financeiro está em dia.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800">
                    <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Status</th>
                    <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Descrição</th>
                    <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Vencimento</th>
                    <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Valor</th>
                    <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Relacionado</th>
                    <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {/* ATRASADAS PRIMEIRO */}
                  {data?.atrasadas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest">
                          <AlertCircle size={10} /> {calcularDiasAtraso(conta.data_vencimento)} dias atrás
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white uppercase italic tracking-tight">{conta.descricao}</span>
                          <span className="text-[10px] text-zinc-600 font-bold uppercase">{conta.categoria || 'Geral'}</span>
                        </div>
                      </td>
                      <td className="p-6 text-[10px] font-black text-zinc-400 font-mono italic">
                        {new Date(conta.data_vencimento).toLocaleDateString()}
                      </td>
                      <td className="p-6 text-sm font-black text-white font-mono italic">
                        {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                          {conta.cliente && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase">
                              <User size={10} /> {conta.cliente.nome}
                            </div>
                          )}
                          {conta.os && (
                            <Link href={`/os/${conta.os_id}`} className="flex items-center gap-1 text-[10px] font-black text-orange-500 hover:underline uppercase">
                              <FileText size={10} /> OS #{conta.os.numero}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-orange-500 transition-colors"
                            title="Notificar Responsável"
                          >
                            <Send size={16} />
                          </button>
                          <button 
                            onClick={() => handleDarBaixa(conta.id)}
                            className="bg-zinc-950 border border-zinc-800 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white text-zinc-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Dar Baixa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* A VENCER DEPOIS */}
                  {data?.aVencer.map((conta) => (
                    <tr key={conta.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
                          <Clock size={10} /> Em Breve
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white uppercase italic tracking-tight">{conta.descricao}</span>
                          <span className="text-[10px] text-zinc-600 font-bold uppercase">{conta.categoria || 'Geral'}</span>
                        </div>
                      </td>
                      <td className="p-6 text-[10px] font-black text-zinc-400 font-mono italic">
                        {new Date(conta.data_vencimento).toLocaleDateString()}
                      </td>
                      <td className="p-6 text-sm font-black text-white font-mono italic">
                        {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                          {conta.cliente && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase">
                              <User size={10} /> {conta.cliente.nome}
                            </div>
                          )}
                          {conta.os && (
                            <Link href={`/os/${conta.os_id}`} className="flex items-center gap-1 text-[10px] font-black text-orange-500 hover:underline uppercase">
                              <FileText size={10} /> OS #{conta.os.numero}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDarBaixa(conta.id)}
                            className="bg-zinc-950 border border-zinc-800 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white text-zinc-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Dar Baixa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Rodapé Informativo */}
      <div className="bg-zinc-900/50 border border-zinc-800 border-dashed p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-center md:text-left">
          * A verificação automática varre pendências uma vez por dia ou ao sincronizar manualmente.
        </p>
        <Link href="/financeiro" className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-1 transition-transform">
          Ir para Módulo Financeiro <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
