'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, Trash2, Save, Loader2, ClipboardCheck,
  ChevronDown, CheckSquare, Image as ImageIcon, AlignLeft, Hash
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api'; // ✅ Importado padrão
import { handleApiError } from '@/lib/handle-api-error'; // ✅ Importado padrão

type ItemType = 'SIM_NAO' | 'FOTO' | 'TEXTO' | 'NUMERICO';

interface ItemForm {
  id: string;
  descricao: string;
  tipo: ItemType;
  obrigatorio: boolean;
  isExisting?: boolean;
}

const TIPOS = [
  { value: 'SIM_NAO', label: 'Múltipla Escolha (Ok/Médio/Ruim/Crítico)', icon: CheckSquare },
  { value: 'FOTO', label: 'Registro Fotográfico', icon: ImageIcon },
  { value: 'TEXTO', label: 'Texto Descritivo', icon: AlignLeft },
  { value: 'NUMERICO', label: 'Valor Numérico (KM/Horas)', icon: Hash },
];

export default function EditarChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('GERAL');
  const [itens, setItens] = useState<ItemForm[]>([]);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        // ✅ Padrão apiFetch
        const data = await apiFetch<any>(`/api/checklist/${id}`, { skipCache: true });
        
        setNome(data.nome || '');
        setDescricao(data.descricao || '');
        setCategoria(data.categoria || 'GERAL');
        
        const itensBrutos = data?.itens ?? data?.ChecklistItem ?? [];
        setItens(itensBrutos.map((item: any) => ({
          id: item.id,
          descricao: item.descricao,
          tipo: item.tipo || 'SIM_NAO',
          obrigatorio: item.obrigatorio !== false,
          isExisting: true
        })));
      } catch (error) {
        toast.error('Erro ao buscar checklist.');
        router.push('/checklist');
      } finally {
        setLoading(false);
      }
    };
    fetchChecklist();
  }, [id, router]);

  const addItem = () => {
    if (itens.length >= 200) {
      toast.error('Máximo de 200 itens por checklist');
      return;
    }
    setItens([...itens, { id: crypto.randomUUID(), descricao: '', tipo: 'SIM_NAO', obrigatorio: true }]);
  };

  const removeItem = (itemId: string) => {
    if (itens.length === 1) {
      toast.warning('O checklist precisa ter pelo menos um item.');
      return;
    }
    setItens(itens.filter(i => i.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof ItemForm, value: any) => {
    setItens(itens.map(i => i.id === itemId ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('O nome do checklist é obrigatório.');
      return;
    }
    if (itens.some(i => !i.descricao.trim())) {
      toast.error('Preencha a descrição de todos os itens.');
      return;
    }

    setSaving(true);
    try {
      // ✅ Padrão apiFetch
      await apiFetch(`/api/checklist/${id}`, {
        method: 'PUT',
        body: {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          categoria,
          itens: itens.map((item, index) => ({
            id: item.isExisting ? item.id : undefined,
            descricao: item.descricao.trim(),
            tipo: item.tipo,
            obrigatorio: item.obrigatorio,
            ordem: index,
          })),
        }
      });

      toast.success('Checklist atualizado com sucesso!');
      router.push('/checklist');
    } catch (err: any) {
      // ✅ Padrão handleApiError
      handleApiError(err, { defaultMessage: 'Falha ao salvar checklist.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 space-y-4 text-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] italic">Carregando Dados...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-8 pb-32 text-white bg-zinc-950 min-h-screen overflow-hidden">
      
      {/* HEADER PADRONIZADO */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/checklist" 
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Editar Template</h1>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.3em] mt-0.5">Ajustes no Checklist</p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* INFO BÁSICAS PADRONIZADAS */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <ClipboardCheck className="text-blue-500" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">Informações Gerais</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2 space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome do Checklist</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="EX: REVISÃO DE 10.000 KM"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest placeholder:text-zinc-700 shadow-inner"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Categoria</label>
              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest appearance-none cursor-pointer shadow-inner pr-10"
                >
                  <option value="GERAL">GERAL</option>
                  <option value="MOTOR">MOTOR</option>
                  <option value="SUSPENSAO">SUSPENSÃO</option>
                  <option value="ELETRICA">ELÉTRICA</option>
                  <option value="FREIOS">FREIOS</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2 sm:col-span-3">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Descrição (Opcional)</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="OBJETIVO DESTE CHECKLIST"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest placeholder:text-zinc-700 shadow-inner"
              />
            </div>
          </div>
        </section>

        {/* ITENS DO CHECKLIST PADRONIZADOS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Itens de Inspeção ({itens.length})</h2>
            <button 
              onClick={addItem} 
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-sm"
            >
              <Plus size={14} className="text-orange-500" /> Adicionar Item
            </button>
          </div>

          {itens.map((item, index) => {
            const IconeTipo = TIPOS.find(t => t.value === item.tipo)?.icon || AlignLeft;
            
            return (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg relative group transition-colors hover:border-zinc-700">
                
                {/* Header do Item */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-zinc-500 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Configuração do Item</span>
                  </div>
                  {/* ✅ Botão de excluir visível no mobile e desktop */}
                  <button 
                    onClick={() => removeItem(item.id)} 
                    disabled={itens.length === 1} 
                    className="p-2 text-zinc-600 hover:text-red-500 transition disabled:opacity-30" 
                    title="Remover Item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:pl-11">
                  {/* Descrição */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Descrição do Item</label>
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                      placeholder="EX: NÍVEL DO ÓLEO DO MOTOR"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest placeholder:text-zinc-700 shadow-inner"
                    />
                  </div>

                  {/* Tipo */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Tipo de Resposta</label>
                    <div className="relative">
                      <select
                        value={item.tipo}
                        onChange={(e) => updateItem(item.id, 'tipo', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 pl-11 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest appearance-none cursor-pointer shadow-inner"
                      >
                        {TIPOS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <IconeTipo className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Obrigatório */}
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Regra de Preenchimento</label>
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, 'obrigatorio', !item.obrigatorio)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${item.obrigatorio ? 'bg-orange-500/10 border-orange-500/30' : 'bg-zinc-950 border-zinc-800'}`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-widest ${item.obrigatorio ? 'text-orange-500' : 'text-zinc-600'}`}>
                        {item.obrigatorio ? 'Obrigatório' : 'Opcional'}
                      </span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${item.obrigatorio ? 'bg-orange-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${item.obrigatorio ? 'left-5.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </section>
      </div>

      {/* BOTÃO FIXO DE SALVAR (Padrão unificado) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-50 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full max-w-[800px] bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Atualizando Template...' : 'Salvar Alterações'}
        </button>
      </div>

    </div>
  );
}
