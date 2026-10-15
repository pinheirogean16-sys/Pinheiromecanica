'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  Users,
  Truck,
  Package,
  DollarSign,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  ChevronDown,
  Building2,
  PenTool as Tool,
  ShieldAlert,
} from 'lucide-react';

import { checkPermission } from '@/lib/rbac';
import { BRANDING } from '@/lib/branding';

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
  href?: string;
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
    acao: 'visualizar',
  },
  {
    id: 'oficina',
    label: 'OFICINA',
    icon: Tool,
    items: [
      { href: '/os', label: 'Ordens de Serviço', icon: ClipboardList, modulo: 'os', acao: 'visualizar' },
      { href: '/orcamentos', label: 'Orçamentos', icon: FileText, modulo: 'orcamentos', acao: 'visualizar' },
      { href: '/preventivas', label: 'Preventivas', icon: ShieldAlert, modulo: 'preventivas', acao: 'visualizar' },
      { href: '/agenda', label: 'Agenda', icon: Calendar, modulo: 'agenda', acao: 'visualizar' },
      { href: '/checklist', label: 'Checklist', icon: ClipboardCheck, modulo: 'checklist', acao: 'visualizar' },
    ],
  },
  {
    id: 'cadastros',
    label: 'CADASTROS',
    icon: Users,
    items: [
      { href: '/clientes', label: 'Clientes', icon: Users, modulo: 'clientes', acao: 'visualizar' },
      { href: '/fornecedores', label: 'Fornecedores', icon: Truck, modulo: 'fornecedores', acao: 'visualizar' },
      { href: '/veiculos', label: 'Veículos', icon: Truck, modulo: 'veiculos', acao: 'visualizar' },
    ],
  },
  {
    id: 'estoque',
    label: 'ESTOQUE',
    icon: Package,
    items: [
      { href: '/estoque', label: 'Consultar Estoque', icon: Package, modulo: 'estoque', acao: 'visualizar' },
      { href: '/estoque/importar-nfe', label: 'Importar NF-e', icon: FileText, modulo: 'nfe', acao: 'visualizar' },
    ],
  },
  {
    id: 'financeiro',
    label: 'FINANCEIRO',
    icon: DollarSign,
    href: '/financeiro',
    modulo: 'financeiro',
    acao: 'visualizar',
  },
  {
    id: 'configuracoes',
    label: 'CONFIGURAÇÕES',
    icon: Settings,
    items: [
      { href: '/configuracoes', label: 'Empresa', icon: Building2, modulo: 'configuracoes', acao: 'visualizar' },
      { href: '/mecanicos', label: 'Usuários', icon: Users, modulo: 'usuarios', acao: 'visualizar' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/usuario');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        // silencioso
      }
    };
    fetchUser();
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

  useEffect(() => {
    const activeGroup = sidebarGroups.find((group) =>
      group.items?.some((item) => pathname === item.href)
    );
    if (activeGroup) {
      setOpenGroups((prev) => {
        if (prev.includes(activeGroup.id)) return prev;
        return [activeGroup.id];
      });
    }
  }, [pathname]);

  if (pathname === '/login') return null;

  const toggleGroup = (id: string) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
      setOpenGroups([id]);
      return;
    }
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [id]
    );
  };

  const filteredGroups = sidebarGroups
    .map((group) => {
      if (group.href) {
        const hasAccess =
          group.modulo && group.acao
            ? checkPermission(user, group.modulo, group.acao)
            : true;
        return hasAccess ? group : null;
      }

      const accessibleItems = group.items?.filter((item) => {
        return item.modulo && item.acao
          ? checkPermission(user, item.modulo, item.acao)
          : true;
      });

      if (accessibleItems && accessibleItems.length > 0) {
        return { ...group, items: accessibleItems };
      }

      return null;
    })
    .filter(Boolean) as MenuGroup[];

  const getSidebarContent = (isMobileView: boolean) => {
    const collapsed = !isMobileView && isCollapsed;

    return (
      <>
        {/* Cabeçalho com logo VEHLOX */}
        <div
          className={`p-5 border-b flex items-center border-zinc-900 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Image
                  src={BRANDING.logo.url}
                  alt={BRANDING.logo.alt}
                  width={44}
                  height={44}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black text-white uppercase tracking-tight leading-none">
                  {BRANDING.name}
                </h1>
                <p className="text-[9px] text-zinc-600 font-mono font-bold uppercase tracking-widest mt-0.5 truncate">
                  {BRANDING.slogan}
                </p>
              </div>
            </Link>
          )}
          {!collapsed && !isMobileView && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-lg transition-all text-zinc-500 hover:text-white hover:bg-zinc-900"
              aria-label="Recolher menu"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {isMobileView && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg transition-all text-zinc-500 hover:text-white hover:bg-zinc-900"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Botão de expandir quando colapsado */}
        {collapsed && !isMobileView && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="mx-auto mt-3 p-2 rounded-lg transition-all text-zinc-500 hover:text-white hover:bg-zinc-900"
            aria-label="Expandir menu"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Navegação */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            const isGroupOpen = openGroups.includes(group.id);
            const hasActiveChild = group.items?.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + '/')
            );
            const isDirectActive =
              group.href &&
              (pathname === group.href || pathname.startsWith(group.href + '/'));

            if (group.href) {
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  onClick={() => isMobileView && setIsMobileOpen(false)}
                >
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                      text-[11px] font-bold uppercase tracking-wider
                      ${collapsed ? 'justify-center' : ''}
                      ${
                        isDirectActive
                          ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                          : 'text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent'
                      }
                    `}
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
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                    text-[11px] font-bold uppercase tracking-wider cursor-pointer
                    ${
                      hasActiveChild
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{group.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 flex-shrink-0 ${
                          isGroupOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </>
                  )}
                </button>

                {!collapsed && (
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isGroupOpen
                        ? `${(group.items?.length || 0) * 44}px`
                        : '0px',
                      opacity: isGroupOpen ? 1 : 0,
                    }}
                  >
                    <div className="pl-5 space-y-0.5 py-1">
                      {group.items?.map((item) => {
                        const SubIcon = item.icon;
                        const isSubActive =
                          pathname === item.href ||
                          pathname.startsWith(item.href + '/');

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => isMobileView && setIsMobileOpen(false)}
                          >
                            <div
                              className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                                text-[10px] font-semibold uppercase tracking-wider
                                ${
                                  isSubActive
                                    ? 'text-orange-500 bg-orange-500/5 font-bold'
                                    : 'text-zinc-600 hover:text-white hover:bg-zinc-900/50'
                                }
                              `}
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

        {/* Rodapé com usuário */}
        <div
          className={`p-4 border-t border-zinc-900 ${
            collapsed ? 'flex justify-center' : ''
          }`}
        >
          <div
            className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 bg-orange-500">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white uppercase tracking-wide truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-[9px] text-zinc-600 font-mono uppercase truncate tracking-wider mt-0.5">
                  {user?.role || 'Acesso'}
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Botão hambúrguer mobile */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-3 left-4 z-40 p-2.5 rounded-xl lg:hidden shadow-lg transition-colors bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-orange-500"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Drawer mobile */}
      <div
        className={`lg:hidden fixed inset-0 z-50 pointer-events-none transition-all duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 delay-100'
        }`}
      >
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileOpen(false)}
        />
        <aside
          className={`fixed top-0 left-0 h-full w-72 flex flex-col transition-transform duration-300 shadow-2xl bg-zinc-950 border-r border-zinc-900 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {getSidebarContent(true)}
        </aside>
      </div>

      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 bg-zinc-950 border-r border-zinc-900 ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        }`}
      >
        {getSidebarContent(false)}
      </aside>
    </>
  );
}
