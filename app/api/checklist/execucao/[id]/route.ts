'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Save, Loader2, CheckCircle2, XCircle, 
  Camera, FileText, Hash, User, ClipboardCheck, 
  AlertCircle, ChevronRight, AlertTriangle, XOctagon,
  PenTool, RefreshCw, Eye, ShieldAlert, Check, CheckSquare,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  descricao: string;
  tipo: 'SIM_NAO' | 'FOTO' | 'TEXTO' | 'NUMERICO' | 'NUMERO';
  obrigatorio: boolean;
}

interface Checklist {
  id: string;
  nome: string;
  itens: ChecklistItem[];
}

const TIPO_VEICULOS = [
  { id: 'CAVALO_MECANICO', label: '🚚 Cavalo Mecânico' },
  { id: 'CARRETA', label: '🚛 Carreta' },
  { id: 'ONIBUS', label: '🚌 Ônibus / Coletivo' },
  { id: 'CAMINHAO_PESADO', label: '🚚 Caminhão Pesado (Truck)' },
  { id: 'UTILITARIO', label: '🚐 Utilitário / Van' },
  { id: 'ESCAVADEIRA_HIDRAULICA', label: '🚜 Escavadeira / Máquinas' },
  { id: 'OUTROS', label: '🚗 Outros' }
];

function normalizarChecklist(raw: any): Checklist | null {
  if (!raw || !raw.id) return null;
  const itensBrutos = raw?.itens ?? raw?.ChecklistItem ?? [];
  const itens = Array.isArray(itensBrutos) ? itensBrutos : [];
  return {
    id: String(raw.id),
    nome: String(raw.nome ?? '—'),
    itens: itens.map((i: any) => ({
      id: String(i.id),
      descricao: String(i.descricao ?? ''),
      tipo: i.tipo || 'TEXTO',
      obrigatorio: i.obrigatorio !== false,
    })),
  };
}

function isTipoNumerico(tipo: string): boolean {
  return tipo === 'NUMERO' || tipo === 'NUMERICO';
}

export default function ExecutarFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // ✅ Garante que o ID está sendo lido corretamente
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id as string;
  const osIdFromQuery = searchParams?.get('osId') || searchParams?.get('os_id');

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [executadoPor, setExecutadoPor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ordens, setOrdens] = useState<any[]>([]);
  const [osId, setOsId] = useState<string>(osIdFromQuery || '');

  const [tipoVeiculo, setTipoVeiculo] = useState('CAVALO_MECANICO');
  const [laudoVeredito, setLaudoVeredito] = useState<'CONFORME' | 'NAO_CONFORME'>('CONFORME');
  const [signatureDrawing, setSignatureDrawing] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    fetch('/api/ordens', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : data.items || [];
        setOrdens(lista);
      })
      .catch(() => {});
  }, []);

  const fetchChecklist = useCallback(async () => {
    // ✅ Se não tiver ID, para o loading e volta
    if (!id) {
      setLoading(false);
      toast.error('ID do checklist não informado na URL.');
      router.push('/checklist');
      return;
    }

    setLoading(true);
    try {
      // ✅ Adicionado cache: 'no-store' para evitar cache do Next.js
      const res = await fetch(`/api/checklist/${id}`, { 
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const raw = await res.json();
        const normalizado = normalizarChecklist(raw);
        
        if (!normalizado) {
          toast.error('Protocolo de inspeção inválido.');
          router.push('/checklist');
          return;
        }
        
        setChecklist(normalizado);
      } else {
        toast.error('Erro ao carregar protocolo de inspeção.');
        router.push('/checklist');
      }
    } catch {
      toast.error('Falha de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // ... (O RESTANTE DO SEU ARQUIVO CONTINUA IGUAL: useEffect do draft, handleRespostaChange, startDrawing, etc...)
  
  // Para não cortar a lógica, você pode colar o restante do seu arquivo original aqui
  // A única mudança é a função fetchChecklist acima e a linha do 'id'

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4 text-white bg-zinc-950">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] italic">
          Preparando Formulário Técnico...
        </p>
      </div>
    );
  }

  if (!checklist) return null;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-10 pb-20 py-4 sm:py-8 overflow-hidden text-white min-h-screen">
      {/* ... (O SEU JSX ORIGINAL CONTINUA AQUI) ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/checklist"
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter line-clamp-1">
              {checklist.nome}
            </h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">
              EXECUÇÃO DE INSPEÇÃO
            </p>
          </div>
        </div>
        
        <button
          onClick={handleFinalizar}
          disabled={saving}
          className="hidden md:flex bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 disabled:opacity-50 items-center justify-center gap-3 italic shadow-orange-950/20 shrink-0"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
          FINALIZAR E PUBLICAR LAUDO
        </button>
      </div>

      {/* ... (Restante do JSX) ... */}
      {/* COLE O RESTO DO SEU JSX AQUI (A partir do <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">) */}
      
    </div>
  );
}
