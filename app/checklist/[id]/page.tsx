'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Plus, Trash2, Save, ArrowLeft, Loader2, ClipboardCheck, 
  CheckCircle2, XCircle, FileText, Hash, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  descricao: string;
  tipo: 'SIM_NAO' | 'FOTO' | 'TEXTO' | 'NUMERICO';
  obrigatorio: boolean;
}

export default function ChecklistFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [itens, setItens] = useState<ChecklistItem[]>([
    { id: crypto.randomUUID(), descricao: '', tipo: 'SIM_NAO', obrigatorio: true }
  ]);

  const fetchChecklist = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checklist/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNome(data.nome);
        setAtivo(data.ativo !== false);
        if (data.itens && data.itens.length > 0) {
          setItens(data.itens.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            descricao: item.descricao,
            tipo: item.tipo === 'NUMERO' ? 'NUMERICO' : item.tipo,
            obrigatorio: item.obrigatorio !== false
          })));
        }
      } else {
        toast.error('Não foi possível carregar os dados do checklist.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar dados do checklist.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    if (isEditing) {
      const loadData = async () => {
        if (active) {
          await fetchChecklist();
        }
      };
      loadData();
    }
    return () => { active = false; };
  }, [isEditing, fetchChecklist]);

  const addItem = () => {
    setItens([...itens, { id: crypto.randomUUID(), descricao: '', tipo: 'SIM_NAO', obrigatorio: true }]);
  };

  const removeItem = (itemId: string) => {
    if (itens.length <= 1) {
      toast.error('O checklist deve ter pelo menos um item.');
      return;
    }
    setItens(itens.filter(i => i.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof ChecklistItem, value: any) => {
    setItens(itens.map(i => i.id === itemId ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('O nome do checklist é obrigatório.');
      return;
    }

    if (itens.some(i => !i.descricao.trim())) {
      toast.error('Todos os itens devem ter uma descrição.');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/checklist/${id}` : '/api/checklist';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, ativo, itens }),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success(isEditing ? 'Checklist atualizado com sucesso!' : 'Checklist criado com sucesso!');
        router.push('/checklist');
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar checklist.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] italic">Sincronizando Protocolo...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-8 pb-20 overflow-hidden">
      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/checklist" className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {isEditing ? 'EDITAR PROTOCOLO' : 'NOVO PROTOCOLO'}
            </h1>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] leading-none mt-1">
              ESTRUTURAÇÃO DE VERIFICAÇÃO TÉCNICA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 disabled:opacity-50 italic shadow-orange-950/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
            {isEditing ? 'ATUALIZAR' : 'CONCLUIR'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* DEFINIÇÕES DE IDENTIFICAÇÃO (RUID-FREE FULL WIDTH GRID) */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
            <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Definições do Checklist</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome do Checklist</label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="EX: INSPEÇÃO DE ENTRADA"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest shadow-inner placeholder:text-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Status Operacional</label>
              <button 
                type="button"
                onClick={() => setAtivo(!ativo)}
                className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all group ${ativo ? 'bg-green-600/5 border-green-600/20' : 'bg-red-600/5 border-red-600/20'}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest ${ativo ? 'text-green-500' : 'text-red-500'}`}>
                  {ativo ? 'TEMPLATE ATIVO' : 'TEMPLATE INATIVO'}
                </span>
                <div className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors ${ativo ? 'bg-green-600 justify-end' : 'bg-red-600 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ITENS DINÂMICOS */}
        <div className="w-full">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[500px] shadow-2xl relative">
            <div className="p-8 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-orange-500 shadow-inner">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Itens de Inspeção</h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">Configuração de Campo</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={addItem}
                className="p-4 bg-zinc-950 border border-zinc-800 text-orange-500 hover:bg-orange-600 hover:text-white rounded-2xl transition shadow-lg active:scale-95 group"
                title="Adicionar Item"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="p-8 space-y-4 max-h-[1000px] overflow-y-auto custom-scrollbar">
              {itens.map((item, index) => (
                <div 
                  key={item.id}
                  className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-6 group relative grid grid-cols-1 md:grid-cols-12 gap-6 items-end hover:border-orange-500/20 transition-all border-l-4 border-l-orange-600/10 hover:border-l-orange-600"
                >
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-900 border border-zinc-800 hover:bg-red-600 hover:border-red-600 rounded-full flex items-center justify-center text-zinc-600 hover:text-white transition-all shadow-xl z-20"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="md:col-span-1 flex items-center justify-center h-full">
                    <span className="text-2xl font-black text-zinc-800 font-mono italic">{(index + 1).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="md:col-span-6 space-y-2">
                    <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-1">Descrição do Item</label>
                    <input 
                      type="text" 
                      value={item.descricao}
                      onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                      placeholder="EX: VERIFICAR NÍVEL DE ÓLEO..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-5 text-[11px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-950"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-1 text-center block">Tipo de Resposta</label>
                    <div className="relative">
                       <select 
                        value={item.tipo}
                        onChange={(e) => updateItem(item.id, 'tipo', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-5 text-[10px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner appearance-none cursor-pointer pr-10"
                      >
                        <option value="SIM_NAO">SIM / NÃO</option>
                        <option value="FOTO">REGISTRO FOTO</option>
                        <option value="TEXTO">TEXTO LIVRE</option>
                        <option value="NUMERICO">VALOR NUMÉRICO</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-700">
                        {item.tipo === 'SIM_NAO' && <CheckCircle2 size={12} />}
                        {item.tipo === 'FOTO' && <ImageIcon size={12} />}
                        {item.tipo === 'TEXTO' && <FileText size={12} />}
                        {item.tipo === 'NUMERICO' && <Hash size={12} />}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col items-center justify-center gap-2">
                    <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] leading-none mb-1">Obrigatório</label>
                    <button 
                      onClick={() => updateItem(item.id, 'obrigatorio', !item.obrigatorio)}
                      className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${item.obrigatorio ? 'bg-orange-600 justify-end' : 'bg-zinc-800 justify-start'}`}
                    >
                      <div className="w-3.5 h-3.5 bg-white rounded-full shadow-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-950/20 flex flex-col md:flex-row items-center justify-between gap-4">
               <button 
                onClick={addItem}
                className="w-full md:w-auto px-8 py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-orange-500/50 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest italic flex items-center justify-center gap-2"
              >
                <Plus size={14} /> ADICIONAR ITEM
              </button>
              <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] font-mono italic">
                 TOTAL: {itens.length} SEÇÕES
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
