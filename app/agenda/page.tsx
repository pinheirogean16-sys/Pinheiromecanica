'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, ChevronLeft, ChevronRight, Filter, X, 
  Calendar as CalendarIcon, Clock, User as UserIcon, 
  Wrench, Car, FileText, Loader2, Save, Trash2, 
  LayoutGrid, List, Maximize2, AlertTriangle, ShieldCheck, Box
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  isToday, parseISO, startOfDay, endOfDay, addDays, subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const TIPOS_EVENTO = [
  { id: 'OS', label: 'Ordem de Serviço', color: 'bg-blue-600', text: 'text-blue-500' },
  { id: 'REVISAO', label: 'Revisão', color: 'bg-green-600', text: 'text-green-500' },
  { id: 'MANUTENCAO_PREVENTIVA', label: 'Mnt. Preventiva', color: 'bg-yellow-600', text: 'text-yellow-500' },
  { id: 'VISTORIA', label: 'Vistoria', color: 'bg-orange-600', text: 'text-orange-500' },
  { id: 'ENTREGA', label: 'Entrega', color: 'bg-purple-600', text: 'text-purple-500' },
  { id: 'OUTRO', label: 'Outro', color: 'bg-zinc-600', text: 'text-zinc-600' },
];

const STATUS_EVENTO = [
  { id: 'AGENDADO', label: 'Agendado' },
  { id: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { id: 'CONCLUIDO', label: 'Concluído' },
  { id: 'CANCELADO', label: 'Cancelado' },
];

const BAYS_OFICINA = [
  { id: 'BOX_01', label: 'Elevador 01 (Heavy Duty)' },
  { id: 'BOX_02', label: 'Elevador 02 (Truck Mast)' },
  { id: 'BOX_03', label: 'Vala Técnica 03 (Alinhamento)' },
  { id: 'BOX_04', label: 'Box Diagnóstico Rápido 04' },
  { id: 'BOX_EXTERNO', label: 'Pátio Externo' }
];

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>(TIPOS_EVENTO.map(t => t.id));
  const [filtroMecanico, setFiltroMecanico] = useState('');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Dados auxiliares para o modal
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);

  // Drag and Drop State simulator (For rapid date moves)
  const [movingEventId, setMovingEventId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      let start, end;
      if (view === 'month') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      } else if (view === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
      }

      // Expand temporal boundaries
      const queryStart = subDays(start, 7).toISOString();
      const queryEnd = addDays(end, 7).toISOString();

      const params = new URLSearchParams({
        start: queryStart,
        end: queryEnd,
      });

      if (filtroMecanico) params.append('mecanico_id', filtroMecanico);

      const res = await fetch(`/api/agenda?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : (data.items || []));
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, filtroMecanico]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load auxiliary data on modal open
  useEffect(() => {
    if (showModal) {
      const loadExtras = async () => {
        try {
          const [cRes, mRes, vRes, oRes] = await Promise.all([
            fetch('/api/clientes'),
            fetch('/api/usuarios'),
            fetch('/api/veiculos'),
            fetch('/api/ordens')
          ]);
          if (cRes.ok) {
            const data = await cRes.json();
            setClientes(Array.isArray(data) ? data : (data.items || []));
          }
          if (mRes.ok) {
            const data = await mRes.json();
            const users = Array.isArray(data) ? data : (data.items || []);
            setMecanicos(users.filter((u: any) => u.role === 'MECANICO' || u.role === 'LIDER' || u.role === 'ADMIN'));
          }
          if (vRes.ok) {
            const vData = await vRes.json();
            setVeiculos(vData.items || (Array.isArray(vData) ? vData : []));
          }
          if (oRes.ok) {
            const oData = await oRes.json();
            setOrdens(oData.items || (Array.isArray(oData) ? oData : []));
          }
        } catch (err) {
          console.error('Erro ao carregar extras:', err);
        }
      };
      loadExtras();
    }
  }, [showModal]);

  const handlePrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  // Parses description prefix values: [BOX:BOX_01|DUR:2h] Raw text...
  const parsePrefixInfo = (desc: string) => {
    if (!desc) return { box: 'BOX_01', duracao: '2h', realDesc: '' };
    const match = desc.match(/^\[BOX:(.*?)\|DUR:(.*?)\]\s*(.*)/);
    if (match) {
      return {
        box: match[1],
        duracao: match[2],
        realDesc: match[3]
      };
    }
    return { box: 'BOX_01', duracao: '2h', realDesc: desc };
  };

  // Compile full string for database standard storage
  const buildPrefixDesc = (box: string, duracao: string, realDesc: string) => {
    return `[BOX:${box || 'BOX_01'}|DUR:${duracao || '2h'}] ${realDesc || ''}`;
  };

  // Front-end high-performance conflict detection
  const checkConflict = (eventID: string | null, startStr: string, endStr: string, mecanicoID: string | null, boxID: string | null) => {
    if (!startStr || !endStr) return { hasConflict: false, reason: '' };
    const startA = new Date(startStr).getTime();
    const endA = new Date(endStr).getTime();

    for (const other of events) {
      if (other.id === eventID) continue; // Skip comparing to itself
      if (other.status === 'CANCELADO') continue;

      const startB = new Date(other.data_inicio).getTime();
      const endB = new Date(other.data_fim).getTime();

      // Check overlap: (StartA < EndB) AND (EndA > StartB)
      if (startA < endB && endA > startB) {
        // Mechanic conflict
        if (mecanicoID && other.mecanico_id === mecanicoID) {
          const mName = other.mecanico?.name || 'outro técnico';
          return { hasConflict: true, reason: `Conflito de agenda: o mecânico ${mName} já está alocado neste período.` };
        }
        
        // Bay / Box conflict
        const otherMeta = parsePrefixInfo(other.descricao);
        if (boxID && otherMeta.box === boxID && boxID !== 'BOX_EXTERNO') {
          const boxLabel = BAYS_OFICINA.find(b => b.id === boxID)?.label || boxID;
          return { hasConflict: true, reason: `Conflito de Box: o espaço ${boxLabel} já está ocupado por outro veículo.` };
        }
      }
    }
    return { hasConflict: false, reason: '' };
  };

  const openNewEvent = (date?: Date) => {
    const start = date ? startOfDay(date) : startOfDay(new Date());
    start.setHours(8, 0, 0, 0); // Start slot
    const end = new Date(start);
    end.setHours(10, 0, 0, 0); // +2h duration estimation

    setSelectedEvent({
      titulo: '',
      realDesc: '',
      box: 'BOX_01',
      duracao: '2h',
      data_inicio: format(start, "yyyy-MM-dd'T'HH:mm"),
      data_fim: format(end, "yyyy-MM-dd'T'HH:mm"),
      tipo: 'OS',
      status: 'AGENDADO',
      cor: 'bg-blue-600',
      cliente_id: '',
      veiculo_id: '',
      mecanico_id: '',
      os_id: ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDragOverSimulator = (eventId: string) => {
    setMovingEventId(eventId);
    toast.message('Modo Planejamento Ativo: Clique em qualquer dia para reposicionar o agendamento.');
  };

  const handleDropSimulator = async (targetDate: Date) => {
    if (!movingEventId) return;

    try {
      const targetEvent = events.find(e => e.id === movingEventId);
      if (!targetEvent) return;

      const durationMs = new Date(targetEvent.data_fim).getTime() - new Date(targetEvent.data_inicio).getTime();
      const newStart = startOfDay(targetDate);
      newStart.setHours(new Date(targetEvent.data_inicio).getHours());
      newStart.setMinutes(new Date(targetEvent.data_inicio).getMinutes());

      const newEnd = new Date(newStart.getTime() + durationMs);

      // Perform conflict check before saving
      const targetPrefix = parsePrefixInfo(targetEvent.descricao);
      const conflict = checkConflict(movingEventId, newStart.toISOString(), newEnd.toISOString(), targetEvent.mecanico_id, targetPrefix.box);
      if (conflict.hasConflict) {
        toast.warning(`Detecção de Colisão: ${conflict.reason}`, { duration: 5200 });
      }

      const res = await fetch(`/api/agenda/${movingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: targetEvent.titulo,
          descricao: targetEvent.descricao,
          tipo: targetEvent.tipo,
          status: targetEvent.status,
          cor: targetEvent.cor,
          data_inicio: newStart.toISOString(),
          data_fim: newEnd.toISOString(),
          cliente_id: targetEvent.cliente_id,
          veiculo_id: targetEvent.veiculo_id,
          mecanico_id: targetEvent.mecanico_id,
          os_id: targetEvent.os_id
        }),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success('Agendamento remanejado com sucesso!');
        loadEvents();
      } else {
        toast.error('Erro ao reposicionar o agendamento.');
      }
    } catch (e) {
      toast.error('Comunicação falhou.');
    } finally {
      setMovingEventId(null);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      // Build serialized prefix description
      const fullDesc = buildPrefixDesc(selectedEvent.box, selectedEvent.duracao, selectedEvent.realDesc);
      
      const payload = {
        titulo: selectedEvent.titulo,
        descricao: fullDesc,
        tipo: selectedEvent.tipo,
        status: selectedEvent.status,
        cor: TIPOS_EVENTO.find(t => t.id === selectedEvent.tipo)?.color || 'bg-zinc-650',
        data_inicio: new Date(selectedEvent.data_inicio).toISOString(),
        data_fim: new Date(selectedEvent.data_fim).toISOString(),
        cliente_id: selectedEvent.cliente_id || null,
        veiculo_id: selectedEvent.veiculo_id || null,
        mecanico_id: selectedEvent.mecanico_id || null,
        os_id: selectedEvent.os_id || null,
      };

      // Conflict warning popup
      const conflict = checkConflict(selectedEvent.id || null, payload.data_inicio, payload.data_fim, selectedEvent.mecanico_id, selectedEvent.box);
      if (conflict.hasConflict) {
        if (!confirm(`⚠️ ATENÇÃO: ${conflict.reason}\nDeseja continuar mesmo assim e forçar a sobreposição?`)) {
          setModalLoading(false);
          return;
        }
      }

      const method = selectedEvent.id ? 'PUT' : 'POST';
      const url = selectedEvent.id ? `/api/agenda/${selectedEvent.id}` : '/api/agenda';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success(selectedEvent.id ? 'Registro atualizado no terminal operacional!' : 'Operação protocolada!');
        setShowModal(false);
        setSelectedEvent(null);
        setIsEditing(false);
        loadEvents();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Erro ao efetivar agendamento.');
      }
    } catch (err) {
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Deseja realmente expurgar este agendamento operacional?')) return;
    setModalLoading(true);
    try {
      const res = await fetch(`/api/agenda/${selectedEvent.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Agendamento expurgado!');
        setShowModal(false);
        setSelectedEvent(null);
        setIsEditing(false);
        loadEvents();
      } else {
        toast.error('Erro ao deletar agendamento.');
      }
    } catch (err) {
      toast.error('Falha de comunicação.');
    } finally {
      setModalLoading(false);
    }
  };

  // Month compilation variables
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  // Front-end visual filtering based on checkbox select + technicians
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesTipo = filtrosTipo.includes(e.tipo);
      const matchesMecanico = filtroMecanico ? e.mecanico_id === filtroMecanico : true;
      return matchesTipo && matchesMecanico;
    });
  }, [events, filtrosTipo, filtroMecanico]);

  const getEventStyle = (tipo: string) => {
    return TIPOS_EVENTO.find(t => t.id === tipo)?.color || 'bg-zinc-650';
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden bg-zinc-950 text-white min-h-screen">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-orange-600 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
            <h1 className="text-3xl font-black uppercase tracking-tight italic">Agenda Operacional Oficina</h1>
          </div>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-1 ml-5">Pinheiro Diesel Pro Workspace Allocator</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {movingEventId && (
            <button 
              onClick={() => setMovingEventId(null)}
              className="bg-red-650 text-white rounded-2xl px-5 py-3 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 animate-pulse"
            >
              Cancelar Planejador Mover
            </button>
          )}

          <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-805 p-1 rounded-[2rem] shadow-xl h-full">
            <button 
              onClick={() => setView('month')} 
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${view === 'month' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              <LayoutGrid size={14} /> Mês
            </button>
            <button 
              onClick={() => setView('week')} 
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${view === 'week' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              <List size={14} /> Semana
            </button>
            <button 
              onClick={() => setView('day')} 
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${view === 'day' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              <Maximize2 size={14} /> Dia
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-full">
            <button onClick={handlePrev} className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl transition"><ChevronLeft size={16} /></button>
            <button onClick={handleToday} className="px-3 py-1 font-black text-[10px] text-zinc-550 hover:text-white uppercase transition tracking-widest italic">Hoje</button>
            <button onClick={handleNext} className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl transition"><ChevronRight size={16} /></button>
          </div>

          <button 
            onClick={() => openNewEvent()}
            className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-4 font-black text-xs uppercase tracking-widest transition shadow-xl shadow-orange-950/20 flex items-center gap-2 active:scale-95 shrink-0"
          >
            <Plus size={18} /> Agendar Box
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* FILTROS LATERAIS */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-8 space-y-8 shadow-2xl">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Filter size={14} className="text-orange-600" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Painel Operativo</h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Tipos de Serviço</p>
                  <div className="grid grid-cols-1 gap-2">
                    {TIPOS_EVENTO.map(tipo => (
                      <label key={tipo.id} className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={filtrosTipo.includes(tipo.id)} 
                            onChange={(e) => {
                              if (e.target.checked) setFiltrosTipo([...filtrosTipo, tipo.id]);
                              else setFiltrosTipo(filtrosTipo.filter(id => id !== tipo.id));
                            }}
                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-orange-600 focus:ring-orange-600/50 cursor-pointer"
                          />
                          <span className={`text-[10px] font-black uppercase truncate ${filtrosTipo.includes(tipo.id) ? 'text-white' : 'text-zinc-650'}`}>
                            {tipo.label}
                          </span>
                        </div>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${tipo.color}`} />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Alocação de Equipes</p>
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] text-white font-black uppercase tracking-widest cursor-pointer outline-none focus:border-orange-500"
                    value={filtroMecanico}
                    onChange={(e) => setFiltroMecanico(e.target.value)}
                  >
                    <option value="">TODOS OS TÉCNICOS</option>
                    {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-850 rounded-2xl p-5 text-center flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-black uppercase">Fila no Gráfico:</span>
              <span className="text-xl font-black text-orange-500 italic font-mono">{filteredEvents.length}</span>
            </div>
          </section>
        </div>

        {/* CALENDÁRIO GRID */}
        <div className="lg:col-span-9">
          <section className="bg-zinc-900/40 border border-zinc-850 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-6 border-b border-zinc-900 bg-zinc-950/20 flex items-center justify-between">
              <h2 className="text-lg font-black text-white uppercase tracking-widest italic">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              {loading && <Loader2 className="animate-spin text-orange-600 w-5 h-5" />}
            </div>

            {view === 'month' && (
              <div className="flex-1 flex flex-col">
                {/* HEADERS (DESKTOP) */}
                <div className="hidden md:grid grid-cols-7 border-b border-zinc-900 bg-zinc-950/10">
                  {weekDays.map(day => (
                    <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-650 uppercase tracking-widest italic">
                      {day}
                    </div>
                  ))}
                </div>

                {/* GRID DE MÊS (DESKTOP) */}
                <div className="hidden md:grid grid-cols-7 grid-rows-6 auto-rows-fr select-none">
                  {days.map((day) => {
                    const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.data_inicio), day));
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayTag = isToday(day);

                    return (
                      <div 
                        key={day.toISOString()} 
                        onClick={() => {
                          if (movingEventId) {
                            handleDropSimulator(day);
                          } else {
                            openNewEvent(day);
                          }
                        }}
                        className={`min-h-[110px] border-r border-b border-zinc-900 p-2.5 space-y-1 relative group cursor-pointer transition ${!isCurrentMonth ? 'opacity-10' : ''} ${movingEventId ? 'hover:bg-orange-500/10 border-orange-500/20' : 'hover:bg-zinc-900/30'}`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[11px] font-mono font-black ${isTodayTag ? 'bg-orange-650 text-white w-5 h-5 flex items-center justify-center rounded-md font-bold' : 'text-zinc-600'}`}>
                            {format(day, 'dd')}
                          </span>
                        </div>

                        <div className="space-y-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map(event => {
                            const meta = parsePrefixInfo(event.descricao);
                            
                            // Check fast conflict badge
                            const conflict = checkConflict(event.id, event.data_inicio, event.data_fim, event.mecanico_id, meta.box);

                            return (
                              <div 
                                key={event.id}
                                onClick={(e) => { 
                                  e.stopPropagation();
                                  const metaInfo = parsePrefixInfo(event.descricao);
                                  setSelectedEvent({
                                    ...event,
                                    realDesc: metaInfo.realDesc,
                                    box: metaInfo.box,
                                    duracao: metaInfo.duracao
                                  }); 
                                  setIsEditing(false);
                                  setShowModal(true); 
                                }}
                                className={`p-1 pl-2 rounded flex items-center justify-between gap-1.5 cursor-pointer hover:brightness-125 transition ${getEventStyle(event.tipo)}`}
                              >
                                <span className="text-[8px] font-black text-white uppercase truncate tracking-tighter italic">
                                  {event.titulo} {conflict.hasConflict && '⚠️'}
                                </span>
                                {meta.box && (
                                  <span className="text-[7px] bg-black/40 text-white/80 px-1 py-0.5 rounded uppercase font-black tracking-widest font-mono">
                                    {(BAYS_OFICINA.find(b => b.id === meta.box)?.id || 'BOX').replace('BOX_', '')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[8px] text-zinc-650 font-black uppercase text-center font-mono">
                              + {dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TIMELINE VERTICAL (MOBILE) */}
                <div className="md:hidden flex flex-col p-4 sm:p-6 space-y-6 bg-zinc-950/40">
                  {(() => {
                    // Extract days of the current month
                    const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
                    
                    // Filter days of the month that have events or is today
                    const timelineDays = monthDays.filter(day => {
                      const hasEvents = filteredEvents.some(e => isSameDay(parseISO(e.data_inicio), day));
                      const isDayToday = isToday(day);
                      return hasEvents || isDayToday;
                    });

                    if (timelineDays.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40 space-y-4">
                          <CalendarIcon size={48} className="text-zinc-600" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Sem eventos neste mês</p>
                        </div>
                      );
                    }

                    return timelineDays.map(day => {
                      const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.data_inicio), day));
                      const isDayToday = isToday(day);

                      return (
                        <div key={day.toISOString()} className="space-y-3 pt-4 first:pt-0">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-mono font-black uppercase tracking-widest ${isDayToday ? 'text-orange-500' : 'text-zinc-400'}`}>
                                {format(day, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                              {isDayToday && (
                                <span className="bg-orange-650/20 text-orange-500 border border-orange-600/30 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                                  HOJE
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openNewEvent(day)}
                              className="text-[10px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest flex items-center gap-1 py-1.5 px-3 min-h-[44px] rounded-lg bg-zinc-900/50 border border-zinc-850 active:scale-95 transition"
                            >
                              <Plus size={12} /> Agendar
                            </button>
                          </div>

                          <div className="space-y-3">
                            {dayEvents.length === 0 ? (
                              <p className="text-[10px] text-zinc-600 uppercase font-black italic">Nenhum evento agendado para este dia</p>
                            ) : (
                              dayEvents.map(event => {
                                const meta = parsePrefixInfo(event.descricao);
                                const conflict = checkConflict(event.id, event.data_inicio, event.data_fim, event.mecanico_id, meta.box);

                                return (
                                  <div 
                                    key={event.id}
                                    onClick={() => {
                                      const metaInfo = parsePrefixInfo(event.descricao);
                                      setSelectedEvent({
                                        ...event,
                                        realDesc: metaInfo.realDesc,
                                        box: metaInfo.box,
                                        duracao: metaInfo.duracao
                                      }); 
                                      setIsEditing(false);
                                      setShowModal(true); 
                                    }}
                                    className="w-full min-w-0 break-words overflow-hidden rounded-xl bg-zinc-900 border border-zinc-805 p-4 flex flex-col gap-3 hover:border-orange-500/30 active:border-orange-500/50 transition cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${TIPOS_EVENTO.find(t => t.id === event.tipo)?.text} bg-zinc-950 border border-zinc-850`}>
                                        {TIPOS_EVENTO.find(t => t.id === event.tipo)?.label}
                                      </span>
                                      {meta.duracao && (
                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider font-mono">⏱️ {meta.duracao}</span>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <h4 className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter leading-tight">{event.titulo}</h4>
                                      {meta.box && (
                                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-wide">
                                          📍 {BAYS_OFICINA.find(b => b.id === meta.box)?.label || meta.box}
                                        </p>
                                      )}
                                      {conflict.hasConflict && (
                                        <div className="inline-block mt-1 text-[8px] bg-red-650 font-bold text-white px-2 py-0.5 rounded animate-pulse">⚠️ COLISÃO DE ESCOPO</div>
                                      )}
                                    </div>

                                    {meta.realDesc && (
                                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider line-clamp-2 leading-relaxed">
                                        {meta.realDesc}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-850 text-zinc-500 text-[9px] font-black uppercase tracking-widest italic leading-none">
                                      <span className="flex items-center gap-1"><Clock size={10} className="text-zinc-700" /> {format(parseISO(event.data_inicio), 'HH:mm')} - {format(parseISO(event.data_fim), 'HH:mm')}</span>
                                      {event.mecanico && <span className="flex items-center gap-1 truncate"><UserIcon size={10} className="text-zinc-700 shrink-0" /> <span className="truncate">{event.mecanico.name}</span></span>}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {(view === 'week' || view === 'day') && (
              <div className="p-4 sm:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/20 min-h-0 h-auto">
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 opacity-10 space-y-4">
                    <CalendarIcon size={100} className="text-zinc-500" />
                    <p className="text-xs font-black uppercase tracking-[0.8em] text-zinc-650 italic">Fila Vazia</p>
                  </div>
                ) : (
                  filteredEvents.map(event => {
                    const meta = parsePrefixInfo(event.descricao);
                    const conflict = checkConflict(event.id, event.data_inicio, event.data_fim, event.mecanico_id, meta.box);

                    return (
                      <div 
                        key={event.id}
                        className={`bg-zinc-900 border ${conflict.hasConflict ? 'border-red-650/40 bg-zinc-950' : 'border-zinc-800'} rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-orange-500/30 transition group shadow-inner`}
                      >
                        <div className="flex items-center gap-6 min-w-0 flex-1">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shrink-0 ${getEventStyle(event.tipo)}`}>
                            <span className="text-[10px] font-black text-white/50 leading-none uppercase">{format(parseISO(event.data_inicio), 'MMM', { locale: ptBR })}</span>
                            <span className="text-xl font-black text-white font-mono italic tracking-tighter">{format(parseISO(event.data_inicio), 'dd')}</span>
                          </div>
                          
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${TIPOS_EVENTO.find(t => t.id === event.tipo)?.text} bg-zinc-950 border border-zinc-800`}>
                                {TIPOS_EVENTO.find(t => t.id === event.tipo)?.label}
                              </span>
                              {meta.duracao && (
                                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-wider">⏱️ ESTIMADO: {meta.duracao}</span>
                              )}
                              {meta.box && (
                                <span className="text-[8px] font-black bg-zinc-950 text-orange-500 border border-zinc-800 px-2 py-0.5 rounded uppercase">
                                  📍 {BAYS_OFICINA.find(b => b.id === meta.box)?.label || meta.box}
                                </span>
                              )}
                              {conflict.hasConflict && (
                                <span className="text-[8px] bg-red-600 font-bold text-white px-2 py-0.5 rounded-md animate-pulse">⚠️ COLISÃO DE ESCOPO</span>
                              )}
                            </div>
                            
                            <h4 className="text-sm font-black text-white uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors truncate max-w-full">{event.titulo}</h4>
                            
                            {conflict.hasConflict && (
                              <p className="text-[9px] text-red-500 font-black uppercase tracking-tight">{conflict.reason}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-zinc-500 text-[10px] font-black uppercase tracking-widest italic leading-none">
                              <span className="flex items-center gap-1.5"><Clock size={12} className="text-zinc-700" /> {format(parseISO(event.data_inicio), 'HH:mm')} - {format(parseISO(event.data_fim), 'HH:mm')}</span>
                              {event.mecanico && <span className="flex items-center gap-1.5 truncate"><UserIcon size={12} className="text-zinc-700 shrink-0" /> <span className="truncate">{event.mecanico.name}</span></span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5 shrink-0">
                          {event.os && (
                            <div className="px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-center shadow-sm">
                              <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mb-1 leading-none">Vínculo Ativo</p>
                              <p className="text-xs font-black text-white italic font-mono tracking-tighter">OS #{event.os.numero}</p>
                            </div>
                          )}
                          
                          <button 
                            type="button" 
                            title="Remanejar Data (Planejador)"
                            onClick={() => handleDragOverSimulator(event.id)}
                            className="p-3 bg-zinc-950 border border-zinc-800 hover:border-orange-500 text-zinc-500 hover:text-white rounded-xl transition"
                          >
                            <CalendarIcon size={16} />
                          </button>

                          <button 
                            onClick={() => { 
                              const metaInfo = parsePrefixInfo(event.descricao);
                              setSelectedEvent({
                                ...event,
                                realDesc: metaInfo.realDesc,
                                box: metaInfo.box,
                                duracao: metaInfo.duracao
                              }); 
                              setIsEditing(false);
                              setShowModal(true); 
                            }}
                            className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-650 group-hover:text-white rounded-xl hover:bg-zinc-800 transition"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MODAL EVENTO */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600/10 text-orange-500 rounded-2xl border border-orange-600/20"><CalendarIcon size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                    {isEditing 
                      ? (selectedEvent?.id ? 'Gerenciamento de Alocações' : 'Protocolar Agendamento')
                      : 'Informações de Escopo'}
                  </h3>
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest leading-none mt-1">SISTEMA DE BOXES E ELEVADORES</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModal(false); setSelectedEvent(null); setIsEditing(false); }}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-550 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                
                {/* Real-time conflict validation indicator inside modal */}
                {(() => {
                  const conflict = checkConflict(selectedEvent.id || null, selectedEvent.data_inicio, selectedEvent.data_fim, selectedEvent.mecanico_id, selectedEvent.box);
                  if (conflict.hasConflict) {
                    return (
                      <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                        <div>
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Alerta de Colisão Detectado:</p>
                          <p className="text-[10px] text-zinc-400 uppercase mt-0.5 leading-relaxed">{conflict.reason}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="p-4 bg-green-950/20 border border-green-500/20 rounded-2xl flex items-center gap-3">
                      <ShieldCheck className="text-green-500" size={16} />
                      <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Box Livre e Técnico Elegível para o Escopo</p>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Título do Agendamento</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest"
                      value={selectedEvent.titulo}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, titulo: e.target.value })}
                      placeholder="EX: REVISÃO DE 50.000KM - SCANIA R440..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Tipo de Operação</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest cursor-pointer"
                      value={selectedEvent.tipo}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, tipo: e.target.value })}
                    >
                      {TIPOS_EVENTO.map(t => <option key={t.id} value={t.id}>{t.label.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Situação / Status</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest cursor-pointer"
                      value={selectedEvent.status}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, status: e.target.value })}
                    >
                      {STATUS_EVENTO.map(s => <option key={s.id} value={s.id}>{s.label.toUpperCase()}</option>)}
                    </select>
                  </div>

                  {/* SELECT BOX / ELEVADOR */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Alocação de Box / Elevador</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-bold cursor-pointer"
                      value={selectedEvent.box}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, box: e.target.value })}
                    >
                      {BAYS_OFICINA.map(b => (
                        <option key={b.id} value={b.id}>{b.label.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* ESTIMATIVA DURAÇÃO SLIDER / FIELD */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Estimativa de Duração Operacional</label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-bold cursor-pointer"
                      value={selectedEvent.duracao}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, duracao: e.target.value })}
                    >
                      <option value="1h">⏱️ 01 Hora de Serviço</option>
                      <option value="2h">⏱️ 02 Horas de Serviço</option>
                      <option value="4h">⏱️ 04 Horas de Serviço (Meio Turno)</option>
                      <option value="8h">⏱️ 08 Horas de Serviço (Turno Completo)</option>
                      <option value="12h">⏱️ 12 Horas de Serviço</option>
                      <option value="2 dias">⏱️ 02 Dias de Trabalho</option>
                      <option value="3 dias">⏱️ 03 Dias de Trabalho</option>
                      <option value="5 dias">⏱️ 05 Dias de Trabalho</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Data/Hora Início</label>
                    <input 
                      type="datetime-local" 
                      required 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-mono"
                      value={selectedEvent.data_inicio}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, data_inicio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Previsão Entrega</label>
                    <input 
                      type="datetime-local" 
                      required 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white font-mono"
                      value={selectedEvent.data_fim}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, data_fim: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Vincular Cliente</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500"
                      value={selectedEvent.cliente_id || ''}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, cliente_id: e.target.value })}
                    >
                      <option value="">NENHUM CLIENTE</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Veículo / Ativo</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500 animate-none"
                      value={selectedEvent.veiculo_id || ''}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, veiculo_id: e.target.value })}
                    >
                      <option value="">NENHUM VEÍCULO</option>
                      {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Técnico Encarregado</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500"
                      value={selectedEvent.mecanico_id || ''}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, mecanico_id: e.target.value })}
                    >
                      <option value="">NENHUM MECÂNICO</option>
                      {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Ordem de Serviço (Opcional)</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500"
                      value={selectedEvent.os_id || ''}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, os_id: e.target.value })}
                    >
                      <option value="">NENHUMA OS</option>
                      {ordens.map(o => <option key={o.id} value={o.id}>OS #{o.numero}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1 italic">Detalhamento da OS</label>
                    <textarea 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none h-28 resize-none uppercase font-bold"
                      value={selectedEvent.realDesc || ''}
                      onChange={(e) => setSelectedEvent({ ...selectedEvent, realDesc: e.target.value })}
                      placeholder="AVALIAÇÃO TÉCNICA RECOMENDADA..."
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4 pb-8">
                  {selectedEvent.id && (
                    <button 
                      type="button" 
                      onClick={handleDeleteEvent}
                      className="md:flex-1 py-5 bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition flex items-center justify-center gap-3 italic shrink-0"
                    >
                      <Trash2 size={18} /> Excluir Registro
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={modalLoading}
                    className="md:flex-1 py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg transition flex items-center justify-center gap-3 italic"
                  >
                    {modalLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                    {selectedEvent.id ? 'Sincronizar Atualização' : 'Efetivar Agendamento'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (selectedEvent.id) setIsEditing(false);
                      else { setShowModal(false); setSelectedEvent(null); }
                    }}
                    className="md:flex-1 py-5 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition flex items-center justify-center gap-3 italic"
                  >
                    <X size={18} /> Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                
                {(() => {
                  const conflict = checkConflict(selectedEvent.id, selectedEvent.data_inicio, selectedEvent.data_fim, selectedEvent.mecanico_id, selectedEvent.box);
                  if (conflict.hasConflict) {
                    return (
                      <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                        <div>
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Alerta de Colisão:</p>
                          <p className="text-[10px] text-zinc-350 uppercase mt-0.5 leading-relaxed">{conflict.reason}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Título do Agendamento</p>
                    <p className="text-xl font-black text-white uppercase italic tracking-tighter">{selectedEvent?.titulo || 'SEM TÍTULO'}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Tipo</p>
                      <span className={`inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${TIPOS_EVENTO.find(t => t.id === selectedEvent?.tipo)?.color || 'bg-zinc-600'} text-white`}>
                        {TIPOS_EVENTO.find(t => t.id === selectedEvent?.tipo)?.label || 'OUTRO'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Status de Oficina</p>
                      <span className="text-xs font-black text-white bg-zinc-950 px-3 py-1.5 border border-zinc-800 rounded-lg uppercase italic tracking-wider">{selectedEvent?.status || '---'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Data Inicial de Carga</p>
                      <div className="flex items-center gap-2 text-white font-mono text-sm italic">
                        <CalendarIcon size={14} className="text-orange-500 animate-pulse" />
                        {selectedEvent?.data_inicio ? format(parseISO(selectedEvent.data_inicio), 'dd/MM/yyyy HH:mm') : '---'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Previsão de Desocupação</p>
                      <div className="flex items-center gap-2 text-white font-mono text-sm italic">
                        <Clock size={14} className="text-orange-500" />
                        {selectedEvent?.data_fim ? format(parseISO(selectedEvent.data_fim), 'dd/MM/yyyy HH:mm') : '---'}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                      <p className="text-[9px] text-zinc-700 font-black uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={12} /> Cliente
                      </p>
                      <p className="text-xs font-black text-white uppercase italic truncate">
                        {selectedEvent?.cliente?.nome || clientes.find(c => c.id === selectedEvent?.cliente_id)?.nome || 'AVULSO'}
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                      <p className="text-[9px] text-zinc-700 font-black uppercase tracking-widest flex items-center gap-2">
                        <Car size={12} /> Veículo Placa
                      </p>
                      <p className="text-xs font-black text-white uppercase italic truncate">
                        {selectedEvent?.veiculo?.placa 
                          ? `${selectedEvent.veiculo.placa} - ${selectedEvent.veiculo.modelo || '---'}`
                          : (veiculos.find(v => v.id === selectedEvent?.veiculo_id)?.placa 
                              ? `${veiculos.find(v => v.id === selectedEvent.veiculo_id).placa} - ${veiculos.find(v => v.id === selectedEvent.veiculo_id).modelo}`
                              : 'AVULSO')}
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                      <p className="text-[9px] text-zinc-700 font-black uppercase tracking-widest flex items-center gap-2">
                        <FileText size={12} /> Ordem Serviço
                      </p>
                      <p className="text-xs font-black text-white uppercase italic truncate">
                        {selectedEvent?.os?.numero 
                          ? `OS #${selectedEvent.os.numero}`
                          : (ordens.find(o => o.id === selectedEvent?.os_id)?.numero 
                              ? `OS #${ordens.find(o => o.id === selectedEvent.os_id).numero}`
                              : 'AVULSO')}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-zinc-900 leading-none">
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Responsável Mecânico</p>
                      <p className="text-xs font-black text-white uppercase italic">
                        {selectedEvent?.mecanico?.name || mecanicos.find(m => m.id === selectedEvent?.mecanico_id)?.name || 'NÃO ATRIBUÍDO'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Box Selecionado</p>
                      <p className="text-xs font-black text-orange-500 uppercase italic">
                        📍 {BAYS_OFICINA.find(b => b.id === selectedEvent?.box)?.label || 'BOX GERAL'}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2 mt-4">
                    <p className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">Descrição Operacional</p>
                    <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl min-h-[90px] text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                      {selectedEvent?.realDesc || selectedEvent?.descricao || 'SEM DETALHES DE ESCOPO ADICIONADOS.'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-8 pb-4">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="md:flex-1 py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition flex items-center justify-center gap-3 italic"
                  >
                    <Wrench size={18} /> Modificar Agendamento
                  </button>
                  <button 
                    onClick={handleDeleteEvent}
                    className="md:flex-1 py-5 bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition flex items-center justify-center gap-3 italic"
                  >
                    <Trash2 size={18} /> Descartar Registro
                  </button>
                  <button 
                    onClick={() => { setShowModal(false); setSelectedEvent(null); }}
                    className="md:flex-1 py-5 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition flex items-center justify-center gap-3 italic"
                  >
                    <X size={18} /> Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
