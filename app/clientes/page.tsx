'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit, Phone, Truck, Terminal, 
  User as UserIcon, Loader2, Building, UserCheck, AlertCircle, 
  Eye, Car, X, Save, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

// ============================================================
// HELPERS DE FORMATAÇÃO (fora do componente — evita recriação)
// ============================================================
const maskPhone = (v: string) => {
  v = v.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 5) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else {
    v = v.replace(/^(\d*)/, '($1');
  }
  return v;
};

const maskCPF_CNPJ = (v: string, tipo: 'PF' | 'PJ') => {
  v = v.replace(/\D/g, '');
  if (tipo === 'PF') {
    if (v.length > 11) v = v.substring(0, 11);
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    if (v.length > 14) v = v.substring(0, 14);
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return 'N/A';
  }
};

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
  contatado_em?: string;
  perfil: 'CLIENTE' | 'FORNECEDOR' | 'AMBOS';
  created_at: string;
  ordens: { numero: number; valor_total: number; created_at: string }[];
  _count: { veiculos: number; ordens: number };
}

const ClienteRow = memo(({ 
  cliente, 
  openEditModal 
}: { 
  cliente: Cliente, 
  openEditModal: any 
}) => {
  return (
    <tr className="border-zinc-800 hover:bg-zinc-900/50 transition-all group">
      <td className="p-4 text-sm">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-orange-500 font-black italic text-[9px] shadow-lg group-hover:scale-110 transition-transform flex-col leading-none">
              <span className="text-zinc-500 mb-0.5">{cliente.tipo}</span>
              <span>{cliente.tipo_pessoa === 'FISICA' ? 'PF' : 'PJ'}</span>
           </div>
           <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">{cliente.id.slice(-6)}</span>
        </div>
      </td>
      <td className="p-4 text-sm">
        <p className="font-black text-white uppercase group-hover:text-orange-500 transition-colors tracking-tight italic truncate max-w-[200px]">{cliente.nome}</p>
        <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5 truncate">{maskCPF_CNPJ(cliente.cpf_cnpj, cliente.tipo)}</p>
      </td>
      <td className="p-4 text-sm">
         <div className="space-y-1">
            <p className="text-[11px] font-black text-zinc-400 font-mono tracking-tighter flex items-center gap-2">
               <Phone className="w-3 h-3 text-orange-600" /> {maskPhone(cliente.telefone)}
            </p>
            <p className="text-[10px] text-zinc-500 truncate max-w-[150px] font-medium">{cliente.email || '— —'}</p>
         </div>
      </td>
      <td className="p-4 text-sm text-center">
         <span className={`px-3 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest italic ${
           cliente.status === 'ATIVO' 
             ? 'bg-green-500/20 text-green-400' 
             : 'bg-red-500/20 text-red-400'
         }`}>
           {cliente.status || 'ATIVO'}
         </span>
      </td>
      <td className="p-4 text-sm text-center">
         <div className="flex flex-col items-center">
            <span className="text-xl font-black text-white italic tracking-tighter">{cliente._count?.veiculos || 0}</span>
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-1">Unidades</span>
         </div>
      </td>
      <td className="p-4 text-sm text-right font-mono font-bold">
         {cliente.ordens?.[0] ? (
           <div className="space-y-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase italic">OS #{cliente.ordens[0].numero}</p>
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">{formatDate(cliente.ordens[0].created_at)}</p>
           </div>
         ) : (
           <span className="text-[10px] text-zinc-600 font-black italic tracking-widest">NENHUMA</span>
         )}
      </td>
      <td className="p-4 text-sm text-right">
         <div className="flex items-center justify-end gap-2 text-center">
            <Link 
              href={`/clientes/${cliente.id}`}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link 
              href={`/veiculos?cliente_id=${cliente.id}`}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <Car className="w-4 h-4" />
            </Link>
            <button 
              onClick={() => openEditModal(cliente)}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <Edit className="w-4 h-4" />
            </button>
         </div>
      </td>
    </tr>
  );
});

ClienteRow.displayName = 'ClienteRow';

export default function ClientesPage() {
  const [data, setData] = useState<{ items: Cliente[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PF' | 'PJ'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ATIVO' | 'INATIVO'>('ALL');
  const [page, setPage] = useState(1);

  // ============================================================
  // Modais
  // ============================================================
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'PF' as 'PF' | 'PJ',
    tipo_pessoa: 'FISICA',
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    contato: '',
    email: '',
    status: 'ATIVO',
    perfil: 'CLIENTE' as 'CLIENTE' | 'FORNECEDOR' | 'AMBOS',
    endereco: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });

  // ============================================================
  // Abertura do modal (useCallback — evita warning no useEffect)
  // ============================================================
  const openNewModal = useCallback(() => {
    setEditingCliente(null);
    setFormData({ 
      tipo: 'PF', 
      tipo_pessoa: 'FISICA',
      nome: '', 
      razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '', 
      inscricao_estadual: '',
      telefone: '', 
      contato: '',
      email: '', 
      status: 'ATIVO',
      perfil: 'CLIENTE' as 'CLIENTE' | 'FORNECEDOR' | 'AMBOS',
      endereco: '',
      cidade: '',
      uf: '',
      observacoes: ''
    });
    setShowModal(true);
  }, []);

  // Lógica do Tour
  useEffect(() => {
    const handleOpenTourModal = () => openNewModal();
    const handleCloseTourModal = () => setShowModal(false);
    
    window.addEventListener('vehlox:open-client-modal', handleOpenTourModal);
    window.addEventListener('vehlox:close-client-modal', handleCloseTourModal);
    
    return () => {
      window.removeEventListener('vehlox:open-client-modal', handleOpenTourModal);
      window.removeEventListener('vehlox:close-client-modal', handleCloseTourModal);
    };
  }, [openNewModal]);

  // Debounce da busca
  useEffect(() => {
    const hand = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(hand);
  }, [search]);

  useEffect(() => { setPage(1); }, [search, filterType, filterStatus]);

  // ============================================================
  // Fetch paginado
  // ============================================================
  const fetchClientes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterType !== 'ALL') params.append('tipo', filterType);
      if (debouncedSearch) params.append('q', debouncedSearch);
      params.append('perfil', 'CLIENTE');
      params.append('page', page.toString());
      params.append('limit', '20');

      const result = await apiFetch<any>(`/api/clientes?${params.toString()}`, { signal });

      // ✅ Trata array (legado) ou { items } (paginado)
      const items = Array.isArray(result) ? result : (result.items || []);
      const total = typeof result.total === 'number' ? result.total : items.length;
      const totalPages = Math.max(1, result.totalPages || 1);

      setData({ items, total, totalPages });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(true);
        handleApiError(err, { defaultMessage: 'Ocorreu uma falha ao sincronizar o banco de dados.' });
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, debouncedSearch, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchClientes(controller.signal);
    return () => controller.abort();
  }, [fetchClientes]);

  // ============================================================
  // Edição
  // ============================================================
  const openEditModal = useCallback((cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      tipo: cliente.tipo,
      tipo_pessoa: cliente.tipo_pessoa || (cliente.tipo === 'PF' ? 'FISICA' : 'JURIDICA'),
      nome: cliente.nome,
      razao_social: (cliente as any).razao_social || '',
      nome_fantasia: (cliente as any).nome_fantasia || '',
      cpf_cnpj: cliente.cpf_cnpj,
      inscricao_estadual: (cliente as any).inscricao_estadual || '',
      telefone: cliente.telefone,
      contato: (cliente as any).contato || '',
      email: cliente.email || '',
      status: cliente.status || 'ATIVO',
      perfil: (cliente as any).perfil || 'CLIENTE',
      endereco: (cliente as any).endereco || '',
      cidade: (cliente as any).cidade || '',
      uf: (cliente as any).uf || (cliente as any).estado || '',
      observacoes: (cliente as any).observacoes || ''
    });
    setShowModal(true);
  }, []);

  // ✅ Ao trocar PF ↔ PJ, limpa o documento para não confundir
  const handleTipoChange = useCallback((novoTipo: 'PF' | 'PJ') => {
    setFormData((prev) => ({
      ...prev,
      tipo: novoTipo,
      tipo_pessoa: novoTipo === 'PF' ? 'FISICA' : 'JURIDICA',
      cpf_cnpj: '',
    }));
  }, []);

  // ============================================================
  // Submit
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const url = editingCliente ? `/api/clientes/${editingCliente.id}` : '/api/clientes';
      const method = editingCliente ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        body: { ...formData, estado: formData.uf },
      });

      toast.success(editingCliente ? 'Cliente atualizado com sucesso!' : 'Novo cliente registrado no sistema.');
      setShowModal(false);
      fetchClientes();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro de conexão com o servidor' });
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-orange-600 rounded-full" />
             <h1 className="text-3xl font-black text-white uppercase tracking-tight">CENTRAL DE CLIENTES</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none ml-5">REGISTRO E GESTÃO DE ATIVOS COMERCIAIS</p>
        </div>

        <button 
          id="btn-novo-cliente"
          onClick={openNewModal}
          className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-orange-950/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          REGISTRAR CLIENTE
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-orange-500" /> Total de Clientes
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-white tracking-tighter">{data.total}</p>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Registrados</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-green-500" /> Mostrando Nesta Página
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-white tracking-tighter">{data.items.length}</p>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Registros</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" /> Paginação
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-white tracking-tighter">{data.totalPages}</p>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">
              {data.totalPages === 1 ? 'Página' : 'Páginas'}
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl shadow-2xl">
         <div className="relative flex-1 group w-full">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
           <input 
             type="text" 
             placeholder="BUSCAR POR NOME, DOCUMENTO OU EMAIL..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 pl-16 text-xs text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-700 min-h-[44px]"
           />
         </div>
         
         <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-full lg:w-auto">
           {[
             { id: 'ALL', label: 'ALL' },
             { id: 'PF', label: 'PF' },
             { id: 'PJ', label: 'PJ' }
           ].map((t) => (
             <button
               key={t.id}
               type="button"
               onClick={() => setFilterType(t.id as any)}
               className={`flex-1 lg:flex-none px-4 py-3 lg:p-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all min-h-[44px] lg:min-h-0 ${
                 filterType === t.id 
                   ? 'bg-zinc-800 text-white shadow-lg' 
                   : 'text-zinc-600 hover:text-white'
               }`}
             >
               {t.label}
             </button>
           ))}
         </div>

         <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-full lg:w-auto">
           {[
             { id: 'ALL', label: 'TODOS' },
             { id: 'ATIVO', label: 'ATIVO' },
             { id: 'INATIVO', label: 'INATIVO' }
           ].map((s) => (
             <button
               key={s.id}
               type="button"
               onClick={() => setFilterStatus(s.id as any)}
               className={`flex-1 lg:flex-none px-4 py-3 lg:p-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all min-h-[44px] lg:min-h-0 ${
                 filterStatus === s.id 
                   ? s.id === 'ATIVO' ? 'bg-green-600/25 text-green-400 font-black' : 'bg-red-600/25 text-red-400 font-black'
                   : 'text-zinc-600 hover:text-white'
               }`}
             >
               {s.label}
             </button>
           ))}
         </div>
      </div>

      {/* TABELA INDUSTRIAL (DESKTOP) */}
      <div className="hidden lg:block bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                <th className="p-4 italic">Tipo / Ref</th>
                <th className="p-4 italic">Proprietário (CPF/CNPJ)</th>
                <th className="p-4 italic">Canais de Contato</th>
                <th className="p-4 italic text-center">Status</th>
                <th className="p-4 italic text-center">Ativos (VEIC)</th>
                <th className="p-4 italic text-right text-orange-500/50">Última OS</th>
                <th className="p-4 text-right italic">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Sincronizando registros...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-zinc-600 italic font-black uppercase tracking-widest text-[10px]">
                    Falha na Sincronização de Dados
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                   <td colSpan={7} className="p-20 text-center opacity-60">
                     <AlertCircle className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                     <p className="font-black uppercase tracking-widest text-xs italic text-zinc-500">Nenhum cliente catalogado na base</p>
                   </td>
                </tr>
              ) : data.items.map((cliente) => (
                <ClienteRow 
                  key={cliente.id} 
                  cliente={cliente} 
                  openEditModal={openEditModal} 
                />
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
          <Pagination 
            page={page} 
            totalPages={data.totalPages} 
            onPageChange={setPage} 
          />
        </div>
      </div>

      {/* MOBILE CLIENT CARDS */}
      <div className="block lg:hidden space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Sincronizando registros...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800 text-red-500 rounded-2xl italic font-black uppercase tracking-widest text-[10px]">
            Falha na Sincronização de Dados
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3 opacity-60">
            <AlertCircle className="w-10 h-10 mx-auto text-zinc-600" />
            <p className="font-black uppercase tracking-widest text-xs italic text-zinc-500">Nenhum cliente catalogado na base</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.items.map((cliente) => (
                <div key={cliente.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[8px] font-mono font-black text-zinc-500 uppercase tracking-widest leading-none">
                          {cliente.tipo_pessoa === 'FISICA' || cliente.tipo === 'PF' ? 'PF' : 'PJ'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">#{cliente.id.slice(-6)}</span>
                      </div>
                      <h3 className="font-black text-sm text-white uppercase italic tracking-tight break-words mt-1">
                        {cliente.nome}
                      </h3>
                      {cliente.tipo === 'PJ' && cliente.razao_social && (
                        <p className="text-[10px] text-zinc-500 uppercase font-bold truncate tracking-wide mt-0.5">{cliente.razao_social}</p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest italic shrink-0 ${
                      cliente.status === 'ATIVO' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {cliente.status || 'ATIVO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-900/30 pb-2">
                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none">CPF/CNPJ</p>
                      <p className="font-mono text-zinc-300 mt-1">{maskCPF_CNPJ(cliente.cpf_cnpj, cliente.tipo)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none">Telefone</p>
                      <p className="font-mono text-zinc-300 mt-1">{maskPhone(cliente.telefone)}</p>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none">Última OS</p>
                        <p className="text-zinc-300 mt-1 uppercase font-bold italic truncate">
                          {cliente.ordens?.[0] ? `#${cliente.ordens[0].numero}` : 'Nenhuma'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none">Ativos (VEIC)</p>
                        <p className="text-zinc-300 mt-1 uppercase font-bold italic">{cliente._count?.veiculos || 0} {cliente._count?.veiculos === 1 ? 'veículo' : 'veículos'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-zinc-900/30">
                    <Link 
                      href={`/clientes/${cliente.id}`}
                      className="flex items-center justify-center gap-1.5 min-h-[44px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition text-[10px] font-black uppercase tracking-wider text-center"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Dossiê
                    </Link>
                    <button 
                      type="button"
                      onClick={() => openEditModal(cliente)}
                      className="flex items-center justify-center gap-1.5 min-h-[44px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition text-[10px] font-black uppercase tracking-wider text-center cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <Link 
                      href={`/os/nova?cliente_id=${cliente.id}`}
                      className="flex items-center justify-center gap-1.5 min-h-[44px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-950/20 text-center"
                    >
                      Nova OS
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <Pagination 
                page={page} 
                totalPages={data.totalPages} 
                onPageChange={setPage} 
              />
            </div>
          </>
        )}
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
          <div 
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/95 backdrop-blur-sm" 
          />
          
          <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-zinc-900 border-0 sm:border sm:border-zinc-800 rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden shadow-orange-950/20">
            <div className="sticky top-0 bg-zinc-900 z-10 p-6 sm:p-8 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="space-y-1">
                 <h2 className="text-lg sm:text-xl font-black text-white uppercase flex items-center gap-3 italic">
                   {editingCliente ? <Edit className="w-5 h-5 text-orange-600" /> : <Plus className="w-5 h-5 text-orange-600" />}
                   {editingCliente ? 'Atualizar Registro' : 'Inclusão de Ativo'}
                 </h2>
                 <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Módulo de inteligência cadastral</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl">
                    <button 
                      type="button"
                      onClick={() => handleTipoChange('PF')}
                      className={`py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.tipo === 'PF' 
                          ? 'bg-zinc-800 text-white shadow-md' 
                          : 'text-zinc-600 hover:text-white'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest italic">PF</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleTipoChange('PJ')}
                      className={`py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.tipo === 'PJ' 
                          ? 'bg-zinc-800 text-white shadow-md' 
                          : 'text-zinc-600 hover:text-white'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest italic">PJ</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'ATIVO' })}
                      className={`py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.status === 'ATIVO' 
                          ? 'bg-green-600/20 text-green-500 border border-green-600/30' 
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest italic">ATIVO</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'INATIVO' })}
                      className={`py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.status === 'INATIVO' 
                          ? 'bg-red-600/20 text-red-500 border border-red-600/30' 
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest italic">INATIVO</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  
                  <div className="space-y-2 col-span-full md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Perfil do Cadastro <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        value={formData.perfil}
                        onChange={(e) => setFormData({...formData, perfil: e.target.value as any})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner appearance-none cursor-pointer pr-10"
                      >
                        <option value="CLIENTE">CLIENTE</option>
                        <option value="FORNECEDOR">FORNECEDOR</option>
                        <option value="AMBOS">AMBOS (CLIENTE & FORNECEDOR)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2 col-span-full md:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1 flex-wrap">
                      Nome / Razão Social <span className="text-orange-500">*</span>
                    </label>
                    <input 
                       type="text" 
                       id="field-cliente-nome"
                       required
                       value={formData.nome || ''}
                       onChange={(e) => setFormData({...formData, nome: e.target.value})}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold tracking-tight uppercase transition shadow-inner placeholder:text-zinc-700"
                       placeholder="IDENTIFICAÇÃO RECONHECIDA"
                    />
                  </div>

                  {formData.tipo === 'PJ' && (
                    <>
                      <div className="space-y-2 col-span-full md:col-span-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Razão Social Oficial</label>
                        <input 
                           type="text" 
                           value={formData.razao_social || ''}
                           onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner placeholder:text-zinc-700"
                           placeholder="RAZÃO SOCIAL"
                        />
                      </div>
                      <div className="space-y-2 col-span-full md:col-span-1">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Insc. Estadual</label>
                        <input 
                           type="text" 
                           value={formData.inscricao_estadual || ''}
                           onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-mono transition shadow-inner placeholder:text-zinc-700"
                           placeholder="000.000.000"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 col-span-full md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Documento (CPF / CNPJ) <span className="text-orange-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="field-cliente-cpf"
                      required
                      value={formData.cpf_cnpj || ''}
                      onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-mono tracking-widest uppercase transition shadow-inner placeholder:text-zinc-700"
                      placeholder="DOCUMENTO"
                    />
                  </div>
                  <div className="space-y-2 col-span-full md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Contato Ref.</label>
                    <input 
                      type="text" 
                      value={formData.contato || ''}
                      onChange={(e) => setFormData({...formData, contato: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner placeholder:text-zinc-700"
                      placeholder="PESSOA DE CONTATO"
                    />
                  </div>

                  <div className="space-y-2 col-span-full md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Telefone Principal <span className="text-orange-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="field-cliente-telefone"
                      required
                      value={formData.telefone || ''}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-mono transition shadow-inner placeholder:text-zinc-700"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2 col-span-full md:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Endereço de E-mail
                    </label>
                    <input 
                      type="email" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition shadow-inner placeholder:text-zinc-700"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Endereço Completo <span className="text-orange-500">*</span>
                    </label>
                    <input 
                       type="text" 
                       required
                       value={formData.endereco || ''}
                       onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner placeholder:text-zinc-700"
                       placeholder="RUA, NÚMERO, BAIRRO"
                    />
                  </div>

                  <div className="space-y-2 col-span-full md:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Cidade <span className="text-orange-500">*</span>
                    </label>
                    <input 
                       type="text" 
                       required
                       value={formData.cidade || ''}
                       onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition shadow-inner placeholder:text-zinc-700"
                       placeholder="CIDADE"
                    />
                  </div>
                  <div className="space-y-2 col-span-full md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-1">
                      Estado <span className="text-orange-500">*</span>
                    </label>
                    <input 
                       type="text" 
                       required
                       value={formData.uf || ''}
                       maxLength={2}
                       onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 font-bold uppercase transition text-center shadow-inner font-mono placeholder:text-zinc-700"
                       placeholder="UF"
                    />
                  </div>

                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-2">Observações Gerais</label>
                    <textarea 
                       value={formData.observacoes || ''}
                       onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 min-h-[140px] resize-y transition shadow-inner placeholder:text-zinc-700"
                       placeholder="Notas adicionais..."
                    />
                  </div>
                </div>

              </div>

              <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 sm:p-8 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-4 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 font-black text-[10px] uppercase tracking-widest transition"
                >
                  FECHAR
                </button>
                <button 
                  type="submit" 
                  id="btn-salvar-cliente"
                  disabled={modalLoading}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-[0.98] shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {modalLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {editingCliente ? 'EFETIVAR ATUALIZAÇÃO' : 'CONFIRMAR REGISTRO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
