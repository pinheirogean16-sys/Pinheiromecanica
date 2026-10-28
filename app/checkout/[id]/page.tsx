'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, CheckCircle2, ShieldCheck, Loader2, ArrowLeft, QrCode } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Busca os dados do pagamento
  const fetchPayment = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/pagamento/status/${params.id}`, { silentError: true });
      setPayment(data);
      return data;
    } catch (err: any) {
      // Se der erro 404, significa que o pagamento não existe ou o ID está errado
      if (err?.status === 404) {
        toast.error('Cobrança não encontrada.');
        router.push('/configuracoes/plano');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  // ✅ VERIFICAÇÃO AUTOMÁTICA (POLLING)
  useEffect(() => {
    // Se não tem pagamento, ou se já está pago, não faz nada
    if (!payment || payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') return;

    const interval = setInterval(async () => {
      const updated = await fetchPayment();
      if (updated?.status === 'RECEIVED' || updated?.status === 'CONFIRMED') {
        clearInterval(interval);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(interval);
  }, [payment, fetchPayment]);

  // Redireciona se o pagamento for confirmado
  useEffect(() => {
    if (payment?.status === 'RECEIVED' || payment?.status === 'CONFIRMED') {
      toast.success('Pagamento confirmado! Bem-vindo ao PRO.', { duration: 5000 });
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  }, [payment?.status, router]);

  const handleCopyPix = () => {
    if (payment?.pixCopiaECola) {
      navigator.clipboard.writeText(payment.pixCopiaECola);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gerando Checkout Seguro...</p>
      </div>
    );
  }

  if (!payment) return null;

  // Tela de Sucesso (caso o cliente pague e o polling demore para redirecionar)
  if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tight mb-2">Pagamento Aprovado!</h1>
        <p className="text-zinc-400 text-sm font-medium">Sua conta foi atualizada para o Plano PRO. Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      
      {/* Botão Voltar */}
      <div className="w-full max-w-lg mb-6">
        <Link href="/configuracoes/plano" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Voltar para Planos
        </Link>
      </div>

      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
        {/* Efeitos de fundo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
            <QrCode className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">Pagamento Seguro</h1>
          <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-widest">
            Assinatura VEHLOX - Plano PRO
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-8 text-center relative z-10 shadow-inner">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Valor a Pagar</p>
          <p className="text-4xl font-black text-white font-mono tracking-tighter">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value)}
          </p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Vencimento: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}</p>
        </div>

        {payment.billingType === 'PIX' && payment.pixQrCode && (
          <div className="space-y-6 relative z-10">
            {/* QR Code em card branco para facilitar a leitura da câmera */}
            <div className="bg-white p-4 rounded-2xl w-64 h-64 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.15)] ring-4 ring-orange-500/20">
              <img src={`data:image/png;base64,${payment.pixQrCode}`} alt="QR Code PIX" className="w-full h-full object-contain" />
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Ou copie o código abaixo</p>
              <button
                onClick={handleCopyPix}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
              >
                {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} className="group-hover:scale-110 transition-transform" />}
                {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest relative z-10">
          <ShieldCheck size={14} className="text-green-500" />
          Ambiente 100% Criptografado via Asaas
        </div>
      </div>
    </div>
  );
}
