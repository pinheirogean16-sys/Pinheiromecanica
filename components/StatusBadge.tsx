import React from 'react';
import { OrdemServico_status as StatusOS } from '@prisma/client';

interface StatusBadgeProps {
  status: StatusOS;
}

const statusConfig: Record<StatusOS, { label: string; classes: string }> = {
  ABERTA: { label: 'Aberta', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  EM_DIAGNOSTICO: { label: 'Diagnóstico', classes: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  AGUARDANDO_PECAS: { label: 'Ag. Peças', classes: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  EM_EXECUCAO: { label: 'Em Execução', classes: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  AGUARDANDO_APROVACAO: { label: 'Ag. Aprovação', classes: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  FINALIZADA: { label: 'Finalizada', classes: 'bg-green-500/10 text-green-500 border-green-500/20' },
  ENTREGUE: { label: 'Entregue', classes: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
  CANCELADA: { label: 'Cancelada', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.ABERTA;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.classes}`}>
      {config.label}
    </span>
  );
};
