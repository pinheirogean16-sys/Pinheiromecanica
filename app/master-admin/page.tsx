'use client';

import { useEffect, useState } from 'react';
import { 
  Building2, Users, Activity, DollarSign, ShieldAlert, 
  Terminal, Ban, CheckCircle, Search, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function MasterAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/master-admin');
        if (res.ok) {
          setData(await res.json());
        } else if (res.status === 403) {
          toast.error('Área restrita para o dono do SaaS.');
          window.location.href = '/dashboard'; // Chuta o intruso
        }
      } catch {
        toast.error('Erro ao carregar dados do Master.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const filteredEmpresas = data.empresas.filter((emp: any) => 
    emp.nome.toLowerCase().includes(search.toLowerCase()) || 
    (emp.cnpj && emp.cnpj.includes(search))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-4 sm:p-8 space-y-8 font-sans">
      
      {/* HEADER GOD MODE */}
      <div className="flex items-center justify-between border-b border-red-900/30 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">VEHLOX <span className="text-red-500">Control Center</span></h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Acesso Master Irrestrito</p>
          </div>
        </div>
      </div>

      {/* KPIs GLOBAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden">
          <Building2 className="absolute right-4 top-4 w-10 h-10 text-zinc-800" />
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total de Inquilinos</p>
          <p className="text-4xl font-black text-white">{data.stats.totalEmpresas}</p>
        </div>
        
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden">
          <Users className="absolute right-4 top-4 w-10 h-10 text-zinc-800" />
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Usuários Globais</p>
          <p className="text-4xl font-black text-white">{data.stats.totalUsuarios}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden">
          <Activity className="absolute right-4 top-4 w-10 h-10 text-zinc-800" />
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">OS Criadas (Total)</p>
          <p className="text-4xl font-black text-white">{data.stats.totalOS}</p>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-900/30 p-6 rounded-3xl relative overflow-hidden">
          <DollarSign className="absolute right-4 top-4 w-10 h-10 text-emerald-900" />
          <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-1">MRR Estimado (Mensal)</p>
          <p className="text-4xl font-black text-emerald-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.mrr)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABELA DE INQUILINOS */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Gestão de Oficinas</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar oficina..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-red-500/50"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/50 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                <tr>
                  <th className="p-4">Oficina</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4 text-center">Usuários</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredEmpresas.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-bold text-white uppercase">{emp.nome}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{emp.cnpj || 'Sem CNPJ'} • Desde {new Date(emp.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase ${emp.plano === 'PRO' ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {emp.plano}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-zinc-400">
                      {emp._count.User}
                    </td>
                    <td className="p-4 text-center">
                       <span className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase ${emp.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {/* Aqui entrarão as ações de bloquear, mudar plano e impersonar */}
                      <button className="p-2 text-zinc-500 hover:text-white transition" title="Gerenciar">
                        <Terminal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOGS DO SISTEMA */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/20">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-500" /> Logs Recentes
            </h2>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto max-h-[500px]">
            {data.logsRecentes.map((log: any) => (
              <div key={log.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 text-[10px] font-mono">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-orange-500 font-bold">{log.modulo}</span>
                  <span className="text-zinc-600">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                </div>
                <p className="text-zinc-300 font-bold">{log.acao} em {log.entidade}</p>
                <p className="text-zinc-500 mt-1 truncate">Por: {log.usuario}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
