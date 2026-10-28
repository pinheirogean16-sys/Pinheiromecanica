import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { 
  Wrench, ShieldCheck, Package, DollarSign, 
  Cloud, Smartphone, CheckCircle2, ChevronRight, 
  HelpCircle, Zap, Lock, Play, ArrowRight, Check,
  Activity, BarChart3, Users
} from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export const metadata = {
  title: 'VEHLOX | O Sistema Definitivo para Oficinas Diesel',
  description: 'Gestão completa de Ordens de Serviço, Preventivas, Estoque e Financeiro. O único ERP que sua oficina pesada precisa.',
};

export default async function LandingPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (token) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* HEADER FIXO (Glassmorphism) */}
      <header className="fixed top-0 w-full bg-zinc-950/70 backdrop-blur-xl border-b border-white/5 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {BRANDING.logo?.url ? (
              <img src={BRANDING.logo.url} alt={BRANDING.name} className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/40">
                  <Wrench className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-black uppercase italic tracking-tighter">{BRANDING.name}</span>
              </div>
            )}
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-bold text-zinc-300 hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            {/* ✅ CORRIGIDO: /login?mode=register */}
            <Link 
              href="/login?mode=register" 
              className="bg-white text-zinc-950 hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
            >
              Teste Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden flex flex-col items-center text-center">
        {/* Fundo Grid e Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-600/15 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 space-y-8 flex flex-col items-center">
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[10px] font-bold text-orange-400 uppercase tracking-widest shadow-xl backdrop-blur-md">
            <SparklesIcon /> A evolução da sua oficina
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black uppercase italic tracking-tighter leading-[1.05] drop-shadow-2xl">
            Gestão pesada para <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
              máquinas pesadas.
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Chega de planilhas. Controle Ordens de Serviço, Estoque, Preventivas e o Financeiro da sua frota em um único lugar. Rápido, seguro e 100% na nuvem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 w-full">
            {/* ✅ CORRIGIDO: /login?mode=register */}
            <Link 
              href="/login?mode=register" 
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] active:scale-95 flex items-center justify-center gap-2 group"
            >
              Começar 7 Dias Grátis 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <Lock size={12} /> Sem cartão de crédito.
            </div>
          </div>
        </div>

        {/* MOCKUP DO SISTEMA (Glassmorphism + Flutuante) */}
        <div className="max-w-5xl w-full mx-auto mt-20 relative z-10 perspective-1000">
          <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full transform scale-90 translate-y-10 pointer-events-none" />
          
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl transform transition-transform duration-700 hover:scale-[1.01] hover:-translate-y-2">
            <div className="bg-zinc-950 rounded-xl border border-white/5 overflow-hidden">
              {/* Fake Browser Header */}
              <div className="flex items-center px-4 py-3 border-b border-white/5 bg-zinc-900/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto flex items-center gap-2 px-3 py-1 bg-zinc-950 rounded-md border border-white/5 text-[10px] text-zinc-500 font-mono">
                  <Lock size={10} /> app.vehlox.com.br
                </div>
              </div>
              
              {/* Fake Dashboard Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Faturamento Mês</span>
                    <Activity size={14} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-white">R$ 128.450</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 w-[85%] h-full" />
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">OS em Execução</span>
                    <BarChart3 size={14} className="text-orange-500" />
                  </div>
                  <div className="text-2xl font-black text-white">24</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-orange-500 w-[60%] h-full" />
                  </div>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-xl space-y-3 hidden md:block">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Equipe Ativa</span>
                    <Users size={14} className="text-blue-500" />
                  </div>
                  <div className="flex -space-x-2 mt-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-bold text-orange-500">+5</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / TRUST METRICS */}
      <div className="border-y border-white/5 bg-zinc-950/50 relative z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5 text-center">
          {[
            { val: '99.9%', label: 'Uptime Garantido' },
            { val: '+10k', label: 'Fotos Salvas' },
            { val: '100%', label: 'Cloud Native' },
            { val: '24/7', label: 'Monitoramento' }
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-white italic">{stat.val}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RECURSOS (Bento Grid) */}
      <section id="recursos" className="py-32 relative">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Poderoso. Intuitivo. Rápido.</h2>
            <h3 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter text-white">
              Tudo o que a sua oficina precisa
            </h3>
            <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base">
              Ferramentas desenhadas especificamente para as necessidades do mecânico e do dono da oficina.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[220px]">
            {/* Card 1 (Large) */}
            <div className="md:col-span-2 bg-zinc-900/40 border border-white/5 p-8 rounded-3xl hover:border-orange-500/30 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-orange-500/10 transition-colors" />
              <div className="relative z-10 flex gap-4">
                <div className="w-12 h-12 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Wrench className="text-orange-500 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tight text-white">Ordens de Serviço</h4>
                  <p className="text-sm text-zinc-400 mt-2 max-w-md">Abra, acompanhe e finalize OS de oficina e campo com assinatura digital, cálculo de deslocamento e envio de PDF automático.</p>
                </div>
              </div>
              <div className="relative z-10 mt-6 flex gap-2">
                <span className="px-3 py-1 bg-zinc-950 text-[10px] font-bold text-zinc-400 rounded-lg border border-white/5">Assinatura Digital</span>
                <span className="px-3 py-1 bg-zinc-950 text-[10px] font-bold text-zinc-400 rounded-lg border border-white/5">Cálculo de KM</span>
              </div>
            </div>

            {/* Card 2 (Small) */}
            <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="text-emerald-500 w-6 h-6" />
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">Preventivas</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Acompanhe por KM, Horímetro ou Data. Nunca perca o prazo de troca de óleo.</p>
            </div>

            {/* Card 3 (Small) */}
            <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl hover:border-blue-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                <DollarSign className="text-blue-500 w-6 h-6" />
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">Financeiro</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Contas a pagar/receber, fluxo de caixa e cálculo de lucro real por OS.</p>
            </div>

            {/* Card 4 (Large) */}
            <div className="md:col-span-2 bg-zinc-900/40 border border-white/5 p-8 rounded-3xl hover:border-orange-500/30 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10 flex gap-4">
                <div className="w-12 h-12 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Cloud className="text-orange-500 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tight text-white">Portal do Cliente & Fotos</h4>
                  <p className="text-sm text-zinc-400 mt-2 max-w-md">Envie um link no WhatsApp. O cliente aprova o orçamento, assina no celular e vê o status em tempo real.</p>
                </div>
              </div>
              <div className="relative z-10 flex items-end gap-3 mt-6">
                <div className="flex-1 h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="w-3/4 h-full bg-orange-500" /></div>
                <div className="flex-1 h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="w-1/2 h-full bg-orange-500" /></div>
                <div className="flex-1 h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="w-full h-full bg-orange-500" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="py-32 relative border-t border-white/5 bg-zinc-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-600/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter text-white">
              Planos simples e transparentes
            </h2>
            <p className="text-zinc-400">Escolha o plano ideal para o tamanho da sua operação.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
            {/* Básico */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8 sm:p-10 rounded-[2.5rem] flex flex-col hover:border-white/10 transition-colors">
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-300 mb-2">Básico</h3>
              <p className="text-zinc-500 text-sm mb-8">Para oficinas que estão começando a se organizar.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm font-bold text-zinc-500">R$</span>
                <span className="text-5xl font-black tracking-tighter text-white">89</span>
                <span className="text-sm font-bold text-zinc-500">,90/mês</span>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {['Até 3 usuários', 'Ordens de Serviço ilimitadas', 'Gestão de Clientes e Veículos', 'Controle de Estoque Básico'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-400">
                    <Check className="w-4 h-4 text-zinc-600 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>

              {/* ✅ CORRIGIDO: /login?mode=register */}
              <Link href="/login?mode=register" className="w-full py-4 text-center border border-white/10 hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors text-white">
                Começar Teste
              </Link>
            </div>

            {/* PRO */}
            <div className="bg-zinc-900 border-2 border-orange-500 p-8 sm:p-10 rounded-[2.5rem] flex flex-col relative overflow-hidden shadow-[0_0_80px_-20px_rgba(249,115,22,0.4)] transform md:scale-105">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-lg">
                Mais Escolhido
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">PRO</h3>
              <p className="text-zinc-400 text-sm mb-8">Para oficinas que querem escalar e lucrar mais.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm font-bold text-zinc-400">R$</span>
                <span className="text-6xl font-black tracking-tighter text-white">149</span>
                <span className="text-sm font-bold text-zinc-400">,90/mês</span>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {['Usuários Ilimitados', 'Ordens de Serviço Ilimitadas', 'Módulo Financeiro Completo', 'Portal do Cliente com Assinatura', 'Relatórios Avançados (Curva ABC/DRE)', 'Suporte Prioritário'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-white">
                    <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>

              {/* ✅ CORRIGIDO: /login?mode=register */}
              <Link href="/login?mode=register" className="w-full py-4 text-center bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-900/30 active:scale-95">
                Começar Teste Grátis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">Perguntas Frequentes</h2>
            <p className="text-zinc-400 text-sm">Tire suas dúvidas antes de começar.</p>
          </div>

          <div className="space-y-4">
            {[
              { q: 'Preciso instalar algo?', a: 'Não. O sistema é 100% online e na nuvem. Você pode acessar do computador da oficina, do celular ou do tablet em qualquer lugar.' },
              { q: 'Funciona para máquinas pesadas?', a: 'Sim! O sistema foi desenhado especificamente para o controle de Horímetro e Quilometragem de caminhões, retroescavadeiras, tratores e frotas diesel.' },
              { q: 'As fotos que eu envio somem?', a: 'Não. Todas as imagens são armazenadas na nuvem (Cloudinary). Você pode fazer quantas atualizações no sistema precisar, que suas fotos estarão seguras.' },
              { q: 'Posso cancelar quando quiser?', a: 'Sim, não temos fidelidade. Você pode cancelar a assinatura a qualquer momento pelo próprio painel.' },
            ].map((item, i) => (
              <details key={i} className="group bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between p-6 text-sm font-bold text-white uppercase tracking-wide hover:bg-white/5 transition-colors">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-orange-500 flex-shrink-0" /> {item.q}
                  </span>
                  <span className="transition group-open:rotate-180">
                    <ChevronRight className="w-5 h-5 text-zinc-500 rotate-90 group-open:-rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 text-sm text-zinc-400 leading-relaxed pl-14 border-t border-white/5 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-16 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              {BRANDING.logo?.url ? (
                <img src={BRANDING.logo.url} alt={BRANDING.name} className="h-10 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
              ) : (
                <>
                  <Wrench className="text-zinc-600 w-6 h-6" />
                  <span className="text-lg font-black uppercase tracking-widest text-zinc-400">{BRANDING.name}</span>
                </>
              )}
            </div>
            <p className="text-xs text-zinc-600 max-w-xs text-center md:text-left">
              O sistema de gestão definitivo para oficinas diesel e máquinas pesadas.
            </p>
          </div>
          
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <div className="flex flex-col gap-3">
              <span className="text-white">Produto</span>
              <Link href="#recursos" className="hover:text-orange-500 transition">Recursos</Link>
              <Link href="#planos" className="hover:text-orange-500 transition">Planos</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white">Legal</span>
              <Link href="/termos" className="hover:text-orange-500 transition">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-orange-500 transition">Privacidade</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white">Suporte</span>
              <a href="mailto:suporte@vehlox.com.br" className="hover:text-orange-500 transition">Contato</a>
              <Link href="/login" className="hover:text-orange-500 transition">Entrar</Link>
            </div>
          </div>

          <p className="text-[10px] font-mono text-zinc-700">© {new Date().getFullYear()} {BRANDING.name}. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}

// Ícone customizado para o badge
function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-orange-400">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}
