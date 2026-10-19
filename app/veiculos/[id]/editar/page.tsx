'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Save, PenTool as Tool,
  Loader2, Wrench, AlertTriangle, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { maskPlaca } from '@/lib/masks';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

// ============================================================
// CONSTANTES
// ============================================================
const ANO_MIN = 1900;
const ANO_MAX = new Date().getFullYear() + 1;

const EQUIPAMENTOS = [
  'RETROESCAVADEIRA', 'ESCAVADEIRA_HIDRAULICA', 'PA_CARREGADEIRA',
  'MOTONIVELADORA', 'ROLO_COMPACTADOR', 'TRATOR_ESTEIRA',
  'VIBROACABADORA', 'FRESADORA', 'USINA_ASFALTO', 'EMPILHADEIRA',
  'GUINDASTE', 'PERFURATRIZ', 'TRATOR_AGRICOLA', 'CAMINHAO_PIPA',
  'CAMINHAO_MUNCK', 'EQUIPAMENTO_ASFALTO',
];

// ============================================================
// SCHEMA
// ============================================================
const veiculoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um proprietário'),
  placa: z
    .string()
    .min(7, 'Placa inválida (mínimo 7 caracteres)')
    .max(8, 'Placa inválida (máximo 8 caracteres)')
    .transform((v) => v.toUpperCase().trim()),
  modelo: z.string().min(2, 'Modelo obrigatório').max(200, 'Modelo muito longo').trim(),
  marca: z.string().min(2, 'Marca obrigatória').max(100, 'Marca muito longa').trim(),
  ano: z
    .string()
    .min(1, 'Ano obrigatório')
    .refine(
      (v) => {
        const n = Number(v);
        return !isNaN(n) && Number.isInteger(n) && n >= ANO_MIN && n <= ANO_MAX;
      },
      `Ano deve estar entre ${ANO_MIN} e ${ANO_MAX}`
    ),
  tipo: z.enum([
    'CAVALO_MECANICO', 'CARRETA', 'ONIBUS', 'UTILITARIO',
    'CAMINHAO_LEVE', 'CAMINHAO_PESADO', 'CAMINHONETE', 'VAN',
    'RETROESCAVADEIRA', 'ESCAVADEIRA_HIDRAULICA', 'PA_CARREGADEIRA',
    'MOTONIVELADORA', 'TRATOR_ESTEIRA', 'ROLO_COMPACTADOR',
    'VIBROACABADORA', 'FRESADORA', 'USINA_ASFALTO', 'EMPILHADEIRA',
    'GUINDASTE', 'PERFURATRIZ', 'TRATOR_AGRICOLA', 'CAMINHAO_PIPA',
    'CAMINHAO_MUNCK', 'EQUIPAMENTO_ASFALTO', 'OUTROS',
  ]),
  quilometragem: z.string().optional().nullable(),
  horimetro_atual: z.string().optional().nullable(),
});

type VeiculoFormData = z.infer<typeof veiculoSchema>;

// ============================================================
// COMPONENTE
// ============================================================
export default function EditarVeiculoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesLoading, setClientesLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VeiculoFormData>({
    resolver: zodResolver(veiculoSchema),
  });

  const cliente_id = watch('cliente_id');
  const placaValue = watch('placa');
  const tipoValue = watch('tipo');
  const isEquipamento = EQUIPAMENTOS.includes(tipoValue || '');

  // ============================================================
  // ✅ CORRIGIDO: fetch do veículo com AbortController + estado de erro
  // ============================================================
  const fetchVeiculo = useCallback(
    async (signal?: AbortSignal) => {
      setFetching(true);
      setFetchError(false);
      try {
        const data = await apiFetch<any>(`/api/veiculos/${id}`, { signal });
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
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setFetchError(true);
        handleApiError(err, { defaultMessage: 'Erro ao carregar dados do veículo' });
      } finally {
        setFetching(false);
      }
    },
    [id, reset]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchVeiculo(controller.signal);
    return () => controller.abort();
  }, [fetchVeiculo]);

  // ============================================================
  // ✅ CORRIGIDO: clientes com limit=1000 + AbortController
  // ============================================================
  useEffect(() => {
    const controller = new AbortController();

    apiFetch<any>('/api/clientes?limit=1000', { signal: controller.signal })
      .then((data) => {
        const lista = Array.isArray(data) ? data : (data.items || []);
        setClientes(lista);
      })
      .catch((err: any) => {
        if (err.name === 'AbortError') return;
        handleApiError(err, { defaultMessage: 'Erro ao carregar clientes' });
        setClientes([]);
      })
      .finally(() => {
        setClientesLoading(false);
      });

    return () => controller.abort();
  }, []);

  // ============================================================
  // SUBMIT
  // ============================================================
  const onSubmit = async (data: VeiculoFormData) => {
    // ✅ NOVO: validação de métrica mínima (espelha o refine do backend)
    const km = Number(data.quilometragem) || 0;
    const hor = Number(data.horimetro_atual) || 0;

    if (km <= 0 && hor <= 0) {
      toast.error('Informe ao menos uma métrica: quilometragem (KM) ou horímetro (h).');
      return;
    }

    setLoading(true);
    try {
      // ✅ CORRIGIDO: strings vazias viram undefined (não viram 0 no backend)
      const payload: any = {
        cliente_id: data.cliente_id,
        placa: data.placa,
        modelo: data.modelo,
        marca: data.marca,
        ano: Number(data.ano),
        tipo: data.tipo,
      };

      // Só envia km se preenchido com valor > 0
      if (km > 0) payload.quilometragem = km;
      if (hor > 0) payload.horimetro_atual = hor;

      await apiFetch(`/api/veiculos/${id}`, {
        method: 'PUT',
        body: payload,
      });

      toast.success('Ficha técnica atualizada com sucesso!');
      router.push(`/veiculos/${id}`);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao salvar alterações' });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER — LOADING
  // ============================================================
  if (fetching) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="text-orange-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">
          Carregando dados do veículo...
        </p>
      </div>
    );
  }

  // ============================================================
  // RENDER — ERRO
  // ============================================================
  if (fetchError) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-black uppercase tracking-tight text-white">
          Falha ao carregar veículo
        </h2>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest text-center max-w-md">
          Não foi possível obter os dados do veículo. Verifique sua conexão ou tente novamente.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => fetchVeiculo()}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
          <Link
            href="/veiculos"
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2"
          >
            <ChevronLeft size={14} /> Voltar para Frota
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER — FORMULÁRIO
  // ============================================================
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-32 px-4 sm:px-6 overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link
          href={`/veiculos/${id}`}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">
            Editar Registro Técnico
          </h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">
            Manutenção de Dados de Frota
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>

        {/* PROPRIETÁRIO */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8">
          <div className="relative">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 mb-3 block">
              Proprietário Responsável
            </label>
            <select
              value={cliente_id}
              onChange={(e) => setValue('cliente_id', e.target.value, { shouldValidate: true })}
              disabled={clientesLoading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-wider shadow-inner appearance-none cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              <option value="">
                {clientesLoading ? 'Carregando clientes...' : 'Selecionar cliente...'}
              </option>
              {clientes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.cpf_cnpj})
                </option>
              ))}
            </select>
            {errors.cliente_id && (
              <p className="text-[9px] text-red-500 font-black mt-2 uppercase tracking-widest italic">
                {errors.cliente_id.message}
              </p>
            )}
          </div>
        </section>

        {/* ESPECIFICAÇÕES TÉCNICAS */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-10">
          <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6">
            <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl">
              <Tool size={20} />
            </div>
            <h2 className="text-sm font-black text-white uppercase italic tracking-widest">
              Informações do Veículo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">

            {/* Placa */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">
                Placa
              </label>
              <input
                {...register('placa')}
                onChange={(e) => setValue('placa', maskPlaca(e.target.value), { shouldValidate: true })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 text-center text-xl text-white outline-none focus:border-orange-500 font-mono font-black uppercase tracking-widest transition min-h-[44px]"
                value={placaValue || ''}
              />
              {errors.placa && (
                <p className="text-[9px] text-red-500 font-black uppercase">{errors.placa.message}</p>
              )}
            </div>

            {/* Marca */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1">
                Marca
              </label>
              <input
                {...register('marca')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-black uppercase min-h-[44px]"
              />
              {errors.marca && (
                <p className="text-[9px] text-red-500 font-black uppercase">{errors.marca.message}</p>
              )}
            </div>

            {/* Modelo */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1">
                Modelo
              </label>
              <input
                {...register('modelo')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-black uppercase min-h-[44px]"
              />
              {errors.modelo && (
                <p className="text-[9px] text-red-500 font-black uppercase">{errors.modelo.message}</p>
              )}
            </div>

            {/* Ano */}
            <div className="space-y-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic font-bold">
                Ano
              </label>
              <input
                {...register('ano')}
                min={ANO_MIN}
                max={ANO_MAX}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-mono font-black uppercase min-h-[44px]"
              />
              {errors.ano && (
                <p className="text-[9px] text-red-500 font-black uppercase">{errors.ano.message}</p>
              )}
            </div>

            {/* KM ou Horímetro */}
            {!isEquipamento ? (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">
                  Quilometragem (KM)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  {...register('quilometragem')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-mono font-black uppercase min-h-[44px]"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-1 italic">
                  Horímetro Atual (Horas)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  {...register('horimetro_atual')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-orange-500 font-mono font-black uppercase min-h-[44px]"
                  placeholder="Ex: 1250.5"
                />
              </div>
            )}

            {/* Categoria Técnica */}
            <div className="space-y-3 col-span-full md:col-span-1">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                Categoria Técnica
              </label>
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

        {/* AÇÕES DESKTOP */}
        <div className="hidden lg:flex items-center justify-end gap-6">
          <Link
            href={`/veiculos/${id}`}
            className="px-10 py-5 text-[11px] font-black uppercase text-zinc-700 hover:text-zinc-400 transition"
          >
            CANCELAR
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-14 py-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-full transition-all shadow-2xl flex items-center gap-4 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            FINALIZAR ATUALIZAÇÃO
          </button>
        </div>
      </form>

      {/* DOCK MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-zinc-950/95 border-t border-zinc-800 p-3.5 flex gap-2 z-40 backdrop-blur-md">
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
          type="button"
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
