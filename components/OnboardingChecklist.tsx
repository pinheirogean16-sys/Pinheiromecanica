'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X, ChevronRight, Rocket } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function OnboardingChecklist() {
  const [isDismissed, setIsDismissed] = useState(true); // Começa true para não piscar na tela
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState({
    clients: false,
    vehicles: false,
    os: false,
  });

  useEffect(() => {
    // Se o usuário já fechou o checklist alguma vez, não mostra mais
    if (localStorage.getItem('@vehlox:checklist_done')) {
      return;
    }
    setIsDismissed(false);

    const checkProgress = async () => {
      try {
        // Faz 3 requisições super rápidas (limit=1) só para saber se o total é maior que 0
        const [resClientes, resVeiculos, resOrdens] = await Promise.all([
          apiFetch<any>('/api/clientes?limit=1'),
          apiFetch<any>('/api/veiculos?limit=1'),
          apiFetch<any>('/api/ordens?limit=1'),
        ]);

        const hasClients = (resClientes?.total || 0) > 0;
        const hasVehicles = (resVeiculos?.total || 0) > 0;
        const hasOS = (resOrdens?.total || 0) > 0;

        setTasks({
          clients: hasClients,
          vehicles: hasVehicles,
          os: hasOS,
        });

        // Se completou tudo, salva no navegador para não incomodar mais
        if (hasClients && hasVehicles && hasOS) {
          localStorage.setItem('@vehlox:checklist_done', 'true');
        }
      } catch {
        // Silencioso se falhar
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, []);

  const dismissChecklist = () => {
    localStorage.setItem('@vehlox:checklist_done', 'true');
    setIsDismissed(true);
  };

  if (isDismissed || loading) return null;

  const completedCount = Object.values(tasks).filter(Boolean).length;
  const progressPercentage = (completedCount / 3) * 100;
  const isAllDone = completedCount === 3;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-[340px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-500">
      
      {/* CABEÇALHO */}
      <div className="bg-zinc-900 border-b border-zinc-800/80 p-5 relative">
        <button 
          onClick={dismissChecklist}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="Ocultar checklist"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-600/20 text-orange-500 rounded-xl">
            <Rocket className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider italic">
            Primeiros Passos
          </h3>
        </div>
        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
          {isAllDone ? 'Tudo pronto! Você é um expert.' : 'Complete as tarefas para dominar a VEHLOX.'}
        </p>

        {/* BARRA DE PROGRESSO */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-zinc-500 font-mono">{completedCount}/3</span>
        </div>
      </div>

      {/* LISTA DE TAREFAS */}
      <div className="p-2 space-y-1">
        {isAllDone ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Você já cadastrou clientes, veículos e criou sua primeira OS. O sistema é todo seu!
            </p>
            <button 
              onClick={dismissChecklist}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
            >
              Fechar Painel
            </button>
          </div>
        ) : (
          <>
            <Link 
              href="/clientes/novo" 
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl transition-all group",
                tasks.clients ? "opacity-50" : "hover:bg-zinc-900 cursor-pointer"
              )}
            >
              {tasks.clients ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-700 group-hover:text-orange-500" />}
              <div className="flex-1">
                <p className={cn("text-xs font-bold text-white uppercase", tasks.clients && "line-through text-zinc-500")}>
                  Cadastrar Cliente
                </p>
                <p className="text-[9px] text-zinc-500">O ponto de partida de tudo.</p>
              </div>
              {!tasks.clients && <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white" />}
            </Link>

            <Link 
              href="/veiculos/novo" 
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl transition-all group",
                tasks.vehicles ? "opacity-50" : "hover:bg-zinc-900 cursor-pointer"
              )}
            >
              {tasks.vehicles ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-700 group-hover:text-orange-500" />}
              <div className="flex-1">
                <p className={cn("text-xs font-bold text-white uppercase", tasks.vehicles && "line-through text-zinc-500")}>
                  Adicionar Veículo
                </p>
                <p className="text-[9px] text-zinc-500">Vincule o caminhão ao cliente.</p>
              </div>
              {!tasks.vehicles && <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white" />}
            </Link>

            <Link 
              href="/os/nova" 
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl transition-all group",
                tasks.os ? "opacity-50" : "hover:bg-zinc-900 cursor-pointer"
              )}
            >
              {tasks.os ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-700 group-hover:text-orange-500" />}
              <div className="flex-1">
                <p className={cn("text-xs font-bold text-white uppercase", tasks.os && "line-through text-zinc-500")}>
                  Abrir Ordem de Serviço
                </p>
                <p className="text-[9px] text-zinc-500">Crie a OS e adicione peças.</p>
              </div>
              {!tasks.os && <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white" />}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
