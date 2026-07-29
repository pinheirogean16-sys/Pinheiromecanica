'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Plus, Trash2, Save, Loader2, ClipboardCheck
} from 'lucide-react';
import Link from 'next/link';

export default function EditarChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('GERAL');
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await fetch(`/api/checklist/${id}`);
        if (res.ok) {
          const data = await res.json();
          setNome(data.nome);
          setDescricao(data.descricao || '');
          setCategoria(data.categoria);
          setItens(data.itens.map((item: any) => ({
            id: item.id,
            descricao: item.descricao,
            tipo: item.tipo,
            obrigatorio: item.obrigatorio,
            isExisting: true
          })));
        }
      } catch (error) {
        console.error('Erro ao buscar checklist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChecklist();
  }, [id]);

  const addItem = () => {
    setItens([...itens, { id: crypto.randomUUID(), descricao: '', tipo: 'SIM_NAO', obrigatorio: true }]);
  };

  const removeItem = (id: string) => {
    if (itens.length === 1) return;
    setItens(itens.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItens(itens.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return alert('O nome do checklist é obrigatório');
    if (itens.some(i => !i.descricao)) return alert('Preencha a descrição de todos os itens');

    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          descricao,
          categoria,
          itens
        })
      });

      if (res.ok) {
        router.push('/checklist');
      } else {
        const error = await res.json();
        alert(`Erro: ${error.error || 'Falha ao salvar checklist'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
      alert('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-zinc-500 font-black uppercase tracking-[0.4em] italic text-xs">Carregando Dados...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-8 pb-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/checklist" className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Editar Protocolo</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">Refatoração de Processo</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 flex items-center gap-3 italic disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Atualizar Protocolo
        </button>
      </div>

      <div className="space-y-8">
        {/* Info Geral (FULL WIDTH RESPONSIVE GRID) */}
        <div className="w-full">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl">
            
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Definições Gerais</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome do Protocolo</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest shadow-inner placeholder:text-zinc-800"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Categoria</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest appearance-none cursor-pointer shadow-inner"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="GERAL">CATEGORIA: GERAL</option>
                  <option value="OS">CATEGORIA: ORDEM DE SERVIÇO</option>
                  <option value="VEICULO">CATEGORIA: VEÍCULO</option>
                  <option value="ESTOQUE">CATEGORIA: ESTOQUE</option>
                </select>
              </div>

              <div className="space-y-2 col-span-full">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Descrição</label>
                <textarea 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-bold uppercase tracking-widest shadow-inner min-h-[140px] resize-y placeholder:text-zinc-800"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Itens do Checklist */}
        <div className="w-full space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[500px] shadow-2xl">
            <div className="p-8 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-orange-500 shadow-inner">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Itens do Protocolo</h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">Escopo de Verificação</p>
                </div>
              </div>
              <button 
                onClick={addItem}
                className="p-4 bg-zinc-950 border border-zinc-800 text-orange-500 hover:bg-orange-600 hover:text-white rounded-2xl transition shadow-lg active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar flex-1">
              {itens.map((item, index) => (
                <div 
                  key={item.id}
                  className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 group relative grid grid-cols-1 md:grid-cols-12 gap-6 items-end hover:border-orange-500/20 transition-all border-l-4 border-l-orange-600/10 hover:border-l-orange-600"
                >
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl z-10"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="md:col-span-1 flex items-center justify-center h-full">
                    <span className="text-2xl font-black text-zinc-800 font-mono italic">{(index + 1).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="md:col-span-6 space-y-2">
                    <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-1">Descrição</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-5 text-[11px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-800"
                      value={item.descricao}
                      onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-1 text-center block">Tipo</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-5 text-[10px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner appearance-none cursor-pointer"
                      value={item.tipo}
                      onChange={(e) => updateItem(item.id, 'tipo', e.target.value)}
                    >
                      <option value="SIM_NAO">OPÇÃO: SIM/NÃO</option>
                      <option value="TEXTO">OPÇÃO: TEXTO LIVRE</option>
                      <option value="NUMERO">OPÇÃO: VALOR NUMÉRICO</option>
                      <option value="FOTO">OPÇÃO: REGISTRO FOTO</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex flex-col items-center justify-center gap-2">
                    <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] leading-none">Obrigatório</label>
                    <button 
                      onClick={() => updateItem(item.id, 'obrigatorio', !item.obrigatorio)}
                      className={`w-14 h-8 rounded-full p-1 transition-all flex items-center ${item.obrigatorio ? 'bg-orange-600 justify-end' : 'bg-zinc-800 justify-start'}`}
                    >
                      <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-950/20 text-center">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] italic">Total de {itens.length} Procedimentos</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
