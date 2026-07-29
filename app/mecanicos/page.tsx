'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Wrench, Edit, Trash2, Key, Search, UserCheck, ShieldCheck, Briefcase, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

// Componente de Linha Memoizado
const UserRow = memo(({ 
  u, 
  roleConfigs,
  onEdit,
  onResetPassword,
  onDelete
}: { 
  u: any, 
  roleConfigs: any,
  onEdit: (u: any) => void,
  onResetPassword: (id: string) => void,
  onDelete: (id: string) => void
}) => {
  const config = roleConfigs[u.role] || roleConfigs.MECANICO;
  const Icon = config.icon;
  
  return (
    <tr className="hover:bg-zinc-800/10 transition-all border-l-4 border-l-transparent hover:border-l-orange-600">
      <td className="p-6 min-w-0">
        <p className="text-sm font-black text-white uppercase tracking-tight truncate">{u.name}</p>
        <p className="text-[10px] text-zinc-600 font-mono font-black uppercase tracking-widest mt-1 truncate">{u.email}</p>
      </td>
      <td className="p-6">
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border italic ${config.color}`}>
          <Icon className="w-3.5 h-3.5" /> {config.label}
        </span>
      </td>
      <td className="p-6 text-[10px] font-bold text-zinc-500 uppercase italic">
        {u.especialidade || 'Geral'}
      </td>
      <td className="p-6">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onEdit(u)} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 hover:text-white transition shadow-lg"><Edit className="w-4 h-4" /></button>
          <button onClick={() => onResetPassword(u.id)} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 hover:text-orange-600 transition shadow-lg"><Key className="w-4 h-4" /></button>
          <button onClick={() => onDelete(u.id)} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 hover:text-red-500 transition shadow-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
});

UserRow.displayName = 'UserRow';

export default function MecanicosPage() {
  const [data, setData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const roleConfigs = useMemo(() => ({
    ADMIN: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: ShieldCheck, label: 'Adm' },
    LIDER: { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: UserCheck, label: 'Líder' },
    MECANICO: { color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: Wrench, label: 'Mecânico' },
    ESTOQUISTA: { color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: Package, label: 'Estoque' },
    FINANCEIRO: { color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Briefcase, label: 'Financeiro' },
  }), []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiFetch(`/api/usuarios?page=${page}&limit=10&q=${searchTerm}`);
      const items = Array.isArray(result) ? result : (result.items || []);
      const total = result.total || items.length;
      const totalPages = result.totalPages || 1;
      setData({ items, total, totalPages });
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Erro ao listar equipe' });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleResetPassword = async (id: string) => {
    if (!confirm('Deseja resetar a senha deste colaborador?')) return;
    try {
      const result = await apiFetch<{ tempPassword: string }>(`/api/usuarios/${id}/reset-password`, { method: 'POST' });
      toast.success(`Senha resetada! Nova senha: ${result.tempPassword}`, { duration: 10000 });
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Erro ao resetar senha' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este colaborador permanentemente?')) return;
    try {
      await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      toast.success('Colaborador excluído');
      fetchUsers();
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Erro ao excluir' });
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-orange-600 rounded-full" />
             <h1 className="text-3xl font-black text-white uppercase tracking-tight">EQUIPE TÉCNICA</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] leading-none ml-5">GESTÃO DE COLABORADORES E ESPECIALISTAS</p>
        </div>

        <Link href="/configuracoes">
          <button className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center gap-2 active:scale-95">
            <Plus className="w-4 h-4" />
            NOVO COLABORADOR
          </button>
        </Link>
      </div>

      {/* FILTROS */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOME, EMAIL OU ESPECIALIDADE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:border-orange-600 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase tracking-widest italic">
                <th className="p-6">Colaborador</th>
                <th className="p-6">Função</th>
                <th className="p-6">Especialidade</th>
                <th className="p-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr><td colSpan={4} className="p-10 text-center animate-pulse uppercase text-[10px] font-black text-zinc-700">Sincronizando Banco de Dados...</td></tr>
              ) : data.items.length > 0 ? (
                data.items.map((u) => (
                  <UserRow 
                    key={u.id} 
                    u={u} 
                    roleConfigs={roleConfigs} 
                    onEdit={() => toast.info('Edite nas configurações')}
                    onResetPassword={handleResetPassword}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <tr><td colSpan={4} className="p-20 text-center uppercase text-[10px] font-black text-zinc-700 italic tracking-widest">Nenhum colaborador encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-zinc-800">
           <Pagination 
             page={page} 
             totalPages={data.totalPages} 
             onPageChange={setPage} 
           />
        </div>
      </div>
    </div>
  );
}
