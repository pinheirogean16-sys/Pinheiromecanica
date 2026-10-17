'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Rocket, ChevronRight } from 'lucide-react';

export default function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);

  // 1. Verifica se precisa mostrar a introdução
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
    setShowIntro(false);
  };

  // 2. Motor do Tour
  useEffect(() => {
    if (showIntro) return; 
    if (localStorage.getItem('@vehlox:tour_done')) return;

    const currentStep = parseInt(localStorage.getItem('@vehlox:tour_step') || '0', 10);
    if (currentStep < 2) return; 

    let driverInstance: any = null;

    // 👇 INJEÇÃO DE CSS PARA DEIXAR O MODAL BONITO (ESTILO VEHLOX)
    const styleId = 'vehlox-driver-custom-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .driver-popover {
          background-color: #18181b !important; /* zinc-900 */
          border: 1px solid #27272a !important; /* zinc-800 */
          border-radius: 20px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
          color: #e4e4e7 !important;
          padding: 24px !important;
          max-width: 340px !important;
          font-family: inherit !important;
        }
        .driver-popover-title {
          color: #f97316 !important; /* orange-500 */
          font-size: 18px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          font-style: italic !important;
          margin-bottom: 10px !important;
          letter-spacing: -0.05em !important;
        }
        .driver-popover-description {
          color: #a1a1aa !important; /* zinc-400 */
          font-size: 13px !important;
          line-height: 1.6 !important;
          font-weight: 500 !important;
        }
        .driver-popover-footer {
          margin-top: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          border-top: 1px solid #27272a !important;
          padding-top: 16px !important;
        }
        .driver-popover-footer button {
          background-color: #ea580c !important; /* orange-600 */
          color: #fff !important;
          border: none !important;
          border-radius: 12px !important;
          padding: 10px 20px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          letter-spacing: 0.05em !important;
          transition: all 0.2s !important;
          text-shadow: none !important;
          cursor: pointer !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        .driver-popover-footer button:hover {
          background-color: #f97316 !important; /* orange-500 */
          transform: scale(0.98) !important;
        }
        .driver-popover-progress-text {
          color: #71717a !important; /* zinc-500 */
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
        }
        .driver-popover-arrow {
          border-color: #18181b !important;
        }
        .driver-active-element {
          border-radius: 12px !important;
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

      const runStep = (stepStr: string) => {
        if (driverInstance) driverInstance.destroy();

        const stepNum = parseInt(stepStr, 10);
        let stepConfig: any = null;
        let isLastStep = false;
        let nextRoute: string | null = null;
        let dispatchEvent: string | null = null;

        switch (stepNum) {
          case 2:
            stepConfig = {
              element: '#action-new-client',
              popover: {
                title: 'Fase 1: O Cliente',
                description: 'Tudo começa pelo cliente. Clique em Avançar para irmos à tela de cadastro.',
                side: 'bottom',
              }
            };
            nextRoute = '/clientes';
            break;
          case 3:
            stepConfig = {
              element: '#btn-novo-cliente',
              popover: {
                title: 'Iniciando o Cadastro',
                description: 'Clique em Avançar e o sistema abrirá a janela de cadastro para você.',
                side: 'bottom',
              }
            };
            dispatchEvent = 'vehlox:open-client-modal';
            break;
          case 4:
            stepConfig = {
              element: '#field-cliente-nome',
              popover: {
                title: 'Nome do Cliente',
                description: 'Digite o nome completo ou a razão social. É o primeiro dado essencial.',
                side: 'bottom',
              }
            };
            break;
          case 5:
            stepConfig = {
              element: '#field-cliente-cpf',
              popover: {
                title: 'CPF ou CNPJ',
                description: 'O sistema valida automaticamente se o documento é verdadeiro.',
                side: 'bottom',
              }
            };
            break;
          case 6:
            stepConfig = {
              element: '#field-cliente-telefone',
              popover: {
                title: 'Contato',
                description: 'Para enviar o orçamento ou avisar quando o veículo estiver pronto.',
                side: 'bottom',
              }
            };
            break;
          case 7:
            stepConfig = {
              element: '#btn-salvar-cliente',
              popover: {
                title: 'Salvar o Cliente',
                description: 'Depois de preencher, clique aqui. Vamos avançar para o cadastro do Veículo!',
                side: 'top',
              }
            };
            dispatchEvent = 'vehlox:close-client-modal';
            nextRoute = '/veiculos/novo';
            break;
          case 8:
            stepConfig = {
              element: 'form',
              popover: {
                title: 'Fase 2: O Veículo',
                description: 'Vincule a placa e o modelo ao cliente. Ao salvar, vamos para a OS.',
                side: 'top',
              }
            };
            nextRoute = '/os/nova';
            break;
          case 9:
            stepConfig = {
              element: '#btn-tipo-oficina', 
              popover: {
                title: 'Fase 3: A Ordem de Serviço',
                description: 'Escolha o tipo de atendimento. Clique em Avançar para abrir o formulário da OS.',
                side: 'bottom',
              }
            };
            dispatchEvent = 'click:#btn-tipo-oficina'; // Simula o clique para abrir o form
            break;
          case 10:
            stepConfig = {
              element: '#section-mao-de-obra',
              popover: {
                title: 'Mão de Obra',
                description: 'Aqui você adiciona os serviços (ex: troca de óleo, revisão).',
                side: 'right',
              }
            };
            break;
          case 11:
            stepConfig = {
              element: '#section-insumos',
              popover: {
                title: 'Insumos e Peças',
                description: 'Aqui você adiciona as peças do estoque que serão usadas no veículo.',
                side: 'left',
              }
            };
            break;
          case 12:
            stepConfig = {
              element: '#btn-protocolar-os',
              popover: {
                title: 'Finalizando a OS',
                description: 'Tudo pronto! Aqui você protocola a OS. Parabéns, você concluiu o tour!',
                side: 'top',
              }
            };
            isLastStep = true;
            nextRoute = '/dashboard';
            break;
          default:
            return;
        }

        if (stepConfig) {
          driverInstance = driver({
            showProgress: true,
            allowClose: false,
            overlayClickNext: false,
            showButtons: ['next', 'close'], // Esconde o "Previous" que não funciona
            nextBtnText: isLastStep ? 'Finalizar Tutorial' : 'Avançar', // Muda o texto do botão
            steps: [stepConfig],
            onPopoverRender: (popover: any, opts: any) => {
              // Adiciona o botão de Pular de forma elegante
              const skipBtn = document.createElement('button');
              skipBtn.innerText = 'Pular';
              skipBtn.style.background = 'transparent';
              skipBtn.style.border = 'none';
              skipBtn.style.color = '#ef4444';
              skipBtn.style.cursor = 'pointer';
              skipBtn.style.fontSize = '11px';
              skipBtn.style.fontWeight = 'bold';
              skipBtn.style.textTransform = 'uppercase';
              skipBtn.style.letterSpacing = '0.05em';
              skipBtn.onclick = () => {
                localStorage.setItem('@vehlox:tour_done', 'true');
                localStorage.setItem('@vehlox:tour_step', '0');
                opts.driver.destroy();
                window.dispatchEvent(new Event('vehlox:close-client-modal'));
                router.push('/dashboard');
              };
              popover.footerButtons.prepend(skipBtn);

              // O Driver.js às vezes insiste em chamar o botão de "Done" (Concluir)
              // Forçamos o texto via JS também, por segurança.
              setTimeout(() => {
                const btns = document.querySelectorAll('.driver-popover-next-btn');
                btns.forEach((btn: any) => {
                  btn.innerText = isLastStep ? 'Finalizar Tutorial' : 'Avançar';
                });
              }, 50);
            },
            onNextClick: () => {
              // Limpa a instância atual
              if (driverInstance) driverInstance.destroy();
              
              // Executa ações específicas do passo (fechar/abrir modal, clicar em botão)
              if (dispatchEvent) {
                if (dispatchEvent.startsWith('click:')) {
                  const elementId = dispatchEvent.split(':')[1];
                  document.getElementById(elementId)?.click();
                } else {
                  window.dispatchEvent(new Event(dispatchEvent));
                }
              }

              // Avança no estado
              if (isLastStep) {
                localStorage.setItem('@vehlox:tour_done', 'true');
                localStorage.setItem('@vehlox:tour_step', '0');
                if (nextRoute) router.push(nextRoute);
              } else {
                localStorage.setItem('@vehlox:tour_step', (stepNum + 1).toString());
                
                // Se precisa mudar de página, navega. Se não, apenas roda o próximo passo localmente.
                if (nextRoute) {
                  router.push(nextRoute);
                } else {
                  setTimeout(() => runStep((stepNum + 1).toString()), 500);
                }
              }
            }
          });
          
          setTimeout(() => {
            driverInstance.drive();
          }, 300);
        }
      };

      const stepAtual = localStorage.getItem('@vehlox:tour_step') || '2';
      runStep(stepAtual);
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
