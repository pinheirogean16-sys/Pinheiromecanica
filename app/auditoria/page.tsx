'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Loader2, Search, Calendar, 
  Eye, EyeOff, User, ArrowRight,
  Database, RefreshCw, Sparkles, HelpCircle, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { BRANDING } from '@/lib/branding';

export default function AuditoriaPainelPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [filterModulo, setFilterModulo] = useState('TODOS');
  const [filterAcao, setFilterAcao] = useState('TODOS');
  const [usuarioQuery, setUsuarioQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/auditoria?modulo=${filterModulo}&acao=${filterAcao}&usuario=${usuarioQuery}&page=${page}&limit=15`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      } else if (res.status === 403) {
        toast.error('Acesso restrito ao painel de auditoria.');
      } else {
        toast.error('Erro ao carregar registros de auditoria.');
      }
    } catch {
      toast.error('Falha ao conectar com servidor de auditoria.');
    } finally {
      setLoading(false);
    }
  }, [filterModulo, filterAcao, usuarioQuery, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportCSV = () => {
    try {
      if (items.length === 0) {
        toast.error('Sem dados para exportar.');
        return;
      }

      const headers = ['ID', 'Modulo', 'Acao', 'Entidade', 'EntidadeID', 'Usuario', 'Data', 'IP'];
      const rows = items.map((log) => [
        log.id,
        log.modulo,
        log.acao,
        log.entidade,
        log.entidade_id,
        log.usuario,
        log.created_at,
        log.ip || 'Interno',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `auditoria_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Histórico exportado com sucesso!');
    } catch {
      toast.error('Falha ao exportar.');
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden bg-zinc-950 text-white min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-orange-600 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
            <h1 className="text-3xl font-black uppercase tracking-tight italic">Registros de Auditoria & Trilha</h1>
          </div>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-1 ml-5">
            {BRANDING.name} — Security Audit Ledger
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="px-6 py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 transition"
          >
            <Download size={14} /> Exportar Planilha
          </button>
        </div>
      </div>

      {/* STATS HEADERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Total de Lançamentos Rastreados:</p>
            <h3 className="text-3xl font-black font-mono italic text-white mt-1">{total} logs</h3>
          </div>
          <Database className="text-zinc-700" size={28} />
        </div>

        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">SLA Política de Conformidade:</p>
            <h3 className="text-3xl font-black font-mono italic text-green-500 mt-1">90 dias</h3>
          </div>
          <ShieldCheck className="text-zinc-700" size={28} />
        </div>

        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Autenticação Integrada:</p>
            <h3 className="text-3xl font-black font-mono italic text-orange-500 mt-1">RBAC / JWT</h3>
          </div>
          <Sparkles className="text-zinc-700" size={28} />
        </div>
      </div>

      {/* FILTROS DE PESQUISA */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center bg-zinc-900/40 border border-zinc-800 p-4 rounded-3xl">
        <div className="relative group lg:col-span-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input
            type="text"
            placeholder="PROCURAR POR NOME DE EXECUTOR..."
            value={usuarioQuery}
            onChange={(e) => {
              setUsuarioQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-6 text-xs text-white uppercase font-black outline-none focus:border-orange-500 transition placeholder:text-zinc-800"
          />
        </div>

        <select
          value={filterModulo}
          onChange={(e) => {
            setFilterModulo(e.target.value);
            setPage(1);
          }}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-zinc-500 font-black uppercase tracking-wider focus:border-orange-500 cursor-pointer outline-none transition"
        >
          <option value="TODOS">TODOS OS MÓDULOS</option>
          <option value="FINANCEIRO">FINANCEIRO</option>
          <option value="ESTOQUE">ESTOQUE / ALMOXARIFADO</option>
          <option value="OS">ORDENS DE SERVIÇO</option>
          <option value="PECA">PEÇAS</option>
          <option value="CHECKLIST">CHECKLIST TÉCNICO</option>
          <option value="CLIENTES">CLIENTES</option>
          <option value="VEICULOS">VEÍCULOS</option>
          <option value="USUARIOS">USUÁRIOS</option>
          <option value="CONFIG">CONFIGURAÇÕES</option>
        </select>

        <select
          value={filterAcao}
          onChange={(e) => {
            setFilterAcao(e.target.value);
            setPage(1);
          }}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-zinc-500 font-black uppercase tracking-wider focus:border-orange-500 cursor-pointer outline-none transition"
        >
          <option value="TODOS">TODAS AS AÇÕES</option>
          <option value="CRIAR">CRIAR / NOVO</option>
          <option value="CRIAR_AUTO">CRIAR_AUTO / AUTOMÁTICO</option>
          <option value="EDITAR">EDITAR / MODIFICAR</option>
          <option value="EDITAR_PARCIAL">EDITAR_PARCIAL</option>
          <option value="EDITAR_TOTAL">EDITAR_TOTAL</option>
          <option value="EDITAR_PERFIL">EDITAR_PERFIL</option>
          <option value="EXCLUIR">EXCLUIR</option>
          <option value="RESET_PASSWORD">RESET DE SENHA</option>
        </select>
      </div>

      {/* TABELA DE AUDITORIA */}
      <div className="bg-zinc-900/30 border border-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800">
                <th className="p-4 text-left">Fato Gerador</th>
                <th className="p-4 text-left">Módulo</th>
                <th className="p-4 text-left">Ação</th>
                <th className="p-4 text-left">Usuário Executor</th>
                <th className="p-4 text-left">Tabela / ID</th>
                <th className="p-4 text-center">Modificação (Antes/Depois)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-zinc-600">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
                    <p className="uppercase font-black text-[9px] tracking-widest">Sincronizando logs de trilha...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-zinc-700 italic uppercase">
                    Sem registros de auditoria encontrados para este nível de filtro
                  </td>
                </tr>
              ) : (
                items.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-zinc-900/40 transition">
                        <td className="p-4 text-zinc-500 text-[10px]">
                          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '---'}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 font-black tracking-wider text-[9px] text-zinc-400 rounded-lg">
                            {log.modulo}
                          </span>
                        </td>
                        <td className="p-4 font-black">
                          <span className={`px-2 py-0.5 rounded text-[9px] ${
                            log.acao === 'EXCLUIR' ? 'bg-red-500/10 text-red-400' :
                            log.acao === 'CRIAR' || log.acao === 'CRIAR_AUTO' ? 'bg-green-500/10 text-green-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {log.acao}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-white font-black uppercase">
                            <User size={12} className="text-zinc-600" />
                            {log.usuario}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-[10px] text-white font-bold">{log.entidade}</p>
                          <p className="text-[8px] text-zinc-600 max-w-[120px] truncate">{log.entidade_id}</p>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-2 rounded-xl text-zinc-400 hover:text-orange-500 transition inline-flex items-center gap-1.5 text-[9px] font-black uppercase"
                          >
                            {isExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
                            {isExpanded ? 'Esconder Diferencial' : 'Inspecionar Dados JSON'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-950/60 border-t border-zinc-900">
                          <td colSpan={6} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl font-mono text-[9px]">
                              <div className="space-y-2">
                                <p className="font-black text-zinc-500 uppercase tracking-wider border-b border-zinc-900 pb-1">
                                  Estado de Origem (Dados Antes):
                                </p>
                                <pre className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl overflow-x-auto text-zinc-450 leading-relaxed max-h-56">
                                  {log.dados_antes ? JSON.stringify(log.dados_antes, null, 2) : 'NENHUM HISTÓRICO ORIGINAL REGISTRADO'}
                                </pre>
                              </div>

                              <div className="space-y-2">
                                <p className="font-black text-zinc-500 uppercase tracking-wider border-b border-zinc-900 pb-1">
                                  Estado Resultante (Dados Depois):
                                </p>
                                <pre className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl overflow-x-auto text-zinc-400 leading-relaxed max-h-56">
                                  {log.dados_depois ? JSON.stringify(log.dados_depois, null, 2) : 'NENHUM HISTÓRICO ADICIONAL REGISTRADO'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-zinc-900 bg-zinc-950/20">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
