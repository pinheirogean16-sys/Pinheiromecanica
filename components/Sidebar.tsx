'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ClipboardList, ClipboardCheck, Users, Truck, 
  Package, DollarSign, Settings, Menu, X,
  ChevronLeft, ChevronRight, Calendar, FileText, ChevronDown,
  Building2, Palette, PenTool as Tool
} from 'lucide-react';

import { checkPermission } from '@/lib/rbac';
import { useAuth } from '@/components/AuthProvider';

interface MenuItem {
  href: string;
  label: string;
  icon: any;
  modulo?: string;
  acao?: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: any;
  href?: string; // For direct links
  items?: MenuItem[];
  modulo?: string;
  acao?: string;
}

const sidebarGroups: MenuGroup[] = [
  {
    id: 'dashboard',
    label: 'DASHBOARD',
    icon: LayoutDashboard,
    href: '/dashboard',
    modulo: 'dashboard',
    acao: 'visualizar'
  },
  {
    id: 'oficina',
    label: 'OFICINA',
    icon: Tool,
    items: [
      { href: '/os', label: 'Ordens de Serviço', icon: ClipboardList, modulo: 'os', acao: 'visualizar' },
      { href: '/orcamentos', label: 'Orçamentos', icon: FileText, modulo: 'orcamentos', acao: 'visualizar' },
      { href: '/agenda', label: 'Agenda', icon: Calendar, modulo: 'agenda', acao: 'visualizar' },
      { href: '/checklist', label: 'Checklist', icon: ClipboardCheck, modulo: 'checklist', acao: 'visualizar' },
    ]
  },
  {
    id: 'cadastros',
    label: 'CADASTROS',
    icon: Users,
    items: [
      { href: '/clientes', label: 'Clientes', icon: Users, modulo: 'clientes', acao: 'visualizar' },
      { href: '/fornecedores', label: 'Fornecedores', icon: Truck, modulo: 'fornecedores', acao: 'visualizar' },
      { href: '/veiculos', label: 'Veículos', icon: Truck, modulo: 'veiculos', acao: 'visualizar' },
    ]
  },
  {
    id: 'estoque',
    label: 'ESTOQUE',
    icon: Package,
    items: [
      { href: '/estoque', label: 'Consultar Estoque', icon: Package, modulo: 'estoque', acao: 'visualizar' },
      { href: '/estoque/importar-nfe', label: 'Importar NF-e', icon: FileText, modulo: 'nfe', acao: 'visualizar' },
    ]
  },
  {
    id: 'financeiro',
    label: 'FINANCEIRO',
    icon: DollarSign,
    href: '/financeiro',
    modulo: 'financeiro',
    acao: 'visualizar'
  },
  {
    id: 'configuracoes',
    label: 'CONFIGURAÇÕES',
    icon: Settings,
    items: [
      { href: '/configuracoes', label: 'Empresa', icon: Building2, modulo: 'configuracoes', acao: 'visualizar' },
      { href: '/mecanicos', label: 'Usuários', icon: Users, modulo: 'usuarios', acao: 'visualizar' },
      { href: '/configuracoes', label: 'Aparência', icon: Palette, modulo: 'configuracoes', acao: 'visualizar' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const { user } = useAuth();
  const [logo, setLogo] = useState<string | null>(null);
  const [nomeSistema, setNomeSistema] = useState('Pinheiro Diesel');
  
  const [corPrincipal, setCorPrincipal] = useState('#F97316');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        setCorPrincipal(localStorage.getItem('corPrincipal') || '#F97316');
        setLogo(localStorage.getItem('logo'));
        setNomeSistema(localStorage.getItem('nomeSistema') || 'Pinheiro Diesel');
      }, 0);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize open groups based on current pathname
  useEffect(() => {
    const activeGroup = sidebarGroups.find(group => 
      group.items?.some(item => pathname === item.href)
    );
    if (activeGroup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenGroups(prev => {
        if (prev.includes(activeGroup.id)) return prev;
        return [activeGroup.id]; // Only keep the active group open on navigation
      });
    }
  }, [pathname]);

  if (pathname === '/login') return null;

  const handleMobileNavigation = () => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const toggleGroup = (id: string) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
      setOpenGroups([id]);
      return;
    }
    setOpenGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [id] // Opens only 1 at a time as per "Apenas 1 grupo aberto por vez (ou manter múltiplos abertos, você escolhe)"
    );
  };

  // Filter groups and items based on user role
  const filteredGroups = sidebarGroups.map(group => {
    // If group is a direct link
    if (group.href) {
      const hasAccess = group.modulo && group.acao 
        ? checkPermission(user, group.modulo, group.acao)
        : true;
      return hasAccess ? group : null;
    }

    // If group has sub-items
    const accessibleItems = group.items?.filter(item => {
      return item.modulo && item.acao 
        ? checkPermission(user, item.modulo, item.acao)
        : true;
    });

    if (accessibleItems && accessibleItems.length > 0) {
      return { ...group, items: accessibleItems };
    }

    return null;
  }).filter(Boolean) as MenuGroup[];

  const getSidebarContent = (isMobileView: boolean) => {
    const collapsed = !isMobileView && isCollapsed;
    return (
      <>
        {/* Cabeçalho */}
        <div className={`p-6 border-b border-zinc-900 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              {logo && (
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="h-10 w-10 rounded-xl object-contain bg-zinc-900 p-2 flex-shrink-0 border border-zinc-800" 
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white uppercase tracking-widest leading-tight truncate">
                  {nomeSistema.toUpperCase()}
                </h1>
                <p className="text-[9px] text-zinc-600 font-mono font-black uppercase tracking-widest truncate">SISTEMA ERP v1.0</p>
              </div>
            </div>
          )}
          {!isMobileView && (
            <button
              onClick={() => setIsCollapsed(!collapsed)}
              className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all text-zinc-600 hover:text-white border border-transparent hover:border-zinc-800 cursor-pointer"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
          {isMobileView && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all text-zinc-600 hover:text-white border border-transparent hover:border-zinc-800 cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            const isGroupOpen = openGroups.includes(group.id);
            const hasActiveChild = group.items?.some(item => pathname === item.href);
            const isDirectActive = group.href && pathname === group.href;

            if (group.href) {
              return (
                <Link key={group.id} href={group.href} onClick={() => isMobileView && setIsMobileOpen(false)}>
                  <div 
                    style={isDirectActive ? { 
                      backgroundColor: corPrincipal + '10', 
                      borderColor: corPrincipal + '20',
                      color: corPrincipal 
                    } : { 
                      color: '#52525b' 
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[10px] font-black hover:text-white hover:bg-zinc-900 border border-transparent uppercase tracking-[0.2em] shadow-inner ${
                      collapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{group.label}</span>}
                  </div>
                </Link>
              );
            }

            return (
              <div key={group.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (collapsed) {
                      setIsCollapsed(false);
                      setOpenGroups([group.id]);
                    } else {
                      setOpenGroups(prev => prev.includes(group.id) ? prev.filter(g => g !== group.id) : [group.id]);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[10px] font-black border border-transparent uppercase tracking-[0.2em] cursor-pointer ${
                    hasActiveChild ? 'text-white bg-zinc-900 shadow-inner border-zinc-800/50' : 'text-zinc-600 hover:text-white hover:bg-zinc-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{group.label}</span>
                      <ChevronDown 
                        size={14} 
                        className={`transition-transform duration-300 flex-shrink-0 ${isGroupOpen ? 'rotate-180' : 'rotate-0'}`} 
                      />
                    </>
                  )}
                </button>

                {/* Submenu */}
                {!collapsed && (
                  <div 
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: isGroupOpen ? `${(group.items?.length || 0) * 44}px` : '0px',
                      opacity: isGroupOpen ? 1 : 0
                    }}
                  >
                    <div className="pl-6 space-y-1 py-2">
                      {group.items?.map((item) => {
                        const SubIcon = item.icon;
                        const isSubActive = pathname === item.href;

                        return (
                          <Link 
                            key={item.href} 
                            href={item.href} 
                            onClick={() => isMobileView && setIsMobileOpen(false)}
                          >
                            <div 
                              style={isSubActive ? { 
                                color: corPrincipal 
                              } : { 
                                color: '#3f3f46' 
                              }}
                              className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-[9px] font-black hover:text-white hover:bg-zinc-900/50 uppercase tracking-[0.15em] ${
                                isSubActive ? 'bg-zinc-900 font-bold' : ''
                              }`}
                            >
                              <SubIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className={`p-6 border-t border-zinc-900 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div 
              style={{ backgroundColor: corPrincipal }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg shadow-black/40 rotate-3 group-hover:rotate-0 transition-transform"
            >
              {user?.name?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{user?.name || 'Usuário'}</p>
                <p className="text-[9px] text-zinc-600 font-mono uppercase truncate tracking-widest mt-0.5">{user?.role || 'Acesso'}</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Botão de Menu para Celulares (visível apenas abaixo de lg) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-3 left-4 z-40 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white lg:hidden shadow-lg cursor-pointer"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Drawer de Navegação do Celular */}
      <div className={`lg:hidden fixed inset-0 z-50 pointer-events-none transition-all duration-300 ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 delay-100'}`}>
        <div
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileOpen(false)}
        />
        <aside
          className={`fixed top-0 left-0 h-full w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col transition-transform duration-300 shadow-2xl ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {getSidebarContent(true)}
        </aside>
      </div>

      {/* Sidebar Desktop (visível apenas do lg para cima) */}
      <aside
        className={`hidden lg:flex flex-col bg-zinc-950 border-r border-zinc-900 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        }`}
      >
        {getSidebarContent(false)}
      </aside>
    </>
  );
}
