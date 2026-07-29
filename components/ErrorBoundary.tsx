'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-zinc-950 border border-red-500/20 rounded-[2rem] space-y-4 max-w-2xl mx-auto my-12 text-center shadow-2xl animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">
              {this.props.fallbackTitle || 'MÓDULO TEMPORARIAMENTE INDISPONÍVEL'}
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              {this.props.fallbackMessage || 'Houve uma falha ao renderizar este painel ou processar os dados da API.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-650 hover:bg-red-550 border border-red-500/30 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Recarregar Módulo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
