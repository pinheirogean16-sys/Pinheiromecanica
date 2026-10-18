'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Search, Link as LinkIcon, ClipboardCheck, 
  ChevronRight, Loader2, AlertCircle, FileText, CheckCircle2,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Checklist {
  id: string;
  nome: string;
  categoria: string;
  ativo: boolean;
  itens: any[];
  _count?: {
    execucoes: number;
  };
}

interface OS {
  id: string;
  numero: number;
  status: string;
  cliente: { nome: string };
  veiculo: { placa: string; modelo: string };
}

export default function ExecutarChecklistPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOS, setSelectedOS] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [checkRes, osRes] = await Promise.all([
        fetch('/api/checklist', { credentials: 'include' }),
        fetch('/api/ordens?status=ABERTA&limit=50', { credentials: 'include' })
      ]);

      if (checkRes.ok) {
        const data = await checkRes.json();
        setChecklists(Array.isArray(data) ? data.filter((c: any) => c.ativo) : []);
      }

      if (osRes.ok) {
        const data = await osRes.json();
        setOrdens(data.items || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sincronizar dados operacionais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (active) {
        await fetchData();
      }
    };
    loadData();
    return () => { active = false; };
  }, [fetchData]);

  const filteredChecklists = useMemo(() => {
    return checklists.filter(c => 
      c.nome.toLowerCase().includes(search.toLowerCase()) || 
      c.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [checklists, search]);

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-orange-600 rounded-full" />
             <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">EXECUÇÃO DE CHECKLIST</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] leading-none ml-5">SELECIONE UM PROTOCOLO PARA INICIAR A INSPEÇÃO</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* BUSCA E LISTA DE CHECKLISTS */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="BUSCAR PROTOCOLO POR NOME..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-16 pr-6 text-xs text-white outline-none focus:border-orange-500 transition shadow-inner font-black uppercase tracking-widest placeholder:text-zinc-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] animate-pulse" />
              ))
            ) : filteredChecklists.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-60">
                 <AlertCircle size={48} className="mb-4 text-zinc-600" />
                 <p className="font-black uppercase tracking-widest text-xs italic text-zinc-500">Nenhum protocolo ativo disponível</p>
                 <Link href="/checklist/novo" className="mt-4 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:underline">
                   Criar novo checklist
                 </Link>
              </div>
            ) : filteredChecklists.map((checklist) => (
              <div 
                key={checklist.id}
                className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] hover:border-orange-500/50 transition-all group flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight group-hover:text-orange-500 transition-colors">
                      {checklist.nome}
                    </h3>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-0.5 italic">
                      {checklist.itens?.length || 0} PROCEDIMENTOS TÉCNICOS
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500">
                    <ClipboardCheck size={18} />
                  </div>
                </div>

                <Link 
                  href={`/checklist/executar/${checklist.id}${selectedOS ? `?osId=${selectedOS}` : ''}`}
                  className="flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest italic"
                >
                  <Play size={14} fill="currentColor" />
                  INICIAR AGORA
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* VINCULAR OS (SIDEBAR) */}
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center gap-3 relative">
               <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
               <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Opcional: Vincular OS</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-relaxed">
                SELECIONE UMA ORDEM DE SERVIÇO ABERTA PARA VINCULAR ESTA EXECUÇÃO.
              </p>
              
              <div className="relative group">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                <select 
                  value={selectedOS}
                  onChange={(e) => setSelectedOS(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-10 text-[10px] text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest appearance-none cursor-pointer"
                >
                  <option value="">NENHUMA VINCULADA</option>
                  {ordens.map((os) => (
                    <option key={os.id} value={os.id}>
                      OS #{os.numero} - {os.cliente?.nome} ({os.veiculo?.placa})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>

              {selectedOS && (
                <div className="bg-zinc-950 border border-green-600/20 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="p-2 bg-green-600/10 rounded-lg text-green-500">
                      <CheckCircle2 size={16} />
                   </div>
                   <div className="flex-1">
                      <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">OS SELECIONADA</p>
                      <p className="text-[10px] text-white font-black uppercase italic tracking-tighter">#{ordens.find(o => o.id === selectedOS)?.numero}</p>
                   </div>
                   <button 
                    onClick={() => setSelectedOS('')}
                    className="text-[10px] text-zinc-500 hover:text-red-500 font-black uppercase tracking-widest italic transition"
                   >
                    remover
                   </button>
                </div>
              )}
            </div>
          </section>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] text-center border-dashed leading-relaxed">
            Checklists inativos não aparecem nesta listagem. Vá em <Link href="/checklist" className="text-orange-500 hover:underline">Gerenciar</Link> para ativar.
          </div>
        </div>
      </div>
    </div>
  );
}
