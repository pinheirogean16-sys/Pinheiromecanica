import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function roundDecimal(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseHoras(val: string): number {
  if (!val) return 0;
  if (val.includes(':')) {
    const [h, m] = val.split(':').map(Number);
    return (h || 0) + ((m || 0) / 60);
  }
  return parseFloat(val) || 0;
}

export function formatHoras(val: number): string {
  if (!val && val !== 0) return '0:00';
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}
