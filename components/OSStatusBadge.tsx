'use client';

import { OrdemServico_status as StatusOS } from '@prisma/client';

export const statusColors: Record<StatusOS, string> = {
  ABERTA: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  EM_DIAGNOSTICO: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  AGUARDANDO_PECAS: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  EM_EXECUCAO: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  AGUARDANDO_APROVACAO: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  FINALIZADA: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  ENTREGUE: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  CANCELADA: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export const statusLabels: Record<StatusOS, string> = {
  ABERTA: 'Aberta',
  EM_DIAGNOSTICO: 'Em Diagnóstico',
  AGUARDANDO_PECAS: 'Aguardando Peças',
  EM_EXECUCAO: 'Em Execução',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  FINALIZADA: 'Finalizada',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

export function OSStatusBadge({ status }: { status: StatusOS }) {
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border tracking-tighter ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
