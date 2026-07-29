'use client';

import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = React.memo(({ page, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift('...');
    }
    if (page + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div className="flex items-center gap-2 justify-center mt-8 py-4 border-t border-zinc-800/50">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:border-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
      >
        Anterior
      </button>
      
      <div className="flex items-center gap-2">
        {getVisiblePages().map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} className="text-zinc-600 font-black">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-90 shadow-lg ${
                page === p 
                  ? 'bg-orange-600 text-white shadow-orange-950/20' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'
              }`}
            >
              {p}
            </button>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:border-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
      >
        Próximo
      </button>
    </div>
  );
});

Pagination.displayName = 'Pagination';
