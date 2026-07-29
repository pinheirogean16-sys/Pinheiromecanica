'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Truck, Terminal, 
  User as UserIcon, Loader2, Building, UserCheck, AlertCircle, 
  Eye, Car, MoreHorizontal, Filter, ChevronRight, X, Save, Building2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';

interface Cliente {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  tipo_pessoa: string | null;
  cpf_cnpj: string;
  telefone: string;
  email: string | null;
  status: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  perfil: 'CLIENTE' | 'FORNECEDOR' | 'AMBOS';
  created_at: string;
  ordens: { numero: number; valor_total: number; created_at: string }[];
  _count: { veiculos: number; ordens: number };
}

// Componente de Linha Memoizado
const FornecedorRow = memo(({ 
  fornecedor, 
  maskCPF_CNPJ, 
  maskPhone, 
  openEditModal, 
  handleDelete 
}: { 
  fornecedor: Cliente, 
  maskCPF_CNPJ: any, 
  maskPhone: any, 
  openEditModal: any, 
  handleDelete: any 
}) => {
  return (
    <tr className="border-zinc-800 hover:bg-zinc-900/50 transition-all group">
      <td className="p-4 text-sm">
        <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center text-orange-600 font-black italic text-[9px]">
          {fornecedor.tipo_pessoa === 'FISICA' ? 'PF' : 'PJ'}
        </div>
      </td>
      <td className="p-4 text-sm">
        <p className="font-black text-white uppercase group-hover:text-orange-500 transition-colors tracking-tight italic truncate max-w-[200px]">{fornecedor.nome}</p>
        <p className="text-[10px] text-zinc-600 font-medium truncate max-w-[200px]">{fornecedor.razao_social || '—'}</p>
      </td>
      <td className="p-4 text-sm font-mono text-zinc-500 font-bold uppercase tracking-widest">
        {maskCPF_CNPJ(fornecedor.cpf_cnpj, fornecedor.tipo)}
      </td>
      <td className="p-4 text-sm">
        <p className="font-black text-zinc-400 font-mono flex items-center gap-2">
           <Phone size={10} className="text-orange-600" /> {maskPhone(fornecedor.telefone)}
        </p>
        <p className="text-[10px] text-zinc-600 truncate max-w-[150px]">{fornecedor.email || '—'}</p>
      </td>
      <td className="p-4 text-sm text-center">
        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic ${
          fornecedor.status === 'ATIVO' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {fornecedor.status || 'ATIVO'}
        </span>
      </td>
      <td className="p-4 text-sm text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => openEditModal(fornecedor)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition shadow-lg"
          >
            <Edit size={14} />
          </button>
          <button 
            onClick={() => handleDelete(fornecedor.id, fornecedor.nome)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition shadow-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

FornecedorRow.displayName = 'FornecedorRow';

export default function FornecedoresPage() {
  const [data, setData] = useState<{ items: Cliente[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PF' | 'PJ'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ATIVO' | 'INATIVO'>('ALL');
  const [page, setPage] = useState(1);

  // Debounce search effect
  useEffect(() => {
    const hand = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(hand);
  }, [search]);

  // Reset page
  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterStatus]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Cliente | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'PJ' as 'PF' | 'PJ',
    tipo_pessoa: 'JURIDICA',
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    contato: '',
    email: '',
    status: 'ATIVO',
    perfil: 'FORNECEDOR' as 'CLIENTE' | 'FORNECEDOR' | 'AMBOS',
    endereco: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });

  const fetchFornecedores = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (debouncedSearch) params.append('q', debouncedSearch);
      params.append('perfil', 'FORNECEDOR');
      params.append('page', page.toString());
      params.append('limit', '10');
      
      const res = await fetch(`/api/clientes?${params.toString()}`, { credentials: 'include', signal });
      if (res.ok) {
        const result = await res.json();
        const items = Array.isArray(result) ? result : (result.items || []);
        const total = result.total || items.length;
        const totalPages = result.totalPages || 1;
        setData({ items, total, totalPages });
      } else {
        setError(true);
        setData({ items: [], total: 0, totalPages: 0 });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setError(true);
        setData({ items: [], total: 0, totalPages: 0 });
        toast.error('Ocorreu uma falha ao sincronizar o banco de dados.');
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, debouncedSearch, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFornecedores(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchFornecedores]);

  // Mask functions
  const maskPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 5) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else {
      v = v.replace(/^(\d*)/, "($1");
    }
    return v;
  };

  const maskCPF_CNPJ = (v: string, tipo: 'PF' | 'PJ') => {
    v = v.replace(/\D/g, "");
    if (tipo === 'PF') {
      if (v.length > 11) v = v.substring(0, 11);
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
      if (v.length > 14) v = v.substring(0, 14);
      return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
  };

  const openNewModal = () => {
    setEditingFornecedor(null);
    setFormData({ 
      tipo: 'PJ', 
      tipo_pessoa: 'JURIDICA',
      nome: '', 
      razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '', 
      inscricao_estadual: '',
      telefone: '', 
      contato: '',
      email: '', 
      status: 'ATIVO',
      perfil: 'FORNECEDOR',
      endereco: '',
      cidade: '',
      uf: '',
      observacoes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (fornecedor: Cliente) => {
    setEditingFornecedor(fornecedor);
    setFormData({
      tipo: fornecedor.tipo,
      tipo_pessoa: fornecedor.tipo_pessoa || (fornecedor.tipo === 'PF' ? 'FISICA' : 'JURIDICA'),
      nome: fornecedor.nome,
      razao_social: (fornecedor as any).razao_social || '',
      nome_fantasia: (fornecedor as any).nome_fantasia || '',
      cpf_cnpj: fornecedor.cpf_cnpj,
      inscricao_estadual: (fornecedor as any).inscricao_estadual || '',
      telefone: fornecedor.telefone,
      contato: (fornecedor as any).contato || '',
      email: fornecedor.email || '',
      status: fornecedor.status || 'ATIVO',
      perfil: (fornecedor as any).perfil || 'FORNECEDOR',
      endereco: (fornecedor as any).endereco || '',
      cidade: (fornecedor as any).cidade || '',
      uf: (fornecedor as any).uf || (fornecedor as any).estado || '',
      observacoes: (fornecedor as any).observacoes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    
    try {
      const url = editingFornecedor ? `/api/clientes/${editingFornecedor.id}` : '/api/clientes';
      const method = editingFornecedor ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, estado: formData.uf }),
        credentials: 'include'
      });
      
      if (res.ok) {
        toast.success(editingFornecedor ? 'Fornecedor atualizado com sucesso!' : 'Novo fornecedor registrado no sistema.');
        setShowModal(false);
        fetchFornecedores();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao processar requisição');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover permanentemente o fornecedor "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Fornecedor removido do registro.');
        fetchFornecedores();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Não foi possível excluir o fornecedor.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com a API');
    }
  };

  const filteredFornecedores = useMemo(() => {
    if (filterType === 'ALL') return data.items;
    return data.items.filter(c => c.tipo === filterType);
  }, [data.items, filterType]);

  const stats = useMemo(() => {
    return {
      total: data.total,
      pf: data.items.filter(c => c.tipo === 'PF').length,
      pj: data.items.filter(c => c.tipo === 'PJ').length,
    };
  }, [data]);

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-orange-600 rounded-full" />
             <h1 className="text-3xl font-black text-white uppercase tracking-tight">CENTRAL DE FORNECEDORES</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] leading-none ml-5">GESTÃO DE PARCEIROS E SUPRIMENTOS</p>
        </div>

        <button 
          onClick={openNewModal}
          className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          REGISTRAR FORNECEDOR
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
            <Building2 size={12} className="text-orange-600" /> Total de Fornecedores
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-white tracking-tight">{stats.total}</p>
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none">Catalogados</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
            <UserCheck size={12} className="text-green-500" /> Parceiros Ativos
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-white tracking-tight">{data.items.filter(f => f.status === 'ATIVO').length}</p>
            <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest leading-none">Em Operação</span>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl shadow-2xl">
         <div className="relative flex-1 group w-full">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
           <input 
             type="text" 
             placeholder="BUSCAR POR NOME, CNPJ OU EMAIL..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pl-16 text-sm text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-800 shadow-inner"
           />
         </div>
         
         <div className="flex p-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl w-full md:w-auto">
           {[
             { id: 'ALL', label: 'ALL' },
             { id: 'PF', label: 'PF' },
             { id: 'PJ', label: 'PJ' }
           ].map((t) => (
             <button
               key={t.id}
               onClick={() => setFilterType(t.id as any)}
               className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                 filterType === t.id 
                   ? 'bg-zinc-800 text-white shadow-lg' 
                   : 'text-zinc-600 hover:text-white'
               }`}
             >
               {t.label}
             </button>
           ))}
         </div>

         <div className="flex p-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl w-full md:w-auto">
           {[
             { id: 'ALL', label: 'TODOS' },
             { id: 'ATIVO', label: 'ATIVO' },
             { id: 'INATIVO', label: 'INATIVO' }
           ].map((s) => (
             <button
               key={s.id}
               onClick={() => setFilterStatus(s.id as any)}
               className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                 filterStatus === s.id 
                   ? s.id === 'ATIVO' ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'
                   : 'text-zinc-600 hover:text-white'
               }`}
             >
               {s.label}
             </button>
           ))}
         </div>
      </div>

      {/* TABELA */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                <th className="p-4 italic">Tipo</th>
                <th className="p-4 italic">Razão Social / Nome</th>
                <th className="p-4 italic">Documento</th>
                <th className="p-4 italic">Contato</th>
                <th className="p-4 italic text-center">Status</th>
                <th className="p-4 italic text-right">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic mt-4">Sincronizando parceiros...</p>
                  </td>
                </tr>
              ) : filteredFornecedores.map((f) => (
                <FornecedorRow 
                  key={f.id} 
                  fornecedor={f} 
                  maskCPF_CNPJ={maskCPF_CNPJ} 
                  maskPhone={maskPhone} 
                  openEditModal={openEditModal} 
                  handleDelete={handleDelete} 
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
          <Pagination 
            page={page} 
            totalPages={data.totalPages || 0} 
            onPageChange={setPage} 
          />
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/95 backdrop-blur-sm" 
          />
          <div className="relative w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 lg:p-12 shadow-2xl overflow-hidden shadow-orange-950/20 backdrop-blur-md">
            <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                   <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                     {editingFornecedor ? <Edit className="text-orange-600" /> : <Plus className="text-orange-600" />}
                     {editingFornecedor ? 'Atualizar Fornecedor' : 'Novo Fornecedor'}
                   </h2>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Registro de parceiros de suprimentos</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 max-h-[70vh] overflow-y-auto px-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: 'PF', tipo_pessoa: 'FISICA' })}
                      className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        formData.tipo === 'PF' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-black tracking-widest italic">PF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: 'PJ', tipo_pessoa: 'JURIDICA' })}
                      className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        formData.tipo === 'PJ' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-black tracking-widest italic">PJ</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'ATIVO' })}
                      className={`py-3 rounded-xl transition-all ${formData.status === 'ATIVO' ? 'bg-green-600/20 text-green-500 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      <span className="text-[10px] font-black tracking-widest italic">ATIVO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'INATIVO' })}
                      className={`py-3 rounded-xl transition-all ${formData.status === 'INATIVO' ? 'bg-red-600/20 text-red-500 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      <span className="text-[10px] font-black tracking-widest italic">INATIVO</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">Perfil</label>
                    <select 
                      value={formData.perfil}
                      onChange={(e) => setFormData({...formData, perfil: e.target.value as any})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 transition shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="FORNECEDOR">FORNECEDOR</option>
                      <option value="CLIENTE">CLIENTE</option>
                      <option value="AMBOS">AMBOS</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">Razão Social / Nome</label>
                    <input 
                       type="text" required
                       value={formData.nome}
                       onChange={(e) => setFormData({...formData, nome: e.target.value})}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white outline-none focus:border-orange-500 font-black uppercase transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">CPF / CNPJ</label>
                      <input 
                        type="text" required
                        value={formData.cpf_cnpj}
                        onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">Insc. Estadual</label>
                      <input 
                        type="text"
                        value={formData.inscricao_estadual}
                        onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">Telefone</label>
                      <input 
                        type="text" required
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">E-mail</label>
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Endereço</label>
                     <input 
                        type="text" 
                        value={formData.endereco}
                        onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner"
                        placeholder="RUA, NÚMERO, BAIRRO"
                     />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Cidade</label>
                        <input 
                           type="text" 
                           value={formData.cidade}
                           onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner"
                           placeholder="CIDADE"
                        />
                     </div>
                     <div className="col-span-1 space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Estado</label>
                        <input 
                           type="text" 
                           value={formData.uf}
                           maxLength={2}
                           onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition text-center shadow-inner font-mono"
                           placeholder="UF"
                        />
                     </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3"
                >
                  {modalLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={18} />}
                  {editingFornecedor ? 'EFETIVAR ATUALIZAÇÃO' : 'CONFIRMAR REGISTRO'}
                </button>
              </form>
          </div>
        </div>
      )}
    </div>
  );
}
