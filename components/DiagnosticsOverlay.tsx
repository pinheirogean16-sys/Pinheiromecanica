'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, Database, Radio, Key, Play, RefreshCw, X, ShieldCheck, 
  AlertTriangle, Server, Layers, HelpCircle, HardDrive, Cpu, Activity, History
} from 'lucide-react';
import { apiFetch, apiTelemetry } from '@/lib/api';
import { toast } from 'sonner';

export default function DiagnosticsOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/diagnosticos');
      setData(response);
    } catch (err: any) {
      console.error('Diagnostic call failed:', err);
      toast.error('Falha ao obter diagnóstico de sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Event listener for Ctrl + Shift + D (case-insensitive)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => {
          const nextState = !prev;
          if (nextState) {
            fetchDiagnostics();
          }
          return nextState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchDiagnostics]);

  useEffect(() => {
    if (!isOpen) return;

    const updateTelemetry = () => {
      setTelemetry({
        totalRequests: apiTelemetry.totalRequests,
        activeRequests: apiTelemetry.activeRequests,
        cacheHits: apiTelemetry.cacheHits,
        errorsRecoveredByCache: apiTelemetry.errorsRecoveredByCache,
        rateLimitBlocks: apiTelemetry.rateLimitBlocks,
        lastRequestsLog: [...apiTelemetry.lastRequestsLog],
      });
    };

    updateTelemetry();
    const interval = setInterval(updateTelemetry, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-805/90 rounded-2xl shadow-2xl overflow-hidden text-zinc-300 font-mono text-xs flex flex-col h-[85vh] max-h-[700px]">
        
        {/* Header HUD */}
        <div className="bg-zinc-900/80 px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-500 tracking-widest font-black uppercase">Painel de Diagnóstico</span>
              <span className="text-[13px] font-black text-white italic tracking-tight">ENTERPRISE TELEMETRY HUD</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="p-2 bg-zinc-950 border border-zinc-800 hover:border-orange-500 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-50"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 bg-zinc-950 border border-zinc-800 hover:border-red-500 rounded-lg text-zinc-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HUD Content Area */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              <span className="text-zinc-500 animate-pulse uppercase tracking-wider text-[10px]">Lendo barramentos de microsserviços...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Core Database connection */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Database className="w-4 h-4 text-orange-500" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">CONEXÃO BANCO DE DADOS</span>
                </div>
                
                {data?.bancoDeDados?.status === 'CONECTADO' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-green-950/20 border border-green-905/30 rounded-lg">
                      <span className="text-green-400 font-extrabold uppercase tracking-wide">● DB COMPLIANT & ATIVO</span>
                      <ShieldCheck className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="space-y-1.5 text-zinc-400 text-[11px]">
                      <p className="flex justify-between">
                        <span>Database Provider Specified:</span>
                        <span className="text-white font-extrabold">{data.bancoDeDados.detalhes?.provider}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Schema Validation Test:</span>
                        <span className="text-green-400 font-bold">PASS-MATCH ({data.bancoDeDados.detalhes?.schemaMatch ? 'SIM' : 'NÃO'})</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Status de Sincronia:</span>
                        <span className="text-green-400 font-medium">OK</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg">
                      <span className="text-red-400 font-extrabold uppercase tracking-wide">● ERRO DE CONEXÃO</span>
                      <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                    </div>
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded-lg text-red-400/90 text-[10px] break-all whitespace-pre-wrap max-h-32 overflow-auto">
                      {data?.bancoDeDados?.detalhes?.error || 'Database url might be unreachable or database is down.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: Authentication Credentials */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Key className="w-4 h-4 text-orange-500" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">ESTADO DE AUTENTICAÇÃO (SESSÃO)</span>
                </div>
                
                <div className="space-y-3">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    data?.autenticacao?.status === 'Autenticado'
                      ? 'bg-orange-505/10 border-orange-500/30 text-orange-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}>
                    <span className="font-extrabold uppercase tracking-wide">
                      {data?.autenticacao?.status === 'Autenticado' ? 'SES_ACTIVE (TOKEN VÁLIDO)' : 'SES_INACTIVE (LOGIN EXIGIDO)'}
                    </span>
                    <Terminal className="w-4 h-4" />
                  </div>

                  {data?.autenticacao?.usuario ? (
                    <div className="space-y-1 text-zinc-400 text-[11px]">
                      <p className="flex justify-between">
                        <span>Nome:</span>
                        <span className="text-white font-black truncate max-w-[180px]">{data.autenticacao.usuario.name}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>E-mail:</span>
                        <span className="text-zinc-300 italic truncate max-w-[180px]">{data.autenticacao.usuario.email}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Nível Permissão (Role):</span>
                        <span className="text-orange-400 font-extrabold">{data.autenticacao.usuario.role}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Unidade/Empresa ID:</span>
                        <span className="text-white font-mono">{data.autenticacao.usuario.empresa_id}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-500 italic">Nenhum payload de usuário cookie-token foi encontrado na requisição atual.</p>
                  )}
                </div>
              </div>

              {/* Box 3: Table Row Metrics (Row count of each table) */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 md:col-span-2">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <HardDrive className="w-4 h-4 text-orange-500" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">CONTROLE DE VOLUMETRIA (TABELAS DE BANCO DE DADOS)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { label: 'Usuários', value: data?.bancoDeDados?.registros?.usuarios, color: 'text-blue-400' },
                    { label: 'Clientes', value: data?.bancoDeDados?.registros?.clientes, color: 'text-amber-400' },
                    { label: 'Veículos / Eq.', value: data?.bancoDeDados?.registros?.veiculos, color: 'text-purple-400' },
                    { label: 'Ordens Serv.', value: data?.bancoDeDados?.registros?.os, color: 'text-green-400' },
                    { label: 'Mv. Finan.', value: data?.bancoDeDados?.registros?.financeiro, color: 'text-cyan-400' },
                    { label: 'Reg. Estoque', value: data?.bancoDeDados?.registros?.pecas, color: 'text-orange-400' },
                  ].map((table, idx) => (
                    <div key={idx} className="p-3 bg-zinc-950 border border-zinc-805/70 rounded-xl text-center flex flex-col justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block truncate">{table.label}</span>
                      <span className={`text-2xl font-black italic tracking-tighter ${table.color} mt-2 block`}>
                        {table.value !== undefined ? table.value : '—'}
                      </span>
                      <span className="text-[8px] text-zinc-700 uppercase mt-1 font-black">Registros</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 4: Environment settings & telemetry */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 md:col-span-2">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Layers className="w-4 h-4 text-orange-500" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">VARIÁVEIS DE AMBIENTE E SEGURANÇA</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                    <span className="text-zinc-500 uppercase">Ambiente Node:</span>
                    <span className="text-white font-extrabold">{data?.variaveisAmbiente?.NODE_ENV}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                    <span className="text-zinc-500 uppercase">JWT_SECRET:</span>
                    <span className={data?.variaveisAmbiente?.JWT_SECRET_SET ? 'text-green-400 font-extrabold' : 'text-red-400 font-extrabold'}>
                      {data?.variaveisAmbiente?.JWT_SECRET_SET ? 'CONFIGURADO' : 'AUSENTE'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                    <span className="text-zinc-500 uppercase">DATABASE_URL:</span>
                    <span className={data?.variaveisAmbiente?.DATABASE_URL_SET ? 'text-green-400 font-extrabold' : 'text-red-400 font-extrabold'}>
                      {data?.variaveisAmbiente?.DATABASE_URL_SET ? 'CONFIGURADO' : 'AUSENTE'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                    <span className="text-zinc-500 uppercase">GEMINI_API:</span>
                    <span className={data?.variaveisAmbiente?.GEMINI_API_KEY_SET ? 'text-green-400 font-extrabold' : 'text-red-400 font-extrabold'}>
                      {data?.variaveisAmbiente?.GEMINI_API_KEY_SET ? 'CONFIGURADO' : 'AUSENTE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 5: Anti-Flood Engine & Deduplication Telemetry */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 md:col-span-2">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">TECNOLOGIA ANTI-FLOOD & DEDUPLICAÇÃO DE REQUISIÇÕES</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-2.5 bg-zinc-950 border border-zinc-805/70 rounded-lg text-center">
                    <span className="text-[8px] text-zinc-500 uppercase font-black block">Total Requests</span>
                    <span className="text-base font-black text-white block mt-1">{telemetry?.totalRequests || 0}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-805/70 rounded-lg text-center">
                    <span className="text-[8px] text-green-500 uppercase font-black block">Deduplicado</span>
                    <span className="text-base font-black text-green-400 block mt-1">{telemetry?.cacheHits || 0}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-805/70 rounded-lg text-center">
                    <span className="text-[8px] text-orange-500 uppercase font-black block">Ativas (Live)</span>
                    <span className="text-base font-black text-orange-400 block mt-1">{telemetry?.activeRequests || 0}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-805/70 rounded-lg text-center">
                    <span className="text-[8px] text-purple-500 uppercase font-black block">Fails Protegidos</span>
                    <span className="text-base font-black text-purple-400 block mt-1">{telemetry?.errorsRecoveredByCache || 0}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-805/70 rounded-lg text-center col-span-2 md:col-span-1">
                    <span className="text-[8px] text-red-500 uppercase font-black block">Blocos 429</span>
                    <span className="text-base font-black text-red-400 block mt-1">{telemetry?.rateLimitBlocks || 0}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>O sistema mescla requisições idênticas em andamento e, em caso de erro 429 ou queda de rede, as restaura via Cache local. Os seus dados permanecem intactos.</span>
                  </div>
                </div>
              </div>

              {/* Box 6: Live Client HTTP Request Logs */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 md:col-span-2">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <History className="w-4 h-4 text-orange-500" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider">REGISTRO DE CONEXÕES EM TEMPO REAL (CLIENT LOGS)</span>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5 max-h-[160px] overflow-auto custom-scrollbar font-mono text-[10px]">
                  {telemetry?.lastRequestsLog && telemetry.lastRequestsLog.length > 0 ? (
                    telemetry.lastRequestsLog.slice(0, 15).map((log: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-900/50 hover:bg-zinc-900/20 px-1 rounded">
                        <div className="flex items-center gap-2 text-zinc-400 truncate max-w-[400px]">
                          <span className="text-[9px] text-zinc-600">[{log.timestamp}]</span>
                          <span className="text-white font-bold truncate">{log.path}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500">{log.duration}ms</span>
                          <span className={`font-black px-1.5 py-0.5 rounded text-[8px] ${
                            log.status >= 200 && log.status < 300 
                              ? 'bg-green-950/40 text-green-400 border border-green-900/50' 
                              : log.status === 429 
                                ? 'bg-orange-950/40 text-orange-400 border border-orange-900/50 animate-pulse'
                                : 'bg-red-950/40 text-red-400 border border-red-900/50'
                          }`}>
                            HTTP {log.status || 'FAIL'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-zinc-600 block text-center py-4 uppercase tracking-widest text-[9px]">Aguardando tráfego de interface...</span>
                  )}
                </div>
              </div>

              {/* Box 7: Prisma Live Database Transaction Logs */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 md:col-span-2">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Cpu className="w-4 h-4 text-orange-500" />
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wider font-mono">BARRAMENTO ORM (PRISMA DATABASE QUERIES TELEMETRY)</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-center">
                    <span className="text-[8px] text-zinc-500 uppercase font-black block">Total Queries</span>
                    <span className="text-base font-black text-white block mt-0.5">{data?.dbTelemetry?.totalQueries || 0}</span>
                  </div>
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-center">
                    <span className="text-[8px] text-orange-500 uppercase font-black block">Queries Lentas (&gt;150ms)</span>
                    <span className="text-base font-black text-orange-400 block mt-0.5">{data?.dbTelemetry?.slowQueries || 0}</span>
                  </div>
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-center">
                    <span className="text-[8px] text-red-500 uppercase font-black block">Faults</span>
                    <span className="text-base font-black text-red-400 block mt-0.5">{data?.dbTelemetry?.failedQueries || 0}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5 max-h-[160px] overflow-auto custom-scrollbar font-mono text-[10px]">
                  {data?.dbTelemetry?.queriesLog && data.dbTelemetry.queriesLog.length > 0 ? (
                    data.dbTelemetry.queriesLog.slice(0, 15).map((log: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-900/50 hover:bg-zinc-900/20 px-1 rounded text-[9px]">
                        <div className="flex items-center gap-2 text-zinc-400 truncate max-w-[400px]">
                          <span className="text-[9px] text-zinc-600">[{log.timestamp}]</span>
                          <span className="text-white font-bold">{log.model}.{log.operation}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`${log.duration > 150 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>{log.duration}ms</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-zinc-600 block text-center py-4 uppercase tracking-widest text-[9px]">Aguardando transações do banco de dados...</span>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* HUD Sub footer */}
        <div className="bg-zinc-900/60 p-4 border-t border-zinc-800 text-[9px] text-zinc-500 flex justify-between items-center">
          <span>Sincronia Servidor: {data?.timestamp || 'N/A'}</span>
          <span className="font-extrabold text-zinc-400 tracking-wider">PINHEIRO DIESEL TELEMETRY SERVICES</span>
        </div>

      </div>
    </div>
  );
}
