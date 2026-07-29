'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface TableVirtualizerProps<T> {
  items: T[];
  estimateSize?: number;
  maxHeight?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function TableVirtualizer<T>({
  items = [],
  estimateSize = 52,
  maxHeight = '450px',
  renderItem,
}: TableVirtualizerProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      style={{
        maxHeight,
        overflowY: 'auto',
        width: '100%',
        position: 'relative',
      }}
      className="scroll-modern"
    >
      {items.length === 0 ? (
        <div className="text-center py-10 text-xs text-zinc-500 uppercase tracking-widest font-black">
          Nenhum registro encontrado
        </div>
      ) : (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderItem(item, virtualRow.index)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
