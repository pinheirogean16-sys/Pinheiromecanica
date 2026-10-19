'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { 
  User, Shield, Settings, Plus, Edit, Trash2, 
  Key, Save, Check, AlertTriangle, 
  ShieldCheck, Wrench, Briefcase, UserCheck, Package,
  Building2, Landmark, FileText,
  ChevronRight, History, Upload, Eye, EyeOff, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { TableVirtualizer } from '@/components/TableVirtualizer';

type Tab = 'usuarios' | 'perfil' | 'sistema' | 'empresa' | 'logs';

// Componente de Linha Memoizado
const UserRow = memo(({ 
  u, 
  currentUser, 
  roleConfigs, 
  handleOpenUserModal, 
  handleResetPassword, 
  handleDeleteUser 
}: { 
  u: any, 
  currentUser: any, 
  roleConfigs: any, 
  handleOpenUserModal: any, 
  handleResetPassword: any, 
  handleDeleteUser: any 
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
          <button onClick={() => handleOpenUserModal(u)} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition shadow-lg"><Edit className="w-4 h-4" /></button>
          <button onClick={() => handleResetPassword(u.id)} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-orange-600 transition shadow-lg"><Key className="w-4 h-4" /></button>
          <button onClick={() => handleDeleteUser(u.id)} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-red-500 transition shadow-lg disabled:opacity-20" disabled={u.id === currentUser.id}><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
});

UserRow.displayName = 'UserRow';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estado da Empresa
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

  const fetchCompanyData = useCallback(async () => {
    try {
      const res = await fetch('/api/configuracoes/empresa');
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          setCompanyData(data);
          if (data.logo_url) setLogoPreview(data.logo_url);
        }
      }
    } catch {
      // erro silencioso
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

  // Upload da Logo
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
    try {
      const res = await fetch('/api/configuracoes/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });
      if (res.ok) {
        toast.success('Dados da empresa salvos com sucesso!');
      } else {
        toast.error('Erro ao salvar dados da empresa');
      }
    } catch {
      toast.error('Erro de conexão ao salvar');
    }
  };

  const [usersData, setUsersData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 0 });
  const [usersPage, setUsersPage] = useState(1);
  
  const [logsData, setLogsData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 0 });
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFiltroModulo, setLogsFiltroModulo] = useState('TODOS');

  const fetchLogs = useCallback(async () => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/logs?page=${logsPage}&limit=20&modulo=${logsFiltroModulo}`);
      if (res.ok) {
        setLogsData(await res.json());
      }
    } catch {
      // silencioso
    } finally {
      setLogsLoading(false);
    }
  }, [currentUser, logsPage, logsFiltroModulo]);

  useEffect(() => {
    const load = async () => {
      if (activeTab === 'logs') {
        await fetchLogs();
      }
    };
    load();
  }, [activeTab, fetchLogs]);

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

  const [profileFormData, setProfileFormData] = useState({
    name: '',
    email: '',
    senhaAtual: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/usuario');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        setProfileFormData(prev => ({ ...prev, name: data.name, email: data.email }));
        if (data.role !== 'ADMIN') setActiveTab('perfil');
      } else {
        toast.error('Erro ao carregar perfil');
      }
    } catch {
      toast.error('Interrupção na rede de dados');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const res = await fetch(`/api/usuarios?page=${usersPage}&limit=10`);
      if (res.ok) {
        setUsersData(await res.json());
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } catch {
      toast.error('Falha de protocolo na listagem');
    }
  }, [currentUser, usersPage]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, [fetchProfile]);

  useEffect(() => {
    const loadUsers = async () => {
      if (currentUser?.role === 'ADMIN' && activeTab === 'usuarios') {
        await fetchUsers();
      }
    };
    loadUsers();
  }, [currentUser, activeTab, fetchUsers]);

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
    const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
    const method = editingUser ? 'PUT' : 'POST';
    try {
      const payload = {
        ...userFormData,
        comissao: parseFloat(userFormData.comissao || '0')
      };
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsUserModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(data.error || 'Erro ao salvar usuário');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Deseja excluir permanentemente este usuário?')) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(data.error || 'Erro ao excluir usuário');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('Deseja resetar a senha? Uma senha temporária será gerada.')) return;
    try {
      const res = await fetch(`/api/usuarios/${id}/reset-password`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Senha temporária: ${data.tempPassword}`, {
          description: 'Anote agora. Não será exibida novamente.',
          duration: 30000,
        });
      } else {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(data.error || 'Erro ao resetar');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

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

    try {
      const payload: any = {
        name: profileFormData.name,
        email: profileFormData.email,
      };
      if (profileFormData.newPassword) {
        payload.password = profileFormData.newPassword;
        payload.senha_atual = profileFormData.senhaAtual;
      }

      const res = await fetch('/api/usuario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Perfil atualizado com sucesso');
        setProfileFormData(prev => ({
          ...prev,
          senhaAtual: '',
          newPassword: '',
          confirmPassword: '',
        }));
        fetchProfile();
      } else {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(data.error || 'Erro ao atualizar perfil');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

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
          {activeTab === 'usuarios' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Gestão de Equipe</h1>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Administração de usuários e permissões</p>
                </div>
                <button onClick={() => handleOpenUserModal()} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 shadow-xl active:scale-95 group">
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
                      {usersData.items.length === 0 ? (
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
                            handleResetPassword={handleResetPassword} 
                            handleDeleteUser={handleDeleteUser} 
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

          {activeTab === 'empresa' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Configuração Corporativa</h1>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Dados oficiais para emissão e impressões</p>
                </div>
                <button 
                  onClick={handleSalvarEmpresa}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl shadow-orange-950/40 active:scale-95 group"
                >
                  <Save className="w-4 h-4 transition-transform group-hover:scale-110" /> Salvar Parametrização
                </button>
              </div>

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
                              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
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
                          PNG ou JPG • Máx 2MB • Fundo transparente recomendado
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Nome Fantasia / Display</label>
                      <input name="nome_fantasia" value={companyData.nome_fantasia} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="VEHLOX" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Razão Social Completa</label>
                      <input name="razao_social" value={companyData.razao_social} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="VEHLOX LTDA" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">CNPJ</label>
                        <input name="cnpj" value={companyData.cnpj} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="00.000.000/0001-00" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">I.E.</label>
                        <input name="inscricao_estadual" value={companyData.inscricao_estadual} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="ISENTO" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Canal de Contato</label>
                        <input name="telefone" value={companyData.telefone} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="(00) 00000-0000" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Endpoint de Email</label>
                        <input name="email" value={companyData.email} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="CONTATO@VEHLOX.COM.BR" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Logradouro Administrativo</label>
                      <input name="endereco" value={companyData.endereco} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="RUA DAS OFICINAS, 999" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Número</label>
                        <input name="numero" value={companyData.numero} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="123" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Bairro</label>
                        <input name="bairro" value={companyData.bairro} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="CENTRO" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Cidade</label>
                        <input name="cidade" value={companyData.cidade} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" placeholder="SÃO PAULO" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">UF</label>
                        <input name="uf" value={companyData.uf} onChange={handleCompanyChange} maxLength={2} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner text-center placeholder:text-zinc-700" placeholder="SP" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">CEP</label>
                      <input name="cep" value={companyData.cep} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="00000-000" />
                    </div>

                  </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                      <Landmark className="w-4 h-4 text-orange-600" /> Configuração Fiscal e Tributária
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">I. Municipal</label>
                          <input name="inscricao_municipal" value={companyData.inscricao_municipal} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono placeholder:text-zinc-700" placeholder="000000" />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Regime de Operação</label>
                          <select name="regime_tributario" value={companyData.regime_tributario} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner appearance-none cursor-pointer">
                            <option value="Simples Nacional">Simples Nacional</option>
                            <option value="MEI">MEI</option>
                            <option value="Lucro Presumido">Lucro Presumido</option>
                            <option value="Lucro Real">Lucro Real</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Token de Comunicação NFSe</label>
                        <div className="relative group">
                          <input 
                            name="token_nfse" 
                            value={companyData.token_nfse} 
                            onChange={handleCompanyChange} 
                            type={showToken ? "text" : "password"} 
                            className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 pr-12 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner placeholder:text-zinc-700" 
                            placeholder="TOKEN DE ACESSO SEGURO" 
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
                      <FileText className="w-4 h-4 text-orange-600" /> Rodapé de Documentos Oficiais
                    </h3>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 block px-1 italic">Este texto será injetado dinamicamente em Ordem de Serviço, Orçamentos e Recibos</label>
                      <textarea 
                        name="rodape_personalizado" 
                        value={companyData.rodape_personalizado} 
                        onChange={handleCompanyChange} 
                        rows={5}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-[11px] text-zinc-400 font-bold uppercase tracking-[0.1em] focus:border-orange-600 outline-none transition-all shadow-inner resize-none leading-relaxed italic placeholder:text-zinc-700" 
                        placeholder="EX: GARANTIA DE 90 DIAS PARA SERVIÇOS EFETUADOS..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ... (restante das abas logs, perfil, sistema e modal de usuário permanecem iguais) ... */}
          
        </main>
      </div>
    </div>
  );
}
