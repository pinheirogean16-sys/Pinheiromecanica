'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Save, Package, Tag, 
  BarChart3, Warehouse, Info, ArrowLeft, Scale, ArrowLeftRight, Check,
  DollarSign, Hash, Layers, MapPin, 
  TrendingUp, AlertCircle, Loader2, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LISTA_UNIDADES } from '@/lib/unidades';

const pecaSchema = z.object({
  codigo: z.string().min(3, 'Código muito curto'),
  descricao: z.string().min(5, 'Descrição detalhada necessária'),
  fabricante: z.string().optional(),
  categoria: z.string().min(1, 'Selecione uma categoria'),
  quantidade: z.coerce.number().min(0, 'Quantidade não pode ser negativa'),
  estoque_minimo: z.coerce.number().min(0, 'Estoque mínimo não pode ser negativo'),
  localizacao: z.string().optional(),
  preco_custo: z.coerce.number().min(0.01, 'Custo deve ser maior que zero'),
  preco_venda: z.coerce.number().min(0.01, 'Venda deve ser maior que zero'),
  unidadeMedida: z.string().default('un'),
  unidadeCompra: z.string().default('un'),
  fatorConversao: z.coerce.number().min(0.0001, 'Fator de conversão deve ser positivo').default(1),
  permiteFracionado: z.boolean().default(false),
});

type PecaFormData = z.infer<typeof pecaSchema>;

export default function EditarItemEstoquePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [itemId, setItemId] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<PecaFormData>({
    resolver: zodResolver(pecaSchema),
    defaultValues: {
      unidadeMedida: 'un',
      unidadeCompra: 'un',
      fatorConversao: 1,
      permiteFracionado: false
    }
  });

  useEffect(() => {
    params.then(p => {
      setItemId(p.id);
      Promise.all([
        fetch('/api/pecas/categorias').then(res => {
          if (!res.ok) throw new Error('Erro ao carregar categorias');
          return res.json();
        }),
        fetch(`/api/pecas/${p.id}`).then(res => {
          if (!res.ok) throw new Error('Erro ao carregar dados do item');
          return res.json();
        })
      ]).then(([cats, peca]) => {
        setCategorias(cats);
        if (peca.error) {
          toast.error(peca.error);
          router.push('/estoque');
        } else {
          reset({
            codigo: peca.codigo,
            descricao: peca.descricao,
            fabricante: peca.fabricante || '',
            categoria: peca.categoria,
            quantidade: peca.quantidade,
            estoque_minimo: peca.estoque_minimo,
            localizacao: peca.localizacao || '',
            preco_custo: peca.preco_custo,
            preco_venda: peca.preco_venda,
            unidadeMedida: peca.unidadeMedida || 'un',
            unidadeCompra: peca.unidadeCompra || 'un',
            fatorConversao: peca.fatorConversao || 1,
            permiteFracionado: peca.permiteFracionado || false,
          });
        }
      })
      .catch(err => {
        console.error("Erro ao carregar dados da edição de peça:", err);
        toast.error(err instanceof Error ? err.message : 'Erro de conexão ao carregar dados');
      })
      .finally(() => {
        setFetching(false);
      });
    });
  }, [params, reset, router]);

  const precoCusto = Number(watch('preco_custo'));
  const precoVenda = Number(watch('preco_venda'));
  const permiteFracionado = watch('permiteFracionado');
  const margem = precoCusto > 0 && precoVenda > 0 ? ((precoVenda / precoCusto - 1) * 100).toFixed(1) : '0.0';

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pecas/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        toast.success('Dossiê do item atualizado com sucesso!');
        router.push(`/estoque/${itemId}`);
      } else {
        toast.error(result.error || 'Erro ao atualizar item');
      }
    } catch (err) {
      toast.error('Erro de conexão com o terminal');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
       <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">ACESSANDO TERMINAL PARA EDIÇÃO...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 space-y-8 pb-20 overflow-hidden">
      <div className="flex items-center gap-4">
        <Link href={`/estoque/${itemId}`} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">Editar Registro Técnico</h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Módulo de Almoxarifado Digital</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden group">
               
               <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6 mb-10">
                  <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Atualizar Especificações</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Modificação de Dados em Lote</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Código do Item (SKU/REF)</label>
                    <div className="relative">
                      <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                      <input 
                        {...register('codigo')}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-700"
                        placeholder="EX: SKU-001"
                      />
                    </div>
                    {errors.codigo && <p className="text-[10px] text-red-500 font-bold italic px-1">{errors.codigo.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Fabricante / Marca</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                      <input 
                        {...register('fabricante')}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black placeholder:text-zinc-700"
                        placeholder="EX: BOSCH"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Descrição Completa</label>
                    <input 
                      {...register('descricao')}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black placeholder:text-zinc-700"
                      placeholder="EX: FILTRO DE ÓLEO MOTOR"
                    />
                    {errors.descricao && <p className="text-[10px] text-red-500 font-bold italic px-1">{errors.descricao.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1 italic">Grupo / Categoria</label>
                    <div className="relative">
                      <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none" />
                      <select 
                        {...register('categoria')}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-10 text-[10px] text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest appearance-none cursor-pointer"
                      >
                        {categorias.map(cat => (
                          <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Localização Física</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                      <input 
                        {...register('localizacao')}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black placeholder:text-zinc-700"
                        placeholder="EX: PRATELEIRA A2"
                      />
                    </div>
                  </div>
               </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden">
               <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6 mb-10">
                  <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Unidades de Medida & Conversão</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Faturamento e Controle de Frações Avançados</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Unidade Principal (Consumo/Venda)</label>
                    <select {...register('unidadeMedida')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition font-bold uppercase">
                      {LISTA_UNIDADES.map(u => (
                        <option key={u.sigla} value={u.sigla}>{u.nome} ({u.sigla})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Unidade de Compra (Fornecedor)</label>
                    <select {...register('unidadeCompra')} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-orange-500 outline-none transition font-bold uppercase">
                      {LISTA_UNIDADES.map(u => (
                        <option key={u.sigla} value={u.sigla}>{u.nome} ({u.sigla})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Fator de Conversão (Multiplicador de Entrada)</label>
                    <div className="relative">
                      <ArrowLeftRight size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                      <input type="number" step="any" {...register('fatorConversao')} placeholder="1.0" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs text-white font-mono focus:border-orange-500 outline-none transition placeholder:text-zinc-700" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-5 bg-zinc-950/50 border border-zinc-800 rounded-2xl select-none cursor-pointer hover:border-zinc-700 transition" onClick={() => setValue('permiteFracionado', !permiteFracionado)}>
                    <div className={`w-8 h-8 sm:w-6 sm:h-6 shrink-0 rounded-lg border flex items-center justify-center transition ${permiteFracionado ? 'bg-orange-600 border-orange-500 text-white' : 'border-zinc-800 text-transparent'}`}>
                      <Check size={14} />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider block">Permitir Divisões Decimais</span>
                      <span className="text-[8px] text-zinc-600 block mt-0.5">Habilita pesos, litros e metros quebrados (ex: 1.50m) na Ordem de Serviço.</span>
                    </div>
                  </div>
               </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl">
               <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6 mb-10">
                  <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Níveis de Inventário</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Ajuste de Saldo e Alertas</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Quantidade em Estoque</label>
                    <input 
                      type="number" 
                      {...register('quantidade')} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-orange-500 font-mono outline-none transition placeholder:text-zinc-700" 
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Ponto de Ressuprimento (Mínimo)</label>
                    <input 
                      type="number" 
                      {...register('estoque_minimo')} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-orange-500 font-mono outline-none transition placeholder:text-zinc-700" 
                      placeholder="0"
                    />
                  </div>
               </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[3rem] p-5 sm:p-10 shadow-2xl space-y-10 relative overflow-hidden">
               
               <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6 mb-10">
                  <div className="p-3 bg-green-600/10 text-green-500 rounded-2xl">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Recalcular Preços</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Atualização de Mark-up</p>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="space-y-3">
                     <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Valor de Custo (Compra)</label>
                     <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-700">R$</span>
                        <input 
                           type="number"
                           step="0.01"
                           {...register('preco_custo')}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 pl-14 text-xl font-black text-white font-mono outline-none focus:border-zinc-500 transition shadow-inner"
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] text-orange-500 font-black uppercase tracking-widest px-1 italic">Preço de Venda Sugerido</label>
                     <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-black text-orange-800 italic">R$</span>
                        <input 
                           type="number"
                           step="0.01"
                           {...register('preco_venda')}
                           className="w-full bg-zinc-950 border border-orange-500/20 rounded-3xl p-6 pl-14 text-xl font-black text-orange-500 font-mono outline-none focus:border-orange-500 transition shadow-lg"
                        />
                     </div>
                  </div>

                  <div className="p-7 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] flex flex-col items-center text-center space-y-2 border-dashed">
                     <TrendingUp size={24} className="text-green-500 mb-2" />
                     <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">Margem de Lucro Bruta</p>
                     <h4 className="text-4xl font-black text-white italic tracking-tighter">{margem}%</h4>
                  </div>
               </div>
            </section>

            <div className="flex flex-col gap-4">
               <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-6 rounded-[2.5rem] font-black text-[14px] uppercase tracking-[0.4em] shadow-2xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 group"
               >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:rotate-12 transition-transform" />}
                  ATUALIZAR REGISTRO
               </button>
               <button 
                  type="button"
                  onClick={() => router.back()}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white py-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.4em] transition-colors text-center"
               >
                  CANCELAR ALTERAÇÕES
               </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
