'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import WorkOrderTypeSelector from '@/components/WorkOrderTypeSelector';
import WorkOrderOffice from '@/components/WorkOrderOffice';
import WorkOrderField from '@/components/WorkOrderField';

export default function NovaOSPage() {
  const router = useRouter();
  const [tipoOS, setTipoOS] = useState<'OFICINA' | 'CAMPO' | null>(null);

  // Função para voltar ao passo anterior
  const handleBack = () => {
    if (tipoOS) {
      setTipoOS(null); // Se estiver em um formulário, volta para a seleção
    } else {
      router.back(); // Se estiver na seleção, volta para a página anterior (ex: dashboard)
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-20 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex items-center gap-4">
        <button 
          onClick={handleBack} 
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition cursor-pointer"
          title="Voltar"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight italic">
            Nova Ordem de Serviço
          </h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">
            {tipoOS === 'OFICINA' ? 'Fluxo de Oficina' : tipoOS === 'CAMPO' ? 'Fluxo de Campo' : 'Selecione o tipo de atendimento'}
          </p>
        </div>
      </div>

      {/* Conteúdo da Página (Seleção ou Formulário) */}
      <div>
        {!tipoOS && (
          <WorkOrderTypeSelector onSelect={(type) => setTipoOS(type)} />
        )}

        {tipoOS === 'OFICINA' && (
          <WorkOrderOffice onBack={() => setTipoOS(null)} />
        )}

        {tipoOS === 'CAMPO' && (
          <WorkOrderField onBack={() => setTipoOS(null)} />
        )}
      </div>
    </div>
  );
}
