'use client';

import { useEffect, useState } from 'react';
import { 
  Building2, Users, Activity, DollarSign, ShieldAlert, 
  Terminal, Search, Loader2, Ban, CheckCircle2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function MasterAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/master-admin');
      const json = await res.json();

      if (res.ok) {
        setData(json);
      } else {
        setErrorMsg(json.error || 'Acesso negado ou erro no servidor.');
        if (res.status === 403) {
          toast.error('Acesso restrito ao dono do SaaS.');
          setTimeout(() => window.location.href = '/dashboard', 2000);
        }
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão com a API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = async (empresa_id: string, payload: { status?: string, plano?: string }) => {
    setUpdatingId(empresa_id);
    try {
      const res = await fetch('/api/master-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id, ...payload })
      });

      if (res.ok) {
        toast.success(payload.plano ? 'Plano atualizado!' : 'Status atualizado!');
        await loadData(); // Recarrega os dados
      } else {
        toast.error('Erro ao atualizar empresa.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-orange-500 mb-4" />
        <h1 className="text-2xl font-black text-white uppercase mb-2">Falha no Painel Master</h1>
        <p className="text-orange-400 font-mono text-sm max-w-md bg-orange-950/30 p-4 rounded-xl border border-orange-900/50">
          {errorMsg || 'Dados não carregados'}
        </p>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="mt-6 px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition"
        >
          Voltar para o Dashboard
        </button>
      </div>
    );
  }

  const filteredEmpresas = data.empresas.filter((emp: any) => 
    emp.nome.toLowerCase().includes(search.toLowerCase()) || 
    (emp.cnpj && emp.cnpj.includes(search))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-4 sm:p-8 space-y-8 font-sans">
      
      {/* HEADER GOD MODE - LARANJA */}
      <div className="flex items-center justify-between border-b border-orange-900/30 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
            <ShieldAlert className="w-8 h-8 text-orange-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">
              VEHLOX <span className="text-orange-500">Control Center</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Acesso Master Irrestrito</p>
          </div>
        </div>
        <button onClick={loadData} className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition" title="Recarregar Dados">
          <RefreshCw size={20} />
        </button>
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
          <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/20">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Gestão de Oficinas</h2>
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar oficina..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/50 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                <tr>
                  <th className="p-4">Oficina</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredEmpresas.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-bold text-white uppercase">{emp.nome}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{emp.cnpj || 'Sem CNPJ'} • {emp._count.User} usuários</p>
                    </td>
                    
                    <td className="p-4">
                      {updatingId === emp.id ? (
                        <div className="flex items-center gap-2 text-orange-500 text-xs font-bold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                        </div>
                      ) : (
                        <select
                          value={emp.plano || 'TRIAL'}
                          onChange={(e) => handleUpdate(emp.id, { plano: e.target.value })}
                          className="bg-zinc-800 text-white border border-zinc-600 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-orange-500 cursor-pointer w-full max-w-[120px]"
                        >
                          <option value="TRIAL" className="bg-zinc-800 text-white">TRIAL</option>
                          <option value="BASICO" className="bg-zinc-800 text-white">BÁSICO</option>
                          <option value="PRO" className="bg-zinc-800 text-orange-400 font-black">PRO</option>
                        </select>
                      )}
                    </td>

                    <td className="p-4 text-center">
                       <span className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase ${emp.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                        {emp.status || 'ATIVO'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        disabled={updatingId === emp.id}
                        onClick={() => handleUpdate(emp.id, { status: emp.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO' })}
                        className={`p-2 rounded-lg transition ${
                          emp.status === 'ATIVO' 
                          ? 'text-red-500 hover:bg-red-500/10' // Mantido vermelho (Ação Destrutiva)
                          : 'text-emerald-500 hover:bg-emerald-500/10' // Verde para restaurar
                        }`}
                        title={emp.status === 'ATIVO' ? 'Bloquear Empresa' : 'Desbloquear Empresa'}
                      >
                        {emp.status === 'ATIVO' ? (
                          <Ban size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
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
              <Terminal className="w-4 h-4 text-orange-500" /> Logs Recentes
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
