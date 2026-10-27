'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, User, Monitor, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };
type Mode = 'sistema' | 'mecanico';

export default function IaSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('sistema');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ CAMINHO DA SUA IMAGEM (salve a imagem como public/vehly-avatar.png)
  const vehlyAvatar = '/vehly-avatar.png'; 

  const getWelcomeMessage = (m: Mode) => {
    return m === 'sistema'
      ? 'Olá! Sou a **Vehly**. Estou aqui para te ajudar a usar o sistema VEHLOX. O que você precisa saber? 💻'
      : 'Olá, chefe! Sou o **Mecânico IA**. Descreva o sintoma do veículo (não esqueça de dizer o modelo) e eu te ajudo a diagnosticar. 🔧';
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setMessages([{ role: 'assistant', content: getWelcomeMessage(newMode) }]);
    setInput('');
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(mode) }]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch<{ resposta: string }>('/api/ia/suporte', {
        method: 'POST',
        body: { mode, messages: newMessages },
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.resposta }]);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'A IA está indisponível no momento.' });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ BOTÃO FLUTUANTE (Nome em cima + Avatar embaixo) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[99999] flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        title="Falar com a Vehly AI"
      >
        {/* Etiqueta com o Nome */}
        <span className="px-2.5 py-1 bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md text-[9px] font-black text-orange-400 uppercase tracking-widest rounded-full shadow-lg whitespace-nowrap">
          Vehly AI
        </span>

        {/* Avatar Redondo */}
        <div className="relative w-16 h-16 bg-zinc-900 border-2 border-orange-500 rounded-full shadow-2xl shadow-orange-900/40 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
          <img 
            src={vehlyAvatar} 
            alt="Vehly AI" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // Fallback caso a imagem não exista
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';
            }}
          />
          {/* Bolinha verde de "Online" */}
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
        </div>
      </button>

      {/* JANELA DO CHAT */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[99999] w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header com Abas */}
          <div className="bg-zinc-950 border-b border-zinc-800 shrink-0">
            <div className="p-4 flex justify-between items-center pb-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* Imagem no Cabeçalho */}
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border border-zinc-700 shadow-lg">
                    <img src={vehlyAvatar} alt="Vehly" className="w-full h-full object-cover" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Vehly AI</h3>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">IA Integrada • Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-full transition">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-4 gap-2 pb-2">
              <button
                onClick={() => handleModeChange('sistema')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'sistema' ? 'bg-orange-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800'
                }`}
              >
                <Monitor size={14} /> Sistema
              </button>
              <button
                onClick={() => handleModeChange('mecanico')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'mecanico' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800'
                }`}
              >
                <Wrench size={14} /> Mecânico
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-900/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  // Imagem nas mensagens da IA
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-1 border border-zinc-700 bg-zinc-800">
                    <img src={vehlyAvatar} alt="Vehly" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 text-white rounded-tr-sm shadow-md border border-zinc-700' 
                    : 'bg-zinc-900 text-zinc-200 rounded-tl-sm border border-zinc-800 shadow-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center shrink-0 mt-1">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-1 border border-zinc-700 bg-zinc-800">
                  <img src={vehlyAvatar} alt="Vehly" className="w-full h-full object-cover" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex space-x-1.5 items-center h-4">
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${mode === 'sistema' ? 'bg-orange-500' : 'bg-purple-500'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${mode === 'sistema' ? 'bg-orange-500' : 'bg-purple-500'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${mode === 'sistema' ? 'bg-orange-500' : 'bg-purple-500'}`} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'sistema' ? "Ex: Como cadastrar um cliente?" : "Ex: Caminhão Volvo FH460 falhando na subida..."}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500 transition placeholder:text-zinc-600"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`p-3 text-white rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 ${mode === 'sistema' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-purple-600 hover:bg-purple-500'}`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
