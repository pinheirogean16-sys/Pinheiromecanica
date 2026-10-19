'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { memo, useState, useEffect, useCallback } from 'react';
import { 
  User, Shield, Settings, Plus, Edit, Trash2, 
  Key, Save, AlertTriangle, 
  ShieldCheck, Wrench, Briefcase, UserCheck, Package,
  Building2, Landmark, FileText,
  ChevronRight, History, Upload, Eye, EyeOff, Loader2,
  X, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

type Tab = 'usuarios' | 'perfil' | 'sistema' | 'empresa' | 'logs';

// ============================================================
// COMPONENTE DE LINHA DE USUÁRIO
// ============================================================
const UserRow = memo(({ 
  u, 
  currentUser, 
  roleConfigs, 
  handleOpenUserModal, 
  handleResetPasswordClick, 
  handleDeleteUserClick 
}: { 
  u: any, 
  currentUser: any, 
  roleConfigs: any, 
  handleOpenUserModal: any, 
  handleResetPasswordClick: any, 
  handleDeleteUserClick: any 
}) => {
  const config = roleConfigs[u.role] || roleConfigs.MECANICO;
  const Icon = config.icon;
  
  return (
    <tr className="hover:bg-zinc-800/10 transition-all border-l-4 border-l-transparent hover:border-l-orange-600">
      <td className="p-6 min-w-0">
        <p className="text-sm font-black text-white uppercase tracking-tight truncate">{u.name}</p>
        <p className="text-[10px] text-zinc-500 font-mono font-black uppercase tracking-widest mt-1 truncate">{u.email}</p>
      </td>
      <td className="p-6">
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border italic ${config.color}`}>
          <Icon className="w-3.5 h-3.5" /> {config.label}
        </span>
      </td>
      <td className="p-6">
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handleOpenUserModal(u)} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition shadow-lg cursor-pointer" title="Editar"><Edit className="w-4 h-4" /></button>
          <button onClick={() => handleResetPasswordClick(u)} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-orange-600 transition shadow-lg cursor-pointer" title="Resetar senha"><Key className="w-4 h-4" /></button>
          <button onClick={() => handleDeleteUserClick(u)} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 transition shadow-lg disabled:opacity-20 cursor-pointer" disabled={u.id === currentUser.id} title="Excluir"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
});

UserRow.displayName = 'UserRow';

// ============================================================
// COMPONENTE DE LINHA DE LOG
// ============================================================
const LogRow = memo(({ log }: { log: any }) => {
  const formatDate = (date: string) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getActionColor = (acao: string) => {
    switch (acao?.toUpperCase()) {
      case 'CRIAR': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'EDITAR': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'EXCLUIR': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <tr className="hover:bg-zinc-800/10 transition-all border-l-4 border-l-transparent hover:border-l-orange-600">
      <td className="p-4 min-w-0">
        <p className="text-[10px] font-mono text-zinc-400 font-bold">{formatDate(log.created_at)}</p>
      </td>
      <td className="p-4">
        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{log.modulo || '—'}</span>
      </td>
      <td className="p-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getActionColor(log.acao)}`}>
          {log.acao || '—'}
        </span>
      </td>
      <td className="p-4">
        <p className="text-[10px] font-mono text-zinc-300 font-bold truncate max-w-[150px]" title={log.entidade}>{log.entidade || '—'}</p>
        <p className="text-[8px] font-mono text-zinc-600 mt-0.5">#{log.entidade_id?.slice(-8) || '—'}</p>
      </td>
      <td className="p-4">
        <p className="text-[10px] font-bold text-white uppercase truncate max-w-[150px]" title={log.usuario}>{log.usuario || '—'}</p>
      </td>
    </tr>
  );
});

LogRow.displayName = 'LogRow';

// ============================================================
// PÁGINA
// ============================================================
export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(false);

  // ============================================================
  // ESTADO DA EMPRESA
  // ============================================================
  const [companyData, setCompanyData] = useState<any>({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    regime_tributario: 'Simples Nacional',
    rodape_personalizado: '',
    token_nfse: '',
    logo_url: '',
    pix: '',
    banco: '',
    agencia: '',
    conta: ''
  });

  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const fetchCompanyData = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const data = await apiFetch<any>('/api/configuracoes/empresa');
      if (data && data.id) {
        setCompanyData((prev: any) => ({ ...prev, ...data }));
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    } catch (err: any) {
      // Se for 404/vazio, mantém defaults (não é erro crítico)
      if (err?.status !== 404) {
        handleApiError(err, { defaultMessage: 'Erro ao carregar dados da empresa.' });
      }
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) fetchCompanyData();
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [fetchCompanyData]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        setLogoPreview(data.url);
        setCompanyData((prev: any) => ({ ...prev, logo_url: data.url }));
        toast.success('Logo carregada! Clique em Salvar para confirmar.');
      } else {
        toast.error(data.error || 'Erro ao enviar a logo.');
      }
    } catch {
      toast.error('Erro de conexão ao enviar a logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSalvarEmpresa = async () => {
    setSavingCompany(true);
    try {
      await apiFetch('/api/configuracoes/empresa', {
        method: 'PUT',
        body: companyData,
      });
      toast.success('Dados da empresa salvos com sucesso!');
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao salvar dados da empresa' });
    } finally {
      setSavingCompany(false);
    }
  };

  // ============================================================
  // USUÁRIOS
  // ============================================================
  // ✅ CORRIGIDO: totalPages inicia em 1
  const [usersData, setUsersData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 1 });
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (currentUser?.role !== 'ADMIN') return;
    setUsersLoading(true);
    try {
      const data = await apiFetch<any>(`/api/usuarios?page=${usersPage}&limit=10`);
      const items = Array.isArray(data) ? data : (data.items || []);
      const total = typeof data.total === 'number' ? data.total : items.length;
      const totalPages = Math.max(1, data.totalPages || 1);
      setUsersData({ items, total, totalPages });
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao carregar usuários' });
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser, usersPage]);

  // ============================================================
  // LOGS
  // ============================================================
  // ✅ CORRIGIDO: totalPages inicia em 1
  const [logsData, setLogsData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 1 });
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFiltroModulo, setLogsFiltroModulo] = useState('TODOS');

  const fetchLogs = useCallback(async () => {
    if (currentUser?.role !== 'ADMIN') return;
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(logsPage),
        limit: '20',
        modulo: logsFiltroModulo,
      });
      const data = await apiFetch<any>(`/api/logs?${params.toString()}`);
      const items = Array.isArray(data) ? data : (data.items || []);
      const total = typeof data.total === 'number' ? data.total : items.length;
      const totalPages = Math.max(1, data.totalPages || 1);
      setLogsData({ items, total, totalPages });
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao carregar logs de auditoria' });
    } finally {
      setLogsLoading(false);
    }
  }, [currentUser, logsPage, logsFiltroModulo]);

  // Reset da página ao trocar filtro
  useEffect(() => {
    setLogsPage(1);
  }, [logsFiltroModulo]);

  // ============================================================
  // PERFIL
  // ============================================================
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    email: '',
    senhaAtual: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiFetch<any>('/api/usuario');
      setCurrentUser(data);
      setProfileFormData(prev => ({ ...prev, name: data.name, email: data.email }));
      if (data.role !== 'ADMIN') setActiveTab('perfil');
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao carregar perfil' });
    }
  }, []);

  // ============================================================
  // MODAIS (usuários e reset de senha)
  // ============================================================
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'MECANICO',
    password: '',
    especialidade: '',
    comissao: '0'
  });
  const [savingUser, setSavingUser] = useState(false);

  // ✅ NOVO: modal de exclusão (substitui confirm nativo)
  const [deleteUserTarget, setDeleteUserTarget] = useState<any>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // ✅ NOVO: modal de reset de senha (substitui confirm nativo)
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // ============================================================
  // EFFECTS DE CARREGAMENTO
  // ============================================================
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, [fetchProfile]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && activeTab === 'usuarios') {
      fetchUsers();
    }
  }, [currentUser, activeTab, fetchUsers]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && activeTab === 'logs') {
      fetchLogs();
    }
  }, [currentUser, activeTab, fetchLogs]);

  // ============================================================
  // HANDLERS — USUÁRIOS
  // ============================================================
  const handleOpenUserModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name, email: user.email, role: user.role,
        password: '', especialidade: user.especialidade || '', comissao: user.comissao?.toString() || '0'
      });
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', email: '', role: 'MECANICO', password: '', especialidade: '', comissao: '0' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';
      const payload = {
        ...userFormData,
        comissao: parseFloat(userFormData.comissao || '0')
      };
      await apiFetch(url, { method, body: payload });
      toast.success(editingUser ? 'Usuário atualizado!' : 'Novo usuário criado!');
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao salvar usuário' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUserClick = (user: any) => {
    setDeleteUserTarget(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setIsDeletingUser(true);
    try {
      await apiFetch(`/api/usuarios/${deleteUserTarget.id}`, { method: 'DELETE' });
      toast.success('Usuário excluído com sucesso!');
      setDeleteUserTarget(null);
      fetchUsers();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao excluir usuário' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleResetPasswordClick = (user: any) => {
    setResetPasswordTarget(user);
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordTarget) return;
    setIsResettingPassword(true);
    try {
      const data = await apiFetch<any>(`/api/usuarios/${resetPasswordTarget.id}/reset-password`, { method: 'POST' });
      toast.success(`Senha temporária: ${data.tempPassword}`, {
        description: 'Anote agora. Não será exibida novamente.',
        duration: 30000,
      });
      setResetPasswordTarget(null);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao resetar senha' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // ============================================================
  // HANDLER — PERFIL
  // ============================================================
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profileFormData.newPassword) {
      if (!profileFormData.senhaAtual) {
        toast.error('Informe a senha atual para trocar a senha');
        return;
      }
      if (profileFormData.newPassword !== profileFormData.confirmPassword) {
        toast.error('As novas senhas não coincidem');
        return;
      }
      if (profileFormData.newPassword.length < 8) {
        toast.error('A nova senha deve ter pelo menos 8 caracteres');
        return;
      }
    }

    setProfileSaving(true);
    try {
      const payload: any = {
        name: profileFormData.name,
        email: profileFormData.email,
      };
      if (profileFormData.newPassword) {
        payload.password = profileFormData.newPassword;
        payload.senha_atual = profileFormData.senhaAtual;
      }

      await apiFetch('/api/usuario', { method: 'PUT', body: payload });

      toast.success('Perfil atualizado com sucesso');
      setProfileFormData(prev => ({
        ...prev,
        senhaAtual: '',
        newPassword: '',
        confirmPassword: '',
      }));
      fetchProfile();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao atualizar perfil' });
    } finally {
      setProfileSaving(false);
    }
  };

  // ============================================================
  // RENDER — LOADING INICIAL
  // ============================================================
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const roleConfigs: any = {
    ADMIN: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: ShieldCheck, label: 'Adm' },
    LIDER: { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: UserCheck, label: 'Líder' },
    MECANICO: { color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: Wrench, label: 'Mecânico' },
    ESTOQUISTA: { color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: Package, label: 'Estoque' },
    FINANCEIRO: { color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Briefcase, label: 'Financeiro' },
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* SIDEBAR */}
        <aside className="lg:w-72 space-y-3">
          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('usuarios')} 
              className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
                activeTab === 'usuarios' 
                  ? 'bg-orange-600 border-orange-500 text-white shadow-orange-950/20' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <User className="w-4 h-4 flex-shrink-0" /> Usuários
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === 'usuarios' ? 'rotate-90' : ''}`} />
            </button>
          )}
          <button 
            onClick={() => setActiveTab('perfil')} 
            className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
              activeTab === 'perfil' 
                ? 'bg-orange-600 border-orange-500 text-white shadow-orange-950/20' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <Shield className="w-4 h-4 flex-shrink-0" /> Meu Perfil
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === 'perfil' ? 'rotate-90' : ''}`} />
          </button>
          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('empresa')} 
              className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
                activeTab === 'empresa' 
                  ? 'bg-orange-600 border-orange-500 text-white shadow-orange-950/20' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Building2 className="w-4 h-4 flex-shrink-0" /> Empresa
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === 'empresa' ? 'rotate-90' : ''}`} />
            </button>
          )}
          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('logs')} 
              className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
                activeTab === 'logs' 
                  ? 'bg-orange-600 border-orange-500 text-white shadow-orange-950/20' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <History className="w-4 h-4 flex-shrink-0" /> Logs de Auditoria
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === 'logs' ? 'rotate-90' : ''}`} />
            </button>
          )}
          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('sistema')} 
              className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
                activeTab === 'sistema' 
                  ? 'bg-orange-600 border-orange-500 text-white shadow-orange-950/20' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Settings className="w-4 h-4 flex-shrink-0" /> Sistema
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === 'sistema' ? 'rotate-90' : ''}`} />
            </button>
          )}
        </aside>

        <main className="flex-1">

          {/* ============================================================ */}
          {/* ABA USUÁRIOS */}
          {/* ============================================================ */}
          {activeTab === 'usuarios' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Gestão de Equipe</h1>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Administração de usuários e permissões</p>
                </div>
                <button onClick={() => handleOpenUserModal()} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 shadow-xl active:scale-95 group cursor-pointer">
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> Novo Colaborador
                </button>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                        <th className="p-6 font-mono text-zinc-400 uppercase tracking-widest">Colaborador</th>
                        <th className="p-6 font-mono text-zinc-400 uppercase tracking-widest">Função Gerencial</th>
                        <th className="p-6 font-mono text-zinc-400 uppercase tracking-widest text-center">Gestão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {usersLoading ? (
                        <tr>
                          <td colSpan={3} className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Carregando usuários...</p>
                          </td>
                        </tr>
                      ) : usersData.items.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-12 text-center">
                            <User className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                            <p className="text-sm font-black text-white uppercase italic tracking-tighter">Nenhum usuário cadastrado</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                              Clique em "Novo Colaborador" para adicionar.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        usersData.items.map((u) => (
                          <UserRow 
                            key={u.id} 
                            u={u} 
                            currentUser={currentUser} 
                            roleConfigs={roleConfigs} 
                            handleOpenUserModal={handleOpenUserModal} 
                            handleResetPasswordClick={handleResetPasswordClick} 
                            handleDeleteUserClick={handleDeleteUserClick} 
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
                <Pagination 
                  page={usersPage} 
                  totalPages={usersData.totalPages} 
                  onPageChange={setUsersPage} 
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ABA EMPRESA */}
          {/* ============================================================ */}
          {activeTab === 'empresa' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Configuração Corporativa</h1>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Dados oficiais para emissão e impressões</p>
                </div>
                <button 
                  onClick={handleSalvarEmpresa}
                  disabled={savingCompany}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl shadow-orange-950/40 active:scale-95 group cursor-pointer"
                >
                  {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 transition-transform group-hover:scale-110" />}
                  Salvar Parametrização
                </button>
              </div>

              {companyLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">Carregando dados da empresa...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Building2 className="w-24 h-24" />
                    </div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                      <Building2 className="w-4 h-4 text-orange-600" /> Identidade Visual e Registro
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Logo da Oficina</label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-white border border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-10 h-10 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                            uploadingLogo 
                              ? 'border-orange-500/50 bg-orange-500/10 text-orange-500' 
                              : 'border-zinc-700 hover:border-orange-500/50 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white'
                          }`}>
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Enviando...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Selecionar Imagem</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleLogoUpload}
                              disabled={uploadingLogo}
                            />
                          </label>
                          <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider text-center">
                            PNG ou JPG • Máx 2MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Nome Fantasia</label>
                        <input name="nome_fantasia" value={companyData.nome_fantasia || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="VEHLOX" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Razão Social</label>
                        <input name="razao_social" value={companyData.razao_social || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="VEHLOX LTDA" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">CNPJ</label>
                          <input name="cnpj" value={companyData.cnpj || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="00.000.000/0001-00" />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">I.E.</label>
                          <input name="inscricao_estadual" value={companyData.inscricao_estadual || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="ISENTO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Telefone</label>
                          <input name="telefone" value={companyData.telefone || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">E-mail</label>
                          <input name="email" value={companyData.email || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="CONTATO@EMPRESA.COM.BR" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Endereço</label>
                        <input name="endereco" value={companyData.endereco || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="RUA DAS OFICINAS, 999" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Nº</label>
                          <input name="numero" value={companyData.numero || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="123" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Bairro</label>
                          <input name="bairro" value={companyData.bairro || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="CENTRO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Cidade</label>
                          <input name="cidade" value={companyData.cidade || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="SÃO PAULO" />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">UF</label>
                          <input name="uf" value={companyData.uf || ''} onChange={handleCompanyChange} maxLength={2} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner text-center placeholder:text-zinc-700" placeholder="SP" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">CEP</label>
                        <input name="cep" value={companyData.cep || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="00000-000" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                        <Landmark className="w-4 h-4 text-orange-600" /> Configuração Fiscal
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">I. Municipal</label>
                            <input name="inscricao_municipal" value={companyData.inscricao_municipal || ''} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="000000" />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Regime Tributário</label>
                            <select name="regime_tributario" value={companyData.regime_tributario || 'Simples Nacional'} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner appearance-none cursor-pointer">
                              <option value="Simples Nacional">Simples Nacional</option>
                              <option value="MEI">MEI</option>
                              <option value="Lucro Presumido">Lucro Presumido</option>
                              <option value="Lucro Real">Lucro Real</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Token NFSe</label>
                          <div className="relative group">
                            <input 
                              name="token_nfse" 
                              value={companyData.token_nfse || ''} 
                              onChange={handleCompanyChange} 
                              type={showToken ? "text" : "password"} 
                              className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 pr-12 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" 
                              placeholder="TOKEN DE ACESSO" 
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                            >
                              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                        <FileText className="w-4 h-4 text-orange-600" /> Rodapé de Documentos
                      </h3>
                      <textarea 
                        name="rodape_personalizado" 
                        value={companyData.rodape_personalizado || ''} 
                        onChange={handleCompanyChange} 
                        rows={5}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-[11px] text-zinc-400 font-bold uppercase tracking-[0.1em] focus:border-orange-600 outline-none transition-all shadow-inner resize-none leading-relaxed italic placeholder:text-zinc-700" 
                        placeholder="EX: GARANTIA DE 90 DIAS PARA SERVIÇOS EFETUADOS..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* ABA PERFIL */}
          {/* ============================================================ */}
          {activeTab === 'perfil' && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden animate-in fade-in">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Shield className="w-32 h-32" />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6">
                  <div className="p-3 bg-orange-600/10 text-orange-500 rounded-xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Perfil do Operador</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Configurações de conta e credenciais</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome Completo</label>
                      <input
                        type="text"
                        value={profileFormData.name}
                        onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white focus:border-orange-500 outline-none transition font-bold uppercase tracking-widest placeholder:text-zinc-700"
                        placeholder="SEU NOME"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Email de Acesso</label>
                      <input
                        type="email"
                        value={profileFormData.email}
                        onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white focus:border-orange-500 outline-none transition font-bold lowercase tracking-widest placeholder:text-zinc-700"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800/50">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Segurança e Acesso</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Senha Atual</label>
                        <input
                          type="password"
                          value={profileFormData.senhaAtual}
                          onChange={(e) => setProfileFormData({ ...profileFormData, senhaAtual: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white focus:border-orange-500 outline-none transition font-mono placeholder:text-zinc-700"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nova Senha</label>
                        <input
                          type="password"
                          value={profileFormData.newPassword}
                          onChange={(e) => setProfileFormData({ ...profileFormData, newPassword: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white focus:border-orange-500 outline-none transition font-mono placeholder:text-zinc-700"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Confirmar</label>
                        <input
                          type="password"
                          value={profileFormData.confirmPassword}
                          onChange={(e) => setProfileFormData({ ...profileFormData, confirmPassword: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white focus:border-orange-500 outline-none transition font-mono placeholder:text-zinc-700"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-orange-500/70 font-black uppercase tracking-widest mt-3 px-1 italic">* A troca de senha encerrará todas as suas sessões ativas em outros dispositivos.</p>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ✅ NOVO: ABA LOGS DE AUDITORIA (implementada) */}
          {/* ============================================================ */}
          {activeTab === 'logs' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Logs de Auditoria</h1>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Rastreamento completo de ações no sistema</p>
                </div>
                <button 
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} /> Recarregar
                </button>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-3">
                <select 
                  value={logsFiltroModulo}
                  onChange={(e) => setLogsFiltroModulo(e.target.value)}
                  className="w-full md:w-auto bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] font-mono uppercase tracking-widest text-zinc-300 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="TODOS">TODOS OS MÓDULOS</option>
                  <option value="OS">ORDENS DE SERVIÇO</option>
                  <option value="CLIENTE">CLIENTES</option>
                  <option value="VEICULO">VEÍCULOS</option>
                  <option value="PECA">PEÇAS</option>
                  <option value="ESTOQUE">ESTOQUE</option>
                  <option value="FINANCEIRO">FINANCEIRO</option>
                  <option value="USUARIO">USUÁRIOS</option>
                  <option value="CONFIG">CONFIGURAÇÕES</option>
                  <option value="AUTH">AUTENTICAÇÃO</option>
                </select>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                        <th className="p-4 italic">Data / Hora</th>
                        <th className="p-4 italic">Módulo</th>
                        <th className="p-4 italic">Ação</th>
                        <th className="p-4 italic">Entidade</th>
                        <th className="p-4 italic">Usuário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {logsLoading ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Carregando logs...</p>
                          </td>
                        </tr>
                      ) : logsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center">
                            <History className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                            <p className="text-sm font-black text-white uppercase italic tracking-tighter">Nenhum log encontrado</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                              {logsFiltroModulo !== 'TODOS' ? 'Tente mudar o filtro de módulo' : 'Nenhuma atividade registrada ainda'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        logsData.items.map((log: any) => (
                          <LogRow key={log.id} log={log} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest">
                      {logsData.total > 0 ? `Mostrando ${(logsPage - 1) * 20 + 1} a ${Math.min(logsPage * 20, logsData.total)} de ${logsData.total} registros` : 'Sem registros'}
                    </p>
                  </div>
                  <Pagination 
                    page={logsPage} 
                    totalPages={logsData.totalPages} 
                    onPageChange={setLogsPage} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ABA SISTEMA (placeholder) */}
          {/* ============================================================ */}
          {activeTab === 'sistema' && currentUser?.role === 'ADMIN' && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center shadow-2xl">
              <Settings className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Configurações do Sistema</h2>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                Em breve: gestão de backups, integrações e parâmetros globais.
              </p>
            </div>
          )}

        </main>
      </div>

      {/* ============================================================ */}
      {/* MODAL: NOVO / EDITAR USUÁRIO */}
      {/* ============================================================ */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/30 flex justify-between items-center">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome</label>
                <input type="text" required value={userFormData.name} onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">E-mail</label>
                <input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Função</label>
                  <select value={userFormData.role} onChange={(e) => setUserFormData({...userFormData, role: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none cursor-pointer">
                    <option value="MECANICO">Mecânico</option>
                    <option value="LIDER">Líder</option>
                    <option value="ESTOQUISTA">Estoquista</option>
                    <option value="FINANCEIRO">Financeiro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Comissão (%)</label>
                  <input type="number" step="0.1" value={userFormData.comissao} onChange={(e) => setUserFormData({...userFormData, comissao: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  {editingUser ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha'}
                </label>
                <input type="password" required={!editingUser} value={userFormData.password} onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none font-mono" placeholder="••••••••" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Especialidade</label>
                <input type="text" value={userFormData.especialidade} onChange={(e) => setUserFormData({...userFormData, especialidade: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition">Cancelar</button>
                <button type="submit" disabled={savingUser} className="flex-[2] px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer">
                  {savingUser ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EXCLUIR USUÁRIO */}
      {/* ============================================================ */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Excluir Usuário</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Ação irreversível</p>
                </div>
              </div>
              <button onClick={() => setDeleteUserTarget(null)} className="p-2 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tem certeza que deseja excluir <strong className="text-white">{deleteUserTarget.name}</strong>?
              </p>
              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-xs text-zinc-400 leading-relaxed">
                <p className="font-bold text-red-400 uppercase text-[10px] tracking-widest mb-1">⚠️ Atenção</p>
                <p>Se este usuário tiver <strong>OS</strong> ou <strong>eventos</strong> na agenda, a exclusão será bloqueada. Considere desativá-lo em vez de excluir.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteUserTarget(null)} disabled={isDeletingUser} className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50">Cancelar</button>
                <button onClick={confirmDeleteUser} disabled={isDeletingUser} className="flex-[2] px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-xl flex items-center justify-center gap-2 cursor-pointer">
                  {isDeletingUser ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RESETAR SENHA */}
      {/* ============================================================ */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-orange-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-orange-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Resetar Senha</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Senha temporária</p>
                </div>
              </div>
              <button onClick={() => setResetPasswordTarget(null)} className="p-2 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Gerar uma nova senha temporária para <strong className="text-white">{resetPasswordTarget.name}</strong>?
              </p>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 text-xs text-zinc-400 leading-relaxed">
                <p className="font-bold text-orange-400 uppercase text-[10px] tracking-widest mb-1">💡 Importante</p>
                <p>A senha será exibida <strong>uma única vez</strong>. Anote e envie para o colaborador.</p>
                <p className="mt-2">Todas as sessões ativas do colaborador serão encerradas.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setResetPasswordTarget(null)} disabled={isResettingPassword} className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50">Cancelar</button>
                <button onClick={confirmResetPassword} disabled={isResettingPassword} className="flex-[2] px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-xl flex items-center justify-center gap-2 cursor-pointer">
                  {isResettingPassword ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Resetar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
