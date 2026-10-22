import Link from 'next/link';
import { 
  Wrench, ShieldCheck, Package, DollarSign, 
  Cloud, Smartphone, CheckCircle2, ChevronRight, 
  HelpCircle, Zap, BarChart3, Lock, ArrowRight
} from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export const metadata = {
  title: 'VEHLOX | O Sistema Definitivo para Oficinas Diesel',
  description: 'Gestão completa de Ordens de Serviço, Preventivas, Estoque e Financeiro. O único ERP que sua oficina pesada precisa.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* HEADER FIXO */}
      <header className="fixed top-0 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ✅ LOGO AQUI: Puxa do BRANDING ou usa um fallback */}
            {BRANDING.logo?.url ? (
              <img 
                src={BRANDING.logo.url} 
                alt={BRANDING.name} 
                className="h-10 w-auto object-contain" 
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/40">
                  <Wrench className="text-white w-6 h-6" />
                </div>
                <span className="text-xl font-black uppercase italic tracking-tighter">
                  {BRANDING.name}
                </span>
              </div>
            )}
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-zinc-300 hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link 
              href="/register" 
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-950/20 active:scale-95"
            >
              Teste Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Fundo com Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-orange-500 uppercase tracking-widest shadow-lg">
            <Zap size={14} className="fill-orange-500" /> A evolução da sua oficina começa aqui
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black uppercase italic tracking-tighter leading-[1.1] drop-shadow-2xl">
            Gestão pesada para <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">
              máquinas pesadas.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Chega de planilhas e cadernos. Controle Ordens de Serviço, Estoque, Preventivas e o Financeiro da sua frota em um único lugar. Rápido, seguro e na nuvem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/40 active:scale-95 flex items-center justify-center gap-2 group"
            >
              Começar 14 Dias Grátis 
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Sem cartão de crédito.
            </p>
          </div>
        </div>

        {/* ✅ MOCKUP DO SISTEMA (Para dar visual de produto real) */}
        <div className="max-w-4xl mx-auto mt-20 relative z-10 px-4 sm:px-0">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-t-3xl p-2 shadow-2xl backdrop-blur-xl">
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 sm:p-6 space-y-4">
              {/* Header do Mockup */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="h-6 w-48 bg-zinc-900 rounded-md border border-zinc-800 hidden sm:block" />
                <div className="w-8 h-8 rounded-full bg-zinc-800" />
              </div>
              {/* Cards Falsos do Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">OS Abertas</span>
                  <div className="text-2xl font-black text-white">12</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-orange-500 w-2/3 h-full" />
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Faturamento (Mês)</span>
                  <div className="text-2xl font-black text-green-400">R$ 45.200</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 w-3/4 h-full" />
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Preventivas Pendentes</span>
                  <div className="text-2xl font-black text-amber-500">3</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 w-1/4 h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL / MÉTRICAS */}
      <div className="border-y border-zinc-800 bg-zinc-950 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
          <div>
            <p className="text-3xl font-black text-white italic">99.9%</p>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Uptime Garantido</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-zinc-800" />
          <div>
            <p className="text-3xl font-black text-white italic">+10k</p>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Fotos na Nuvem</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-zinc-800" />
          <div>
            <p className="text-3xl font-black text-white italic">100%</p>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Na Nuvem</p>
          </div>
        </div>
      </div>

      {/* RECURSOS (Features) */}
      <section id="recursos" className="py-24 bg-zinc-900/30 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">
              Tudo o que a sua oficina precisa
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Ferramentas desenhadas especificamente para as necessidades do mecânico e do dono da oficina.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Wrench, title: 'Ordens de Serviço', desc: 'Abra, acompanhe e finalize OS de oficina e campo com assinatura digital e envio de PDF.' },
              { icon: ShieldCheck, title: 'Manutenção Preventiva', desc: 'Acompanhe por KM, Horímetro ou Data. Nunca mais perca o prazo da troca de óleo ou revisão.' },
              { icon: Package, title: 'Controle de Estoque', desc: 'Baixa automática de peças ao criar uma OS, alertas de estoque mínimo e Curva ABC.' },
              { icon: DollarSign, title: 'Financeiro Completo', desc: 'Contas a pagar e receber, fluxo de caixa, conciliação e cálculo do lucro real da OS.' },
              { icon: Cloud, title: 'Fotos na Nuvem', desc: 'Anexe fotos das peças e defeitos direto na OS. As imagens ficam salvas na nuvem e nunca somem.' },
              { icon: Smartphone, title: 'Portal do Cliente', desc: 'Envie um link no WhatsApp para o cliente aprovar o orçamento e assinar o serviço pelo celular.' },
            ].map((feature, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-950/20 transition-all duration-300 group">
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-orange-500/30 transition-all">
                  <feature.icon className="text-orange-500 w-7 h-7" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS (Pricing) */}
      <section id="planos" className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">
              Planos simples e transparentes
            </h2>
            <p className="text-zinc-400">Escolha o plano ideal para o tamanho da sua operação.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Plano Básico */}
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 p-8 rounded-[2.5rem] flex flex-col hover:border-zinc-700 transition-colors">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Básico</h3>
              <p className="text-zinc-500 text-sm mb-6">Para oficinas que estão começando a se organizar.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm font-bold text-zinc-400">R$</span>
                <span className="text-5xl font-black tracking-tighter">89</span>
                <span className="text-sm font-bold text-zinc-400">,90/mês</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {['Até 3 usuários', 'Ordens de Serviço ilimitadas', 'Gestão de Clientes e Veículos', 'Controle de Estoque Básico'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-zinc-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="w-full py-4 text-center border border-zinc-700 hover:bg-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                Começar Teste
              </Link>
            </div>

            {/* Plano PRO */}
            <div className="bg-zinc-900 border-2 border-orange-500 p-8 rounded-[2.5rem] flex flex-col relative overflow-hidden shadow-[0_0_50px_-12px_rgba(249,115,22,0.3)]">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">
                Mais Escolhido
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">PRO</h3>
              <p className="text-zinc-400 text-sm mb-6">Para oficinas que querem escalar e lucrar mais.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm font-bold text-zinc-400">R$</span>
                <span className="text-5xl font-black tracking-tighter text-white">149</span>
                <span className="text-sm font-bold text-zinc-400">,90/mês</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {['Usuários Ilimitados', 'Ordens de Serviço Ilimitadas', 'Módulo Financeiro Completo', 'Portal do Cliente com Assinatura', 'Relatórios Avançados (Curva ABC/DRE)', 'Suporte Prioritário'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="w-full py-4 text-center bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                Começar Teste Grátis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-zinc-900/30 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Perguntas Frequentes</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: 'Preciso instalar algo?', a: 'Não. O sistema é 100% online e na nuvem. Você pode acessar do computador da oficina, do celular ou do tablet em qualquer lugar.' },
              { q: 'Funciona para máquinas pesadas?', a: 'Sim! O sistema foi desenhado especificamente para o controle de Horímetro e Quilometragem de caminhões, retroescavadeiras, tratores e frotas diesel.' },
              { q: 'As fotos que eu envio somem?', a: 'Não. Todas as imagens são armazenadas na nuvem (Cloudinary). Você pode fazer quantas atualizações no sistema precisar, que suas fotos estarão seguras.' },
              { q: 'Posso cancelar quando quiser?', a: 'Sim, não temos fidelidade. Você pode cancelar a assinatura a qualquer momento pelo próprio painel.' },
            ].map((item, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-colors">
                <h4 className="text-base font-bold text-white mb-2 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" /> {item.q}
                </h4>
                <p className="text-sm text-zinc-400 pl-8 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-12 text-center text-sm text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            {BRANDING.logo?.url ? (
              <img src={BRANDING.logo.url} alt={BRANDING.name} className="h-6 w-auto object-contain opacity-50 grayscale hover:grayscale-0 transition-all" />
            ) : (
              <Wrench className="text-zinc-700 w-5 h-5" />
            )}
            <span className="font-black uppercase tracking-widest">{BRANDING.name}</span>
          </div>
          
          <div className="flex gap-6">
            <Link href="/termos" className="hover:text-white transition">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white transition">Privacidade</Link>
            <a href="mailto:suporte@vehlox.com.br" className="hover:text-white transition">Suporte</a>
          </div>

          <p>© {new Date().getFullYear()} {BRANDING.name}. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
