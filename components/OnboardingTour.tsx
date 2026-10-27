'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Rocket, ChevronRight } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export default function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);

  // 1. Verifica se deve mostrar a introdução (apenas no dashboard e se nunca viu)
  useEffect(() => {
    const done = localStorage.getItem('@vehlox:tour_done');
    const step = localStorage.getItem('@vehlox:tour_step');
    if (!done && !step && pathname === '/dashboard') {
      setShowIntro(true);
    }
  }, [pathname]);

  const startTour = () => {
    setShowIntro(false);
    localStorage.setItem('@vehlox:tour_step', '2');
  };

  const skipTour = () => {
    localStorage.setItem('@vehlox:tour_done', 'true');
    localStorage.setItem('@vehlox:tour_step', '0');
    setShowIntro(false);
  };

  // 2. Engine do Driver.js
  useEffect(() => {
    if (showIntro) return; 
    if (localStorage.getItem('@vehlox:tour_done')) return;

    const currentStep = parseInt(localStorage.getItem('@vehlox:tour_step') || '0', 10);
    if (currentStep < 2) return; 

    const stepRoutes: Record<number, string> = {
      2: '/dashboard', 3: '/clientes', 4: '/clientes', 5: '/clientes',
      6: '/clientes', 7: '/clientes', 8: '/veiculos/novo',
      9: '/veiculos/novo', 10: '/veiculos/novo', 11: '/veiculos/novo',
      12: '/veiculos/novo', 13: '/os/nova', 14: '/os/nova',
      15: '/os/nova', 16: '/os/nova',
    };

    const expectedRoute = stepRoutes[currentStep];
    if (expectedRoute && pathname !== expectedRoute && !pathname.startsWith(expectedRoute + '/')) {
      localStorage.setItem('@vehlox:tour_done', 'true');
      localStorage.setItem('@vehlox:tour_step', '0');
      return;
    }

    let driverInstance: any = null;

    const forceCleanupDriver = (instance: any) => {
      if (instance) {
        try { instance.destroy(); } catch {}
      }
      document.body.style.overflow = '';
      document.body.classList.remove('driver-active');
      document.documentElement.classList.remove('driver-active');
      const overlays = document.querySelectorAll('.driver-overlay, .driver-active-element');
      overlays.forEach(el => {
        el.classList.remove('driver-active-element');
        if (el.classList.contains('driver-overlay')) el.remove();
      });
    };

    const styleId = 'vehlox-driver-custom-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes driverFadeIn {
          from { opacity: 0; transform: translateY(15px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Fundo escuro com blur */
        .driver-overlay { 
          background: rgba(0, 0, 0, 0.85) !important; 
          backdrop-filter: blur(4px) !important; 
        }

        /* Card Principal */
        .driver-popover { 
          background: #18181b !important; /* zinc-900 */
          border: 1px solid rgba(249, 115, 22, 0.3) !important; 
          border-radius: 24px !important; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.05) !important; 
          padding: 0 !important; 
          max-width: 420px !important; 
          font-family: inherit !important; 
          animation: driverFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          overflow: hidden !important;
        }

        /* Cabeçalho Customizado Injetado */
        .driver-custom-header {
          background: #09090b !important; /* zinc-950 */
          padding: 16px 24px !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }

        .driver-custom-progress-wrapper {
          height: 6px !important;
          background: #27272a !important;
          border-radius: 4px !important;
          margin-bottom: 12px !important;
          overflow: hidden !important;
        }

        .driver-custom-progress-bar {
          height: 100% !important;
          background: linear-gradient(90deg, #ea580c, #f97316, #fbbf24) !important;
          transition: width 0.4s ease !important;
        }

        .driver-header-top {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }

        .driver-phase-badge {
          font-size: 10px !important;
          font-weight: 900 !important;
          color: #f97316 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          background: rgba(249, 115, 22, 0.1) !important;
          padding: 4px 10px !important;
          border-radius: 100px !important;
        }

        .driver-step-counter {
          font-size: 10px !important;
          font-weight: bold !important;
          color: #71717a !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }

        /* Título e Descrição */
        .driver-popover-title { 
          color: #ffffff !important; 
          font-size: 18px !important; 
          font-weight: 900 !important; 
          text-transform: uppercase !important; 
          font-style: italic !important; 
          margin: 0 !important; 
          padding: 20px 24px 8px 24px !important;
          letter-spacing: -0.02em !important;
        }

        .driver-popover-description { 
          color: #a1a1aa !important; 
          font-size: 13px !important; 
          line-height: 1.6 !important; 
          font-weight: 500 !important; 
          padding: 0 24px 24px 24px !important;
          margin: 0 !important;
        }

        /* Rodapé */
        .driver-popover-footer { 
          margin: 0 !important; 
          padding: 16px 24px !important; 
          background: #09090b !important; 
          border-top: 1px solid rgba(255,255,255,0.05) !important; 
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }

        /* Botão Avançar */
        .driver-popover-next-btn { 
          background: linear-gradient(to right, #ea580c, #f97316) !important; 
          color: #fff !important; 
          border: none !important; 
          border-radius: 10px !important; 
          padding: 10px 20px !important; 
          font-weight: 900 !important; 
          text-transform: uppercase !important; 
          font-size: 11px !important; 
          letter-spacing: 0.1em !important; 
          transition: all 0.2s !important; 
          cursor: pointer !important; 
          box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.3) !important; 
        }

        .driver-popover-next-btn:hover { 
          transform: translateY(-2px) !important; 
          box-shadow: 0 6px 20px 0 rgba(249, 115, 22, 0.5) !important; 
        }

        /* Efeito de foco no elemento */
        .driver-active-element { 
          border-radius: 12px !important; 
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3), 0 0 0 8px rgba(249, 115, 22, 0.1) !important; 
          transition: box-shadow 0.3s ease !important;
        }
      `;
      document.head.appendChild(style);
    }

    const loadDriver = () => {
      if ((window as any).driver) {
        startDriverEngine();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js';
      script.async = true;
      script.onload = () => startDriverEngine();
      document.body.appendChild(script);
    };

    const startDriverEngine = () => {
      // @ts-ignore
      const driver = window.driver.js.driver;

      const waitForElement = (selector: string, callback: () => void) => {
        let attempts = 0;
        const interval = setInterval(() => {
          if (document.querySelector(selector)) {
            clearInterval(interval);
            callback();
          } else {
            attempts++;
            if (attempts > 50) { 
              clearInterval(interval);
              callback(); 
            }
          }
        }, 100);
      };

      const getStepConfig = (stepNum: number) => {
        let config: any = null;
        let isLast = false;
        let route: string | null = null;
        let action: string | null = null;

        switch (stepNum) {
          case 2:
            config = { element: '#action-new-client', popover: { title: 'O Primeiro Cliente', description: 'Tudo começa pelo cliente. Clique em Avançar para irmos à tela de cadastro.', side: 'bottom' } };
            route = '/clientes';
            break;
          case 3:
            config = { element: '#btn-novo-cliente', popover: { title: 'Iniciando o Cadastro', description: 'Clique em Avançar e o sistema abrirá a janela de cadastro para você.', side: 'bottom' } };
            action = 'vehlox:open-client-modal';
            break;
          case 4:
            config = { element: '#field-cliente-nome', popover: { title: 'Nome do Cliente', description: 'Digite o nome completo ou a razão social. É o primeiro dado essencial.', side: 'bottom' } };
            break;
          case 5:
            config = { element: '#field-cliente-cpf', popover: { title: 'CPF ou CNPJ', description: 'O sistema valida automaticamente se o documento é verdadeiro.', side: 'bottom' } };
            break;
          case 6:
            config = { element: '#field-cliente-telefone', popover: { title: 'Contato', description: 'Para enviar o orçamento ou avisar quando o veículo estiver pronto.', side: 'bottom' } };
            break;
          case 7:
            config = { element: '#btn-salvar-cliente', popover: { title: 'Salvar o Cliente', description: 'Depois de preencher, clique aqui. Vamos avançar para o cadastro do Veículo!', side: 'top' } };
            action = 'vehlox:close-client-modal';
            route = '/veiculos/novo';
            break;
          case 8:
            config = { element: 'form', popover: { title: 'O Veículo', description: 'Agora vamos cadastrar o veículo deste cliente. Preencha a placa e o modelo.', side: 'top' } };
            break;
          case 9:
            config = { element: '#field-veiculo-placa', popover: { title: 'Placa do Veículo', description: 'Digite a placa (ex: ABC-1234). O sistema valida o formato.', side: 'bottom' } };
            break;
          case 10:
            config = { element: '#field-veiculo-marca', popover: { title: 'Marca e Modelo', description: 'Preencha a marca (ex: Volvo) e o modelo (ex: FH 460).', side: 'bottom' } };
            break;
          case 11:
            config = { element: '#field-veiculo-ano', popover: { title: 'Ano de Fabricação', description: 'Informe o ano do veículo. Essencial para buscar peças corretas.', side: 'bottom' } };
            break;
          case 12:
            config = { element: '#form-veiculo', popover: { title: 'Salvar Veículo', description: 'Clique no botão de salvar (laranja). Em seguida, vamos abrir a Ordem de Serviço!', side: 'top' } };
            route = '/os/nova';
            break;
          case 13:
            config = { element: '#btn-tipo-oficina', popover: { title: 'A Ordem de Serviço', description: 'Vamos abrir uma OS de Oficina. Clique em Avançar.', side: 'bottom' } };
            action = 'click-oficina';
            break;
          case 14:
            config = { element: '#section-mao-de-obra', popover: { title: 'Mão de Obra', description: 'Aqui você adiciona os serviços (ex: troca de óleo, revisão).', side: 'right' } };
            break;
          case 15:
            config = { element: '#section-insumos', popover: { title: 'Insumos e Peças', description: 'Aqui você adiciona as peças do estoque que serão usadas no veículo.', side: 'left' } };
            break;
          case 16:
            config = { element: '#btn-protocolar-os', popover: { title: 'Finalizando a OS', description: 'Tudo pronto! Aqui você protocola a OS. Parabéns, você concluiu o tour!', side: 'top' } };
            isLast = true;
            route = '/dashboard';
            break;
        }

        return { config, isLast, route, action };
      };

      const runStep = (stepNum: number) => {
        forceCleanupDriver(driverInstance);

        const { config, isLast, route, action } = getStepConfig(stepNum);
        if (!config) return;

        driverInstance = driver({
          showProgress: false,
          allowClose: false,
          overlayClickNext: false,
          showButtons: ['next'],
          nextBtnText: isLast ? 'FINALIZAR TUTORIAL' : 'AVANÇAR',
          steps: [config],
          onPopoverRender: (popover: any, opts: any) => {
            
            // ✅ INJEÇÃO DO CABEÇALHO PREMIUM
            const header = document.createElement('div');
            header.className = 'driver-custom-header';

            // Barra de Progresso (Calculada de 1 a 15)
            const progressWrapper = document.createElement('div');
            progressWrapper.className = 'driver-custom-progress-wrapper';
            const progressBar = document.createElement('div');
            progressBar.className = 'driver-custom-progress-bar';
            const stepIndex = Math.max(1, stepNum - 1);
            const totalSteps = 15;
            progressBar.style.width = `${(stepIndex / totalSteps) * 100}%`;
            progressWrapper.appendChild(progressBar);

            // Topo do cabeçalho (Tag de Fase + Contador)
            const headerTop = document.createElement('div');
            headerTop.className = 'driver-header-top';

            const phaseBadge = document.createElement('span');
            phaseBadge.className = 'driver-phase-badge';
            if (stepNum <= 7) {
              phaseBadge.innerText = 'FASE 1: CLIENTE';
            } else if (stepNum <= 12) {
              phaseBadge.innerText = 'FASE 2: VEÍCULO';
            } else {
              phaseBadge.innerText = 'FASE 3: ORDEM DE SERVIÇO';
            }

            const stepCounter = document.createElement('span');
            stepCounter.className = 'driver-step-counter';
            stepCounter.innerText = `PASSO ${stepIndex} DE ${totalSteps}`;

            headerTop.appendChild(phaseBadge);
            headerTop.appendChild(stepCounter);

            header.appendChild(progressWrapper);
            header.appendChild(headerTop);

            // Insere o cabeçalho no topo do balão
            popover.wrapper.insertBefore(header, popover.wrapper.firstChild);

            // Corrige o texto do botão principal
            const nextBtn = popover.footerButtons.querySelector('.driver-popover-next-btn');
            if (nextBtn) {
              nextBtn.innerHTML = isLast ? 'FINALIZAR TUTORIAL' : 'AVANÇAR';
            }

            // Botão Pular Tour
            const skipBtn = document.createElement('button');
            skipBtn.innerText = 'PULAR TOUR';
            skipBtn.style.background = 'transparent';
            skipBtn.style.border = '1px solid #3f3f46';
            skipBtn.style.color = '#a1a1aa';
            skipBtn.style.padding = '8px 16px';
            skipBtn.style.borderRadius = '10px';
            skipBtn.style.cursor = 'pointer';
            skipBtn.style.fontSize = '10px';
            skipBtn.style.fontWeight = 'bold';
            skipBtn.style.textTransform = 'uppercase';
            skipBtn.style.letterSpacing = '0.1em';
            skipBtn.style.transition = 'all 0.2s';
            
            skipBtn.onmouseover = () => { skipBtn.style.color = '#ef4444'; skipBtn.style.borderColor = '#ef4444'; };
            skipBtn.onmouseout = () => { skipBtn.style.color = '#a1a1aa'; skipBtn.style.borderColor = '#3f3f46'; };
            
            skipBtn.onclick = () => {
              localStorage.setItem('@vehlox:tour_done', 'true');
              localStorage.setItem('@vehlox:tour_step', '0');
              forceCleanupDriver(opts.driver);
              window.dispatchEvent(new Event('vehlox:close-client-modal'));
              
              setTimeout(() => {
                router.push('/dashboard');
              }, 300);
            };
            
            popover.footerButtons.prepend(skipBtn);
          },
          onNextClick: () => {
            forceCleanupDriver(driverInstance);
            
            if (action) {
              if (action === 'vehlox:open-client-modal') {
                window.dispatchEvent(new Event(action));
              } else if (action === 'vehlox:close-client-modal') {
                window.dispatchEvent(new Event(action));
              } else if (action === 'click-oficina') {
                const btn = document.getElementById('btn-tipo-oficina');
                if (btn) {
                  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                  btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                  btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
              }
            }

            if (isLast) {
              localStorage.setItem('@vehlox:tour_done', 'true');
              localStorage.setItem('@vehlox:tour_step', '0');
              
              setTimeout(() => {
                if (route) router.push(route);
              }, 300);
            } else {
              const nextStep = stepNum + 1;
              localStorage.setItem('@vehlox:tour_step', nextStep.toString());
              
              if (route) {
                router.push(route);
              } else {
                if (action === 'click-oficina') {
                  setTimeout(() => {
                    const nextConfig = getStepConfig(nextStep).config;
                    if (nextConfig && nextConfig.element) {
                      waitForElement(nextConfig.element, () => runStep(nextStep));
                    } else {
                      runStep(nextStep);
                    }
                  }, 1000);
                } else {
                  const nextConfig = getStepConfig(nextStep).config;
                  if (nextConfig && nextConfig.element) {
                    waitForElement(nextConfig.element, () => runStep(nextStep));
                  } else {
                    setTimeout(() => runStep(nextStep), 500);
                  }
                }
              }
            }
          }
        });
        
        setTimeout(() => {
          driverInstance.drive();
        }, 300);
      };

      const stepAtual = parseInt(localStorage.getItem('@vehlox:tour_step') || '2', 10);
      
      const currentConfig = getStepConfig(stepAtual).config;
      if (currentConfig && currentConfig.element) {
        waitForElement(currentConfig.element, () => runStep(stepAtual));
      } else {
        runStep(stepAtual);
      }
    };

    loadDriver();

    return () => {
      forceCleanupDriver(driverInstance);
    };
  }, [pathname, showIntro, router]);

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="relative bg-zinc-900 border border-zinc-800 max-w-xl w-full rounded-[2.5rem] p-8 md:p-12 text-center space-y-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          
          {/* Efeitos de fundo */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-orange-600/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* Logo da empresa no lugar do foguete */}
            <div className="w-28 h-28 bg-zinc-950/50 border-2 border-orange-500/20 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-orange-900/30 rotate-3 transition-transform hover:rotate-0 overflow-hidden p-3">
              {BRANDING.logo?.url ? (
                <img src={BRANDING.logo.url} alt={BRANDING.name} className="w-full h-full object-contain drop-shadow-md" />
              ) : (
                <Rocket className="w-12 h-12 text-orange-500" />
              )}
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Bem-vindo à VEHLOX</h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Preparamos um tour guiado interativo para você dominar o sistema. Vamos te mostrar como cadastrar seu primeiro <strong className="text-orange-500">Cliente</strong>, <strong className="text-orange-500">Veículo</strong> e <strong className="text-orange-500">Ordem de Serviço</strong>.
              </p>
            </div>

            {/* Checklist Visual */}
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5 text-left space-y-4 max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-black">1</div>
                <p className="text-xs text-zinc-300 font-bold uppercase tracking-wide">Cadastro de Cliente</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-black">2</div>
                <p className="text-xs text-zinc-300 font-bold uppercase tracking-wide">Cadastro de Veículo</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-black">3</div>
                <p className="text-xs text-zinc-300 font-bold uppercase tracking-wide">Criação da primeira OS</p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={startTour} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-orange-950/40 active:scale-95 flex items-center justify-center gap-2">
                Começar Tour Guiado <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={skipTour} className="w-full py-4 bg-transparent hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-zinc-300 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-all">
                Pular e ir direto pro sistema
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
