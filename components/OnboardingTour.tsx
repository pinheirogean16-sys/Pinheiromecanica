'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Rocket, ChevronRight } from 'lucide-react';

export default function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);

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

  useEffect(() => {
    if (showIntro) return; 
    if (localStorage.getItem('@vehlox:tour_done')) return;

    const currentStep = parseInt(localStorage.getItem('@vehlox:tour_step') || '0', 10);
    if (currentStep < 2) return; 

    let driverInstance: any = null;

    // CSS Premium do Modal
    const styleId = 'vehlox-driver-custom-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .driver-popover { background: linear-gradient(145deg, #18181b, #09090b) !important; border: 1px solid #3f3f46 !important; border-radius: 24px !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.05) !important; color: #e4e4e7 !important; padding: 28px !important; max-width: 360px !important; font-family: inherit !important; }
        .driver-popover-title { color: #f97316 !important; font-size: 20px !important; font-weight: 900 !important; text-transform: uppercase !important; font-style: italic !important; margin-bottom: 12px !important; letter-spacing: -0.05em !important; display: flex !important; align-items: center !important; gap: 8px !important; }
        .driver-popover-title::before { content: '✨' !important; font-size: 16px !important; font-style: normal !important; }
        .driver-popover-description { color: #a1a1aa !important; font-size: 14px !important; line-height: 1.6 !important; font-weight: 500 !important; }
        .driver-popover-footer { margin-top: 24px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; border-top: 1px solid #27272a !important; padding-top: 20px !important; }
        .driver-popover-footer button { background: #f97316 !important; color: #fff !important; border: none !important; border-radius: 12px !important; padding: 12px 24px !important; font-weight: 800 !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.1em !important; transition: all 0.2s !important; text-shadow: none !important; cursor: pointer !important; box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.39) !important; }
        .driver-popover-footer button:hover { background: #ea580c !important; transform: translateY(-2px) !important; }
        .driver-popover-progress-text { color: #71717a !important; font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; }
        .driver-popover-arrow { border-color: #18181b !important; }
        .driver-active-element { border-radius: 16px !important; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3) !important; }
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

      // Função de espera ativa: Fica checando se o elemento apareceu na tela
      const waitForElement = (selector: string, callback: () => void) => {
        let attempts = 0;
        const interval = setInterval(() => {
          if (document.querySelector(selector)) {
            clearInterval(interval);
            callback();
          } else {
            attempts++;
            if (attempts > 50) { // 5 segundos de tolerância máxima
              clearInterval(interval);
              console.warn(`Tour: Elemento ${selector} não encontrado após 5s. Pulando.`);
              callback(); // Força a execução para não travar o tutorial
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
            config = { element: '#action-new-client', popover: { title: 'Fase 1: O Cliente', description: 'Tudo começa pelo cliente. Clique em Avançar para irmos à tela de cadastro.', side: 'bottom' } };
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
            config = { element: 'form', popover: { title: 'Fase 2: O Veículo', description: 'Agora vamos cadastrar o veículo deste cliente. Preencha a placa e o modelo.', side: 'top' } };
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
            config = { element: '#btn-salvar-veiculo', popover: { title: 'Salvar Veículo', description: 'Clique aqui para salvar. Em seguida, vamos abrir a Ordem de Serviço!', side: 'top' } };
            route = '/os/nova';
            break;
          case 13:
            config = { element: '#btn-tipo-oficina', popover: { title: 'Fase 3: Escolha o Tipo', description: 'Vamos abrir uma OS de Oficina. Clique em Avançar.', side: 'bottom' } };
            action = 'click:#btn-tipo-oficina'; // Simula o clique
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
        if (driverInstance) driverInstance.destroy();

        const { config, isLast, route, action } = getStepConfig(stepNum);
        if (!config) return;

        driverInstance = driver({
          showProgress: true,
          allowClose: false,
          overlayClickNext: false,
          showButtons: ['next'],
          nextBtnText: isLast ? 'Finalizar Tutorial' : 'Avançar',
          steps: [config],
          onPopoverRender: (popover: any, opts: any) => {
            const skipBtn = document.createElement('button');
            skipBtn.innerText = 'Pular';
            skipBtn.style.background = 'transparent';
            skipBtn.style.border = 'none';
            skipBtn.style.color = '#ef4444';
            skipBtn.style.cursor = 'pointer';
            skipBtn.style.fontSize = '11px';
            skipBtn.style.fontWeight = 'bold';
            skipBtn.style.textTransform = 'uppercase';
            skipBtn.onclick = () => {
              localStorage.setItem('@vehlox:tour_done', 'true');
              localStorage.setItem('@vehlox:tour_step', '0');
              opts.driver.destroy();
              window.dispatchEvent(new Event('vehlox:close-client-modal'));
              router.push('/dashboard');
            };
            popover.footerButtons.prepend(skipBtn);

            setTimeout(() => {
              const btns = document.querySelectorAll('.driver-popover-next-btn');
              btns.forEach((btn: any) => {
                btn.innerText = isLast ? 'Finalizar Tutorial' : 'Avançar';
              });
            }, 50);
          },
          onNextClick: () => {
            if (driverInstance) driverInstance.destroy();
            
            // Executa a ação se houver (como abrir o modal ou simular um clique)
            if (action) {
              if (action.startsWith('click:')) {
                const elementId = action.split(':')[1];
                document.getElementById(elementId)?.click();
              } else {
                window.dispatchEvent(new Event(action));
              }
            }

            if (isLast) {
              localStorage.setItem('@vehlox:tour_done', 'true');
              localStorage.setItem('@vehlox:tour_step', '0');
              if (route) router.push(route);
            } else {
              const nextStep = stepNum + 1;
              localStorage.setItem('@vehlox:tour_step', nextStep.toString());
              
              if (route) {
                router.push(route);
              } else {
                // Na mesma tela: espera o próximo elemento aparecer (Essencial para a mudança de Oficina/Campo para o Form de OS)
                const nextConfig = getStepConfig(nextStep).config;
                if (nextConfig && nextConfig.element) {
                  waitForElement(nextConfig.element, () => runStep(nextStep));
                } else {
                  setTimeout(() => runStep(nextStep), 500);
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
      
      // Se a página já carregou no meio do tour, espera o elemento da página aparecer
      const currentConfig = getStepConfig(stepAtual).config;
      if (currentConfig && currentConfig.element) {
        waitForElement(currentConfig.element, () => runStep(stepAtual));
      } else {
        runStep(stepAtual);
      }
    };

    loadDriver();

    return () => {
      if (driverInstance) driverInstance.destroy();
    };
  }, [pathname, showIntro, router]);

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 max-w-lg w-full rounded-[2rem] p-8 md:p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-orange-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-900/40">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">Bem-vindo à VEHLOX</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Preparamos um tour guiado para você dominar o sistema. Vamos te mostrar como cadastrar seu primeiro Cliente, Veículo e Ordem de Serviço.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={startTour} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2">
              Começar Tour Guiado <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={skipTour} className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition">
              Pular e ir direto pro sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
