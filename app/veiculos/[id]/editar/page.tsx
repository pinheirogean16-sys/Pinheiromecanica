'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronLeft, Save, Car, Truck, User, 
  Search, ShieldCheck, PenTool as Tool, Calendar, Activity, Loader2, Check, Wrench
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
  ano: z.string().refine(val => {
    const year = parseInt(val);
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear + 1;
  }, 'Ano inválido'),
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
  quilometragem: z.string().optional().nullable(),
  horimetro_atual: z.string().optional().nullable(),
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

export default function EditarVeiculoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
  });

  const cliente_id = watch('cliente_id');
  const placaValue = watch('placa');
  const tipoValue = watch('tipo');
  const isEquipamento = EQUIPAMENTOS.includes(tipoValue || '');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/veiculos/${id}`);
        if (res.ok) {
          const data = await res.json();
          reset({
            cliente_id: data.cliente_id || '',
            placa: data.placa || '',
            modelo: data.modelo || '',
            marca: data.marca || '',
            ano: data.ano?.toString() || '',
            tipo: data.tipo || 'OUTROS',
            quilometragem: data.quilometragem?.toString() || '',
            horimetro_atual: data.horimetro_atual?.toString() || '',
          });
        }
      } catch (err) {
        toast.error('Erro ao carregar dados do veículo');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, reset]);

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
      const res = await fetch(`/api/veiculos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success('Ficha técnica updated!');
        router.push(`/veiculos/${id}`);
      } else {
        const result = await res.json();
        toast.error(result.error || 'Erro ao salvar alterações');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loader2 size={32} className="text-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-6 overflow-hidden">
      <div className="flex items-center gap-4">
        <Link href={`/veiculos/${id}`} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer">
          <ChevronLeft size={20} />
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">Editar Registro Técnico</h1>
          <p className="text-[10px] text-zinc-655 font-black uppercase tracking-[0.3em]">Manutenção de Dados de Frota</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
         <section className="bg-zinc-900 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8">
           <div className="relative">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 mb-3 block">Proprietário Responsável</label>
            <select 
              value={cliente_id} 
              onChange={e => setValue('cliente_id', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-855 rounded-2xl p-4 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-wider shadow-inner appearance-none cursor-pointer min-h-[44px]"
            >
              <option value="">Selecionar cliente...</option>
              {clientes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome} ({c.cpf_cnpj})</option>
              ))}
            </select>
          </div>
         </section>

         <section className="bg-zinc-900 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-10">
          <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6">
            <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl">
              <Tool size={20} />
            </div>
            <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Informações do Veículo</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">Placa</label>
              <input 
                {...register('placa')}
                onChange={(e) => setValue('placa', maskPlaca(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 text-center text-xl text-white outline-none focus:border-orange-500 font-mono font-black uppercase tracking-widest transition min-h-[44px]"
                value={placaValue || ''}
              />
              {errors.placa && <p className="text-[9px] text-red-500 font-black uppercase">{errors.placa.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1">Marca</label>
              <input {...register('marca')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-black uppercase min-h-[44px]" />
              {errors.marca && <p className="text-[9px] text-red-500 font-black uppercase">{errors.marca.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1">Modelo</label>
              <input {...register('modelo')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-black uppercase min-h-[44px]" />
              {errors.modelo && <p className="text-[9px] text-red-500 font-black uppercase">{errors.modelo.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic font-bold">Ano</label>
              <input {...register('ano')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-mono font-black uppercase min-h-[44px]" />
              {errors.ano && <p className="text-[9px] text-red-500 font-black uppercase">{errors.ano.message}</p>}
            </div>
            
            {!isEquipamento ? (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">Quilometragem (KM)</label>
                <input type="number" {...register('quilometragem')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-mono font-black uppercase min-h-[44px]" />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">Horímetro Atual (Horas)</label>
                <input type="number" step="0.1" {...register('horimetro_atual')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-mono font-black uppercase min-h-[44px]" placeholder="Ex: 1250.5" />
              </div>
            )}

            <div className="space-y-3 col-span-full md:col-span-1">
               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Categoria Técnica</label>
                <select 
                  {...register('tipo')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-6 text-[10px] text-white focus:border-orange-500 outline-none transition font-black uppercase tracking-widest cursor-pointer min-h-[44px]"
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
            </div>
          </div>
         </section>

         <div className="hidden lg:flex items-center justify-end gap-6">
           <Link href={`/veiculos/${id}`} className="px-10 py-5 text-[11px] font-black uppercase text-zinc-700">CANCELAR</Link>
           <button 
             type="submit" 
             disabled={loading}
             className="px-14 py-6 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-full transition-all shadow-2xl flex items-center gap-4 cursor-pointer"
           >
             {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
             FINALIZAR ATUALIZAÇÃO
           </button>
         </div>
      </form>

      {/* DOCK FIXO MOBILE (BARRA MOBILE) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-zinc-950/95 border-t border-zinc-800 p-3.5 flex gap-2 z-45 backdrop-blur-md">
        <Link 
          href={`/veiculos/${id}`}
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={16} /> VOLTAR
        </Link>
        <Link 
          href={`/os/nova?veiculo_id=${id}&cliente_id=${cliente_id}`}
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Wrench size={16} /> NOVA OS
        </Link>
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
