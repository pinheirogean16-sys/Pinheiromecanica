'use client';

import { useRouter } from 'next/navigation';
import { Wrench, Users, Car, FileText, CheckCircle2, ChevronRight, Package } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export default function BemVindoPage() {
  const router = useRouter();

  const passos = [
    { icon: <Users size={24} />, title: '1. Cadastre seus Clientes', desc: 'Vá na aba "Clientes" e adicione o proprietário do veículo.' },
    { icon: <Car size={24} />, title: '2. Adicione os Veículos', desc: 'Vincule a placa e o modelo do caminhão ou máquina ao cliente.' },
    { icon: <Package size={24} />, title: '3. Configure o Estoque', desc: 'Cadastre as peças que você usa para ter controle de entrada e saída.' },
    { icon: <FileText size={24} />, title: '4. Abra sua primeira OS', desc: 'Vá em "Ordens de Serviço", crie uma nova e adicione serviços e peças.' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-orange-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-orange-900/20 mb-6">
            <Wrench size={40} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter">
            Bem-vindo à {BRANDING.name}
          </h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Sua conta foi criada com sucesso! Preparamos um guia rápido para você começar a rodar sua oficina agora mesmo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {passos.map((passo, index) => (
            <div key={index} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-orange-500 shadow-inner">
                {passo.icon}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{passo.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{passo.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-emerald-500/20 p-6 rounded-3xl flex items-start gap-4">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Tudo Pronto!</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Antes de começar, recomendamos que você vá em <strong>Configurações</strong> e preencha o CNPJ, endereço e a logo da sua empresa para que saiam corretos nos PDFs.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2"
        >
          Começar a Usar o Sistema
          <ChevronRight size={18} />
        </button>

      </div>
    </div>
  );
}
