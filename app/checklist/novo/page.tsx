'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Plus, Trash2, Save, Loader2, ClipboardCheck,
  ChevronDown, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NovoChecklistPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('GERAL');
  const [ativo, setAtivo] = useState(true);
  const [itens, setItens] = useState<any[]>([
    {
      id: crypto.randomUUID(),
      descricao: '',
      tipo: 'SIM_NAO',
      obrigatorio: true,
    },
  ]);

  const addItem = () => {
    if (itens.length >= 200) {
      toast.error('Máximo de 200 itens por checklist');
      return;
    }
    setItens([
      ...itens,
      {
        id: crypto.randomUUID(),
        descricao: '',
        tipo: 'SIM_NAO',
        obrigatorio: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (itens.length === 1) {
      toast.error('O checklist precisa ter pelo menos 1 item');
      return;
    }
    setItens(itens.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItens(itens.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || nome.trim().length < 2) {
      toast.error('O nome do checklist é obrigatório (mínimo 2 caracteres)');
      return;
    }

    if (itens.some((i) => !i.descricao || i.descricao.trim().length === 0)) {
      toast.error('Preencha a descrição de todos os itens');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          categoria,
          ativo,
          itens: itens.map((item, index) => ({
            descricao: item.descricao.trim(),
            tipo: item.tipo,
            obrigatorio: item.obrigatorio,
            ordem: index,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Checklist criado com sucesso');
        router.push('/checklist');
      } else {
        const error = await res.json().catch(() => ({ error: null }));
        toast.error(error.error || 'Falha ao criar checklist');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-8 pb-20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/checklist"
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Novo Protocolo
            </h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">
              Criação de Processo
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="hidden sm:flex bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 items-center gap-3 italic disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Criar Protocolo
        </button>
      </div>

      <div className="space-y-8">
        {/* Info Geral */}
        <div className="w-full">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight">
                Definições Gerais
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Nome do Protocolo
                </label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest shadow-inner placeholder:text-zinc-700"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="EX: INSPEÇÃO DE ENTRADA"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Categoria
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest appearance-none cursor-pointer shadow-inner pr-10"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="GERAL">CATEGORIA: GERAL</option>
                    <option value="OS">CATEGORIA: ORDEM DE SERVIÇO</option>
                    <option value="VEICULO">CATEGORIA: VEÍCULO</option>
                    <option value="ESTOQUE">CATEGORIA: ESTOQUE</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => setAtivo(!ativo)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between hover:border-orange-500/50 transition"
                >
                  <span className="text-xs text-white font-black uppercase tracking-widest">
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <div
                    className={`w-14 h-8 rounded-full p-1 transition-all flex items-center ${
                      ativo ? 'bg-orange-600 justify-end' : 'bg-zinc-800 justify-start'
                    }`}
                  >
                    <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
                  </div>
                </button>
              </div>

              <div className="space-y-2 col-span-full">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Descrição
                </label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-medium tracking-wide shadow-inner min-h-[140px] resize-y placeholder:text-zinc-700"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o objetivo deste checklist..."
                />
              </div>
            </div>
          </section>
        </div>

        {/* Itens do Checklist */}
        <div className="w-full space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[500px] shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-zinc-800 bg-zinc-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-orange-500 shadow-inner">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">
                    Itens do Protocolo
                  </h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">
                    Escopo de Verificação
                  </p>
                </div>
              </div>
              <button
                onClick={addItem}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl transition shadow-lg active:scale-95 font-black text-[10px] uppercase tracking-widest"
              >
                <Plus size={16} />
                Adicionar Item
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar flex-1">
              {itens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 space-y-4">
                  <ClipboardCheck size={48} className="text-zinc-600" />
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500 italic">Nenhum item adicionado</p>
                  <button
                    onClick={addItem}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                  >
                    Adicionar Primeiro Item
                  </button>
                </div>
              ) : (
                itens.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 group relative grid grid-cols-1 md:grid-cols-12 gap-6 items-end hover:border-orange-500/20 transition-all border-l-4 border-l-orange-600/10 hover:border-l-orange-600"
                  >
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl z-10"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="md:col-span-1 flex items-center justify-center h-full">
                      <span className="text-2xl font-black text-zinc-800 font-mono italic">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div className="md:col-span-6 space-y-2">
                      <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-5 text-[11px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-700"
                        value={item.descricao}
                        onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                        placeholder="EX: VERIFICAR NÍVEL DE ÓLEO"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-1 text-center block">
                        Tipo
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-5 text-[10px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner appearance-none cursor-pointer pr-10"
                          value={item.tipo}
                          onChange={(e) => updateItem(item.id, 'tipo', e.target.value)}
                        >
                          <option value="SIM_NAO">OPÇÃO: SIM/NÃO</option>
                          <option value="TEXTO">OPÇÃO: TEXTO LIVRE</option>
                          <option value="NUMERO">OPÇÃO: VALOR NUMÉRICO</option>
                          <option value="FOTO">OPÇÃO: REGISTRO FOTO</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col items-center justify-center gap-2">
                      <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] leading-none">
                        Obrigatório
                      </label>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, 'obrigatorio', !item.obrigatorio)}
                        className={`w-14 h-8 rounded-full p-1 transition-all flex items-center ${
                          item.obrigatorio ? 'bg-orange-600 justify-end' : 'bg-zinc-800 justify-start'
                        }`}
                      >
                        <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 sm:p-8 border-t border-zinc-800 bg-zinc-950/20 text-center">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] italic">
                Total de {itens.length} Procedimentos
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-zinc-950/95 border-t border-zinc-800 p-4 flex gap-3 z-40 backdrop-blur-md">
        <Link
          href="/checklist"
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1"
        >
          <ChevronLeft size={16} /> Voltar
        </Link>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-[2] min-h-[48px] bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Criar Protocolo
        </button>
      </div>
    </div>
  );
}
