'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, Shield, Settings, Plus, Edit, Trash2, 
  Key, Save, X, Check, AlertTriangle, 
  ShieldCheck, Wrench, Briefcase, UserCheck, Package,
  Palette, Upload, Building2, Landmark, FileText,
  ChevronRight, History
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { TableVirtualizer } from '@/components/TableVirtualizer';

type Tab = 'usuarios' | 'perfil' | 'sistema' | 'aparencia' | 'empresa' | 'logs';

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
        <p className="text-[10px] text-zinc-600 font-mono font-black uppercase tracking-widest mt-1 truncate">{u.email}</p>
      </td>
      <td className="p-6">
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border italic ${config.color}`}>
          <Icon className="w-3.5 h-3.5" /> {config.label}
        </span>
      </td>
      <td className="p-6">
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handleOpenUserModal(u)} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 hover:text-white transition shadow-lg"><Edit className="w-4 h-4" /></button>
          <button onClick={() => handleResetPassword(u.id)} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 hover:text-orange-600 transition shadow-lg"><Key className="w-4 h-4" /></button>
          <button onClick={() => handleDeleteUser(u.id)} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 hover:text-red-500 transition shadow-lg disabled:opacity-20" disabled={u.id === currentUser.id}><Trash2 className="w-4 h-4" /></button>
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

  // Estados de Aparência
  const [corPrincipal, setCorPrincipal] = useState('#F97316');
  const [logoPreview, setLogoPreview] = useState('');
  const [nomeSistema, setNomeSistema] = useState('Pinheiro Diesel Pro');
  const [faviconPreview, setFaviconPreview] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCor = localStorage.getItem('corPrincipal');
      if (savedCor) setCorPrincipal(savedCor);

      const savedLogo = localStorage.getItem('logo');
      if (savedLogo) setLogoPreview(savedLogo);

      const savedNome = localStorage.getItem('nomeSistema');
      if (savedNome) setNomeSistema(savedNome);

      const savedFavicon = localStorage.getItem('favicon');
      if (savedFavicon) setFaviconPreview(savedFavicon);
    }
  }, []);

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
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
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

  const handleSalvarEmpresa = async () => {
    try {
      const res = await fetch('/api/configuracoes/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });
      if (res.ok) {
        toast.success('Dados da empresa salvos com sucesso!');
        // Fallback para localStorage para compatibilidade com partes que ainda usam
        localStorage.setItem('companyData', JSON.stringify({
          nomeFantasia: companyData.nome_fantasia,
          razaoSocial: companyData.razao_social,
          cnpj: companyData.cnpj,
          ie: companyData.inscricao_estadual,
          im: companyData.inscricao_municipal,
          telefone: companyData.telefone,
          email: companyData.email,
          endereco: companyData.endereco,
          rodape: companyData.rodape_personalizado
        }));
      } else {
        toast.error('Erro ao salvar dados da empresa');
      }
    } catch (error) {
      toast.error('Erro de conexão ao salvar');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      const toastId = toast.loading('Enviando logo...');
      
      try {
        const res = await fetch('/api/upload/logo', {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          const { url } = await res.json();
          setLogoPreview(url);
          setCompanyData((prev: any) => ({ ...prev, logo_url: url }));
          localStorage.setItem('logo', url);
          toast.success('Logo enviada com sucesso!', { id: toastId });
        } else {
          toast.error('Erro no upload da logo', { id: toastId });
        }
      } catch (error) {
        toast.error('Erro de conexão no upload', { id: toastId });
      }
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFaviconPreview(base64);
        localStorage.setItem('favicon', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const aplicarTema = useCallback(() => {
    const root = document.documentElement;
    root.style.setProperty('--cor-principal', corPrincipal);
    // Atualizar favicon
    if (faviconPreview) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) link.href = faviconPreview;
    }
  }, [corPrincipal, faviconPreview]);

  const handleSalvarAparencia = () => {
    localStorage.setItem('corPrincipal', corPrincipal);
    localStorage.setItem('nomeSistema', nomeSistema);
    localStorage.setItem('logo', logoPreview);
    localStorage.setItem('favicon', faviconPreview);
    toast.success('Aparência salva com sucesso!');
    aplicarTema();
  };

  useEffect(() => {
    aplicarTema();
  }, [aplicarTema]);
  
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
    } catch (error) {
      console.error(error);
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
    } catch (error) { 
      console.error(error); 
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
    } catch (error) { 
        console.error(error); 
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
      if (res.ok) { setIsUserModalOpen(false); fetchUsers(); }
      else { alert((await res.json()).error); }
    } catch (error) { alert('Erro de conexão'); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Deseja excluir permanentemente este usuário?')) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
      else alert((await res.json()).error);
    } catch (error) { alert('Erro de conexão'); }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('Deseja resetar a senha? Uma senha temporária será gerada.')) return;
    try {
      const res = await fetch(`/api/usuarios/${id}/reset-password`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Senha resetada! Nova senha: ${data.tempPassword}\nAnote-a agora.`);
      }
    } catch (error) { alert('Erro ao resetar'); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileFormData.newPassword && profileFormData.newPassword !== profileFormData.confirmPassword) {
      alert('As novas senhas não coincidem'); return;
    }
    try {
      const res = await fetch('/api/usuario', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileFormData.name, email: profileFormData.email,
          password: profileFormData.newPassword || undefined
        })
      });
      if (res.ok) { alert('Perfil atualizado!'); fetchProfile(); }
    } catch (error) { alert('Erro de conexão'); }
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
          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('aparencia')} 
              className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 shadow-lg ${
                activeTab === 'aparencia' 
                  ? 'bg-orange-600 border-orange-500 text-white shadow-orange-950/20' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Palette className="w-4 h-4 flex-shrink-0" /> Aparência
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === 'aparencia' ? 'rotate-90' : ''}`} />
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

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
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
                      {usersData.items.map((u) => (
                        <UserRow 
                          key={u.id} 
                          u={u} 
                          currentUser={currentUser} 
                          roleConfigs={roleConfigs} 
                          handleOpenUserModal={handleOpenUserModal} 
                          handleResetPassword={handleResetPassword} 
                          handleDeleteUser={handleDeleteUser} 
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
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
                {/* Dados Cadastrais */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Building2 className="w-24 h-24" />
                  </div>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                    <Building2 className="w-4 h-4 text-orange-600" /> Identidade Visual e Registro
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Nome Fantasia / Display</label>
                      <input name="nome_fantasia" value={companyData.nome_fantasia} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="PAGANI DIESEL LTDA" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Razão Social Completa</label>
                      <input name="razao_social" value={companyData.razao_social} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">CNPJ</label>
                        <input name="cnpj" value={companyData.cnpj} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono" placeholder="00.000.000/0001-00" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">I.E.</label>
                        <input name="inscricao_estadual" value={companyData.inscricao_estadual} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Canal de Contato</label>
                        <input name="telefone" value={companyData.telefone} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono" placeholder="(00) 00000-0000" />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Endpoint de Email</label>
                        <input name="email" value={companyData.email} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono" placeholder="CONTATO@EMPRESA.COM.BR" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Logradouro Administrativo</label>
                      <input name="endereco" value={companyData.endereco} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="RUA DAS OFICINAS, 999" />
                    </div>
                  </div>
                </div>

                {/* Dados Técnicos e Fiscais */}
                <div className="space-y-8">
                   <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                      <Landmark className="w-4 h-4 text-orange-600" /> Configuração Fiscal e Tributária
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">I. Municipal</label>
                          <input name="inscricao_municipal" value={companyData.inscricao_municipal} onChange={handleCompanyChange} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner font-mono" />
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
                          <input name="token_nfse" value={companyData.token_nfse} onChange={handleCompanyChange} type="password" className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="TOKEN DE ACESSO CRIPTOGRAFADO" />
                          <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-800" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-800/50">
                      <FileText className="w-4 h-4 text-orange-600" /> Rodapé de Documentos Oficiais
                    </h3>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-3 block px-1 italic">Este texto será injetado dinamicamente em Ordem de Serviço, Orçamentos e Recibos</label>
                      <textarea 
                        name="rodape_personalizado" 
                        value={companyData.rodape_personalizado} 
                        onChange={handleCompanyChange} 
                        rows={5}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-[11px] text-zinc-500 font-bold uppercase tracking-[0.1em] focus:border-orange-600 outline-none transition-all shadow-inner resize-none leading-relaxed italic" 
                        placeholder="EX: GARANTIA DE 90 DIAS PARA SERVIÇOS EFETUADOS..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'logs' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Logs de Auditoria</h1>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Rastreabilidade completa de mutações de dados</p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={logsFiltroModulo} 
                    onChange={(e) => { setLogsFiltroModulo(e.target.value); setLogsPage(1); }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-zinc-400 outline-none focus:border-orange-600 transition-all cursor-pointer"
                  >
                    <option value="TODOS">TODOS OS MÓDULOS</option>
                    <option value="OS">OS</option>
                    <option value="CLIENTES">CLIENTES</option>
                    <option value="VEICULOS">VEÍCULOS</option>
                    <option value="FINANCEIRO">FINANCEIRO</option>
                    <option value="ESTOQUE">ESTOQUE</option>
                    <option value="USUARIOS">USUÁRIOS</option>
                  </select>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl min-h-[600px] flex flex-col">
                {logsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                ) : logsData.items.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <div className="w-full text-left text-zinc-400 text-[10px] font-mono uppercase tracking-widest bg-zinc-900/50 flex py-4 border-b border-zinc-900">
                        <div className="flex-[2] pl-6">Data/Hora</div>
                        <div className="flex-[2] px-4">Operador</div>
                        <div className="flex-[1.5] px-4">Módulo</div>
                        <div className="flex-[1.5] px-4">Ação</div>
                        <div className="flex-[3] pr-6">Entidade ID</div>
                      </div>
                      
                      <TableVirtualizer
                        items={logsData.items}
                        estimateSize={52}
                        maxHeight="450px"
                        renderItem={(log) => (
                          <div className="w-full hover:bg-zinc-800/10 transition-all border-l-4 border-l-transparent hover:border-l-orange-600 group flex items-center py-3 border-b border-zinc-900/40">
                            <div className="flex-[2] pl-6 truncate">
                              <p className="text-[11px] font-mono font-bold text-zinc-400">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="flex-[2] px-4 truncate">
                              <p className="text-[11px] font-black text-white uppercase tracking-tight">{log.usuario}</p>
                            </div>
                            <div className="flex-[1.5] px-4">
                              <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[9px] font-black text-zinc-500 uppercase tracking-widest block w-fit">
                                {log.modulo}
                              </span>
                            </div>
                            <div className="flex-[1.5] px-4">
                              <span className={`text-[10px] font-black uppercase italic ${
                                log.acao === 'EXCLUIR' ? 'text-red-500' : 
                                log.acao === 'CRIAR' ? 'text-green-500' : 
                                'text-blue-500'
                              }`}>
                                {log.acao}
                              </span>
                            </div>
                            <div className="flex-[3] pr-6 font-mono text-[9px] text-zinc-700 truncate uppercase group-hover:text-zinc-500 transition-colors">
                              {log.entidade_id}
                            </div>
                          </div>
                        )}
                      />
                    </div>
                    <div className="p-6 border-t border-zinc-800 bg-zinc-950/20 mt-auto">
                      <Pagination 
                        page={logsPage} 
                        totalPages={logsData.totalPages} 
                        onPageChange={setLogsPage} 
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                    <History size={48} className="text-zinc-500" />
                    <p className="text-[11px] font-black uppercase tracking-widest">Nenhum rastro de auditoria localizado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="max-w-3xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 space-y-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Informações Pessoais</h1>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Gerenciamento de credenciais e perfil</p>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Nome Completo</label>
                    <input type="text" value={profileFormData.name} onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-sm text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Email de Acesso</label>
                    <input type="email" value={profileFormData.email} onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-sm text-zinc-400 font-mono font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-900">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Nova Senha (Security)</label>
                    <input type="password" value={profileFormData.newPassword} onChange={(e) => setProfileFormData({ ...profileFormData, newPassword: e.target.value })} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-sm text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Confirmar Autenticação</label>
                    <input type="password" value={profileFormData.confirmPassword} onChange={(e) => setProfileFormData({ ...profileFormData, confirmPassword: e.target.value })} className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 text-sm text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="••••••••" />
                  </div>
                </div>
                <button type="submit" className="bg-orange-600 text-white w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-orange-500 transition-all active:scale-[0.98] mt-4">Sincronizar Atualizações</button>
              </form>
            </div>
          )}

          {activeTab === 'sistema' && currentUser?.role === 'ADMIN' && (
            <div className="max-w-3xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 space-y-10 shadow-2xl animate-in fade-in duration-500">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Variáveis de Sistema</h1>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Parâmetros globais de operação</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-6 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                    <Settings className="w-20 h-20" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <Package className="w-4 h-4 text-orange-600" /> Registro de Instância
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Namespace do Sistema</label>
                      <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all" defaultValue="PINHEIRO DIESEL PRO" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Hardcoded ID (CNPJ)</label>
                      <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-500 font-mono tracking-widest focus:border-orange-600 outline-none transition-all" defaultValue="00.000.000/0001-00" readOnly />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-zinc-950/50 border border-zinc-900 rounded-2xl space-y-6 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                    <AlertTriangle className="w-20 h-20" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-orange-600" /> Protocolos de Segurança
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer group/item text-white">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest mb-1 group-hover/item:text-orange-500 transition-colors">Logs de Auditoria</span>
                        <span className="text-[9px] text-zinc-600 font-mono uppercase">Rastrear cada mutação de dados</span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </div>
                    </label>
                    <label className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer group/item text-white">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest mb-1 group-hover/item:text-orange-500 transition-colors">Redundância Crítica</span>
                        <span className="text-[9px] text-zinc-600 font-mono uppercase">Sincronização em tempo real (Mirroring)</span>
                      </div>
                       <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </div>
                    </label>
                  </div>
                </div>

                <button className="bg-orange-600 text-white w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl hover:bg-orange-500 transition-all active:scale-[0.98] border border-orange-400/20">
                  Efetivar Parametrização Global
                </button>
              </div>
            </div>
          )}

          {activeTab === 'aparencia' && currentUser?.role === 'ADMIN' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Estética de Interface</h1>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Personalização cromática e branding da instância</p>
              </div>

              {/* Cor Principal */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                  <Palette className="w-20 h-20" />
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                   Cromia Estrutural
                </h3>
                <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Defina a cor de ênfase para botões, indicadores de estado e links</p>
                
                <div className="flex flex-wrap gap-4">
                  {[
                    { nome: 'Industrial Laranja', cor: '#F97316' },
                    { nome: 'Cobalto Deep', cor: '#2563EB' },
                    { nome: 'Alerta Carmesim', cor: '#DC2626' },
                    { nome: 'Bosque Esmeralda', cor: '#16A34A' },
                    { nome: 'Nebulosa Violeta', cor: '#7C3AED' },
                    { nome: 'Ambar Solar', cor: '#F59E0B' },
                    { nome: 'Glacial Ciano', cor: '#06B6D4' },
                  ].map(({ nome, cor }) => (
                    <button
                      key={cor}
                      onClick={() => setCorPrincipal(cor)}
                      className="flex items-center gap-3 px-5 py-3 rounded-xl border transition-all active:scale-95 shadow-lg group/btn"
                      style={{
                        borderColor: corPrincipal === cor ? cor : '#18181b',
                        backgroundColor: corPrincipal === cor ? cor + '15' : '#09090b'
                      }}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white/10 shadow-lg" style={{ backgroundColor: cor }} />
                      <span className="text-[10px] font-black uppercase tracking-widest transition-colors" style={{ color: corPrincipal === cor ? cor : '#52525b' }}>
                        {nome}
                      </span>
                      {corPrincipal === cor && <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: cor }} />}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-zinc-900">
                  <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Input Hexadecimal:</span>
                  <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
                    <input 
                      type="color" 
                      value={corPrincipal}
                      onChange={(e) => setCorPrincipal(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent overflow-hidden"
                    />
                    <span className="text-[11px] text-zinc-400 font-mono font-black uppercase tracking-widest">{corPrincipal}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl">
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-900">
                    <Upload className="w-4 h-4 text-orange-600" /> Assinatura Visual (Logo)
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="w-full h-32 bg-zinc-950/80 border border-zinc-900 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner group">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 text-zinc-900" />
                          <span className="text-zinc-800 text-[10px] font-black uppercase tracking-[0.3em]">No Branding Assets</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 px-6 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg">
                        <Upload className="w-4 h-4 text-orange-600" />
                        Injetar Arquivo
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {logoPreview && (
                        <button 
                          onClick={() => { setLogoPreview(''); localStorage.removeItem('logo'); }}
                          className="p-4 bg-red-950/20 border border-red-900/30 text-red-600 rounded-xl hover:bg-red-900/40 transition-colors shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nome do Sistema */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 shadow-2xl flex flex-col">
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-900 mb-6">
                    <Settings className="w-4 h-4 text-orange-600" /> Identificador da Instância
                  </h3>
                  
                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Namespace de Aplicação</label>
                       <input 
                        type="text" 
                        value={nomeSistema}
                        onChange={(e) => setNomeSistema(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl p-5 text-sm text-white focus:border-orange-600 outline-none font-black uppercase tracking-[0.2em] shadow-inner"
                        placeholder="EX: PINHEIRO DIESEL PRO"
                      />
                    </div>
                    <div className="p-4 bg-orange-600/5 border border-orange-600/10 rounded-xl">
                      <p className="text-[9px] text-zinc-500 font-mono uppercase leading-relaxed italic">Este nome será exibido nos componentes de Header e nos metadados de título da janela do navegador.</p>
                    </div>
                  </div>
                </div>
              </div>

               <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-zinc-900">
                  <Palette className="w-4 h-4 text-orange-600" /> Browser Metadata (Favicon)
                </h3>
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-zinc-950/80 border border-zinc-900 rounded-xl flex items-center justify-center overflow-hidden shadow-inner group">
                    {faviconPreview ? (
                      <img src={faviconPreview} alt="Favicon" className="w-8 h-8 object-contain transition-transform group-hover:rotate-12" />
                    ) : (
                      <span className="text-zinc-900 text-[8px] font-black uppercase tracking-widest italic">ICO</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all items-center gap-3 active:scale-95 shadow-lg">
                      <Upload className="w-4 h-4 text-orange-600" />
                      Capturar Recursos de Icone
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFaviconUpload}
                      />
                    </label>
                    <p className="text-[9px] text-zinc-600 font-mono font-black uppercase tracking-widest mt-4">Recomendação: 32x32px .PNG ou .ICO</p>
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <button 
                onClick={handleSalvarAparencia}
                className="w-full py-6 bg-orange-600 hover:bg-orange-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.4em] transition-all shadow-2xl shadow-orange-950/40 flex items-center justify-center gap-4 active:scale-[0.98] border border-orange-400/20"
              >
                <Check className="w-5 h-5" />
                Instanciar Matriz de Estilos
              </button>
            </div>
          )}
        </main>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsUserModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1 h-8 bg-orange-600 rounded-full" />
              <h3 className="text-2xl font-black text-white uppercase tracking-widest">{editingUser ? 'Sincronizar Colaborador' : 'Matricular Operador'}</h3>
            </div>
            
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Pseudônimo / Nome</label>
                  <input type="text" value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="IDENTIFICADOR" required />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Correio Eletrônico</label>
                  <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 font-mono tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="OPERADOR@SISTEMA" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Privilégio Gerencial</label>
                  <select value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner appearance-none cursor-pointer">
                    <option value="ADMIN">ADMINISTRADOR MASTER</option>
                    <option value="LIDER">LIDERANÇA TÉCNICA</option>
                    <option value="MECANICO">OPERADOR MECÂNICO</option>
                    <option value="ESTOQUISTA">GESTÃO DE INVENTÁRIO</option>
                    <option value="FINANCEIRO">CONTROLADORIA</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Password Incial</label>
                  <input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="••••••••" required={!editingUser} />
                </div>
              </div>

              {userFormData.role === 'MECANICO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Vetores Técnicos (Especialidade)</label>
                    <input type="text" value={userFormData.especialidade} onChange={(e) => setUserFormData({ ...userFormData, especialidade: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-black uppercase tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" placeholder="PNEUMÁTICA / MOTOR" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block px-1">Incentivo (%)</label>
                    <input type="number" value={userFormData.comissao} onChange={(e) => setUserFormData({ ...userFormData, comissao: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-black tracking-widest focus:border-orange-600 outline-none transition-all shadow-inner" />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 px-8 py-5 rounded-2xl border border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all font-black text-[10px] uppercase tracking-widest">AbortarOperacao</button>
                <button type="submit" className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-orange-950/40 transition-all active:scale-95 group flex items-center justify-center gap-3">
                  <Check className="w-4 h-4" /> Finalizar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
