'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, Save, Car, User, 
  Search, Check, PenTool as Tool, Calendar, Activity, Loader2, Wrench
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { maskPlaca } from '@/lib/masks';

const veiculoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um proprietário'),
  placa: z.string().min(7, 'Placa inválida').max(8),
  modelo: z.string().min(2, 'Modelo obrigatório'),
  marca: z.string().min(2, 'Marca obrigatória'),
  ano: z.string(),
  cor: z.string().min(1, 'Cor obrigatória'),
  chassi: z.string().optional(),
  quilometragem: z.string().optional(),
  horimetro_atual: z.string().optional(),
  tipo: z.enum([
    'CAVALO_MECANICO', 
    'CARRETA', 
    'ONIBUS', 
    'UTILITARIO', 
    'CAMINHAO_LEVE',
    'CAMINHAO_PESADO',
    'CAMINHONETE',
    'VAN',
    'RETROESCAVADEIRA',
    'ESCAVADEIRA_HIDRAULICA',
    'PA_CARREGADEIRA',
    'MOTONIVELADORA',
    'TRATOR_ESTEIRA',
    'ROLO_COMPACTADOR',
    'VIBROACABADORA',
    'FRESADORA',
    'USINA_ASFALTO',
    'EMPILHADEIRA',
    'GUINDASTE',
    'PERFURATRIZ',
    'TRATOR_AGRICOLA',
    'CAMINHAO_PIPA',
    'CAMINHAO_MUNCK',
    'EQUIPAMENTO_ASFALTO',
    'OUTROS'
  ]),
});

const EQUIPAMENTOS = [
  'RETROESCAVADEIRA',
  'ESCAVADEIRA_HIDRAULICA',
  'PA_CARREGADEIRA',
  'MOTONIVELADORA',
  'ROLO_COMPACTADOR',
  'TRATOR_ESTEIRA',
  'VIBROACABADORA',
  'FRESADORA',
  'USINA_ASFALTO',
  'EMPILHADEIRA',
  'GUINDASTE',
  'PERFURATRIZ',
  'TRATOR_AGRICOLA',
  'CAMINHAO_PIPA',
  'CAMINHAO_MUNCK',
  'EQUIPAMENTO_ASFALTO'
];

type VeiculoFormData = z.infer<typeof veiculoSchema>;

function NovoVeiculoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      tipo: 'CAVALO_MECANICO',
      cliente_id: searchParams.get('cliente_id') || '',
    }
  });

  const cliente_id = watch('cliente_id');
  const placaValue = watch('placa');
  const tipoSelecionado = watch('tipo');
  const isEquipamento = EQUIPAMENTOS.includes(tipoSelecionado || '');

  useEffect(() => {
    fetch('/api/clientes', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : (data.items || []);
        setClientes(lista);
      })
      .catch(() => setClientes([]));
  }, []);

  const onSubmit = async (data: VeiculoFormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/veiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        toast.success('Veículo vinculado com sucesso!');
        router.push('/veiculos');
      } else {
        toast.error(result.error || 'Erro ao vincular veículo');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleNovaOSWarning = () => {
    toast.error('Salve o cadastro do veículo primeiro para poder abrir uma OS!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-6 overflow-hidden">
      <div className="flex items-center gap-4">
        <Link href="/veiculos" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer">
          <ChevronLeft size={20} />
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">Vincular Novo Ativo</h1>
          <p className="text-[10px] text-zinc-650 font-black uppercase tracking-[0.3em]">Cadastro Técnico de Frota</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Proprietário */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden group">
          <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6">
            <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl"><User size={20} /></div>
            <div>
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Proprietário do Veículo</h2>
              <p className="text-[10px] text-zinc-655 font-black uppercase tracking-widest">Vincular dossiê de cliente</p>
            </div>
          </div>
          <div className="relative">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 mb-3 block italic">Vincular Ativo ao Cliente</label>
            <select 
              value={cliente_id} 
              onChange={e => setValue('cliente_id', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl p-4 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-wider shadow-inner appearance-none cursor-pointer min-h-[44px]"
            >
              <option value="">Selecionar cliente...</option>
              {clientes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome} ({c.cpf_cnpj})</option>
              ))}
            </select>
            {errors.cliente_id && <p className="text-[9px] text-red-500 font-black mt-2 uppercase tracking-widest italic">{errors.cliente_id.message}</p>}
          </div>
        </section>

        {/* Especificações Técnicas */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-10">
          <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6">
            <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl"><Tool size={20} /></div>
            <div>
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Especificações Técnicas</h2>
              <p className="text-[10px] text-zinc-655 font-black uppercase tracking-widest">Dados do veículo e motorização</p>
            </div>
          </div>
          
          {/* Responsive form fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Placa */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">Placa de Identificação</label>
              <input 
                {...register('placa')} 
                onChange={(e) => setValue('placa', maskPlaca(e.target.value))} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xl text-center text-white focus:border-orange-500 outline-none transition font-mono font-black tracking-[0.2em] uppercase shadow-lg border-b-4 border-b-zinc-800 active:border-b-0 min-h-[44px]" 
                placeholder="PLACA" 
                value={placaValue || ''} 
              />
              {errors.placa && <p className="text-[9px] text-red-500 font-black uppercase italic">{errors.placa.message}</p>}
            </div>

            {/* Marca */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1">Fabricante / Marca</label>
              <input 
                {...register('marca')} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black min-h-[44px]" 
                placeholder="EX: SCANIA, VOLVO..." 
              />
              {errors.marca && <p className="text-[9px] text-red-500 font-black uppercase">{errors.marca.message}</p>}
            </div>

            {/* Modelo */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1">Modelo Comercial</label>
              <input 
                {...register('modelo')} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black min-h-[44px]" 
                placeholder="EX: R440, FH460..." 
              />
              {errors.modelo && <p className="text-[9px] text-red-500 font-black uppercase">{errors.modelo.message}</p>}
            </div>

            {/* Ano */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 flex items-center gap-2"><Calendar size={12} /> Ano Fabricação</label>
              <input 
                type="number" 
                {...register('ano')} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner min-h-[44px]" 
                placeholder="YYYY" 
              />
              {errors.ano && <p className="text-[9px] text-red-500 font-black uppercase">{errors.ano.message}</p>}
            </div>

            {/* Cor */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 flex items-center gap-2"><Activity size={12} /> Cor Predominante</label>
              <input 
                type="text" 
                {...register('cor')} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition font-black uppercase shadow-inner min-h-[44px]" 
                placeholder="BRANCO, PRETO..." 
              />
              {errors.cor && <p className="text-[9px] text-red-500 font-black uppercase">{errors.cor.message}</p>}
            </div>
            
            {/* KM / Horímetro */}
            {!isEquipamento ? (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 flex items-center gap-2">
                  <Activity size={12} /> Quilometragem (KM)
                </label>
                <input 
                  type="number" 
                  {...register('quilometragem')} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner min-h-[44px]" 
                  placeholder="000.000" 
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 flex items-center gap-2">
                  <Activity size={12} /> Horímetro Atual (Horas)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  {...register('horimetro_atual')} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner min-h-[44px]" 
                  placeholder="Ex: 1250.5" 
                />
              </div>
            )}

            {/* Categoria Técnica */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">Categoria Técnica</label>
              <div className="relative">                      
                <select 
                  {...register('tipo')} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-[10px] text-white focus:border-orange-500 outline-none transition font-black uppercase tracking-widest appearance-none cursor-pointer min-h-[44px]"
                >
                  <optgroup label="TRANSPORTE">
                    <option value="CAVALO_MECANICO">CAVALO MECÂNICO</option>
                    <option value="CAMINHAO_PESADO">CAMINHÃO PESADO</option>
                    <option value="CAMINHAO_LEVE">CAMINHÃO LEVE</option>
                    <option value="CAMINHONETE">CAMINHONETE</option>
                    <option value="VAN">VAN</option>
                    <option value="ONIBUS">ÔNIBUS</option>
                    <option value="CARRETA">CARRETA</option>
                    <option value="UTILITARIO">UTILITÁRIO</option>
                  </optgroup>
                  <optgroup label="EQUIPAMENTOS">
                    <option value="RETROESCAVADEIRA">RETROESCAVADEIRA</option>
                    <option value="ESCAVADEIRA_HIDRAULICA">ESCAVADEIRA HIDRÁULICA</option>
                    <option value="PA_CARREGADEIRA">PÁ CARREGADEIRA</option>
                    <option value="MOTONIVELADORA">MOTONIVELADORA</option>
                    <option value="ROLO_COMPACTADOR">ROLO COMPACTADOR</option>
                    <option value="TRATOR_ESTEIRA">TRATOR ESTEIRA</option>
                    <option value="VIBROACABADORA">VIBROACABADORA</option>
                    <option value="FRESADORA">FRESADORA</option>
                    <option value="USINA_ASFALTO">USINA DE ASFALTO</option>
                    <option value="EMPILHADEIRA">EMPILHADEIRA</option>
                    <option value="GUINDASTE">GUINDASTE</option>
                    <option value="PERFURATRIZ">PERFURATRIZ</option>
                    <option value="TRATOR_AGRICOLA">TRATOR AGRÍCOLA</option>
                    <option value="CAMINHAO_PIPA">CAMINHÃO PIPA</option>
                    <option value="CAMINHAO_MUNCK">CAMINHÃO MUNCK</option>
                    <option value="EQUIPAMENTO_ASFALTO">EQUIPAMENTO ASFALTO</option>
                  </optgroup>
                  <option value="OUTROS">OUTROS</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
                  <Activity size={14} />
                </div>
              </div>
            </div>

            {/* Número do Chassi (Campo longo: col-span-full) */}
            <div className="space-y-3 col-span-full">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">Número do Chassi</label>
              <input 
                {...register('chassi')} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-mono font-black shadow-inner min-h-[44px]" 
                placeholder="9BW..." 
              />
            </div>

          </div>
        </section>

        {/* Desktop form action bar */}
        <div className="hidden lg:flex items-center justify-end gap-6 pt-4">
          <Link href="/veiculos" className="px-10 py-5 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all hover:bg-zinc-900">DESCARTAR</Link>
          <button type="submit" disabled={loading} className="px-14 py-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-[0.5em] rounded-full transition-all shadow-2xl flex items-center gap-4 active:scale-95 transform group">{loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:-rotate-6 transition-transform" />}PROTOCOLAR ATIVO NO SISTEMA</button>
        </div>
      </form>

      {/* DOCK FIXO MOBILE (BARRA MOBILE) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-zinc-950/95 border-t border-zinc-800 p-3.5 flex gap-2 z-45 backdrop-blur-md">
        <Link 
          href="/veiculos" 
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={16} /> VOLTAR
        </Link>
        <button 
          onClick={handleNovaOSWarning}
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Wrench size={16} /> NOVA OS
        </button>
        <button 
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="flex-1 min-h-[48px] bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer shadow-lg font-bold"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} SALVAR
        </button>
      </div>

    </div>
  );
}

export default function NovoVeiculoPage() {
  return (
    <Suspense fallback={
       <div className="max-w-4xl mx-auto p-20 flex flex-col items-center justify-center space-y-4">
         <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Inicializando módulo de frota...</p>
       </div>
    }>
      <NovoVeiculoForm />
    </Suspense>
  );
}
