import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string | number;
  amount?: string;
  icon: LucideIcon;
  color: string;
}

export const StatusCard = ({ title, value, amount, icon: Icon, color }: StatusCardProps) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
        <Icon size={18} className={color.replace('bg-', 'text-')} />
      </div>
      {amount && <span className="text-[10px] font-mono text-zinc-500">{amount}</span>}
    </div>
    <div>
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl font-black text-white tracking-tight">{value}</h3>
    </div>
  </div>
);
