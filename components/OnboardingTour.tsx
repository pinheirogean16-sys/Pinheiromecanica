'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Rocket, ChevronRight } from 'lucide-react';

export default function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);

  // 1. Tela de Introdução
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

    // 👇 INJEÇÃO DE CSS PERSONALIZADO (Deixa o driver.js com a cara da VEHLOX)
    const styleId = 'vehlox-driver-custom-css';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .driver-popover {
          background-color: #18181b !important; /* zinc-900 */
          border: 1px solid #3f3f46 !important; /* zinc-700 */
          border-radius: 20px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
          color: #e4e4e7 !important;
          padding: 24px !important;
          max-width: 320px !important;
          font-family: inherit !important;
        }
        .driver-popover-title {
          color: #f97316 !important; /* orange-500 */
          font-size: 16px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          font-style: italic !important;
          margin-bottom: 8px !important;
          letter-spacing: -0.05em !important;
        }
        .driver-popover-description {
          color: #a1a1aa !important; /* zinc-400 */
          font-size: 13px !important;
          line-height: 1.6 !important;
          font-weight: 500 !important;
        }
        .driver-popover-footer {
          margin-top: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        .driver-popover-footer button {
          background-color: #f97316 !important; /* orange-500 */
          color: #fff !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 8px 16px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          letter-spacing: 0.05em !important;
          transition: all 0.2s !important;
          text-shadow: none !important;
          cursor: pointer !important;
        }
        .driver-popover-footer button:hover {
          background-color: #ea580c !important; /* orange-600 */
          transform: scale(0.98) !important;
        }
        .driver-popover-footer button.driver-popover-prev-btn {
          background-color: #27272a !important; /* zinc-800 */
          color: #a1a1aa !important;
        }
        .driver-popover-footer button.driver-popover-prev-btn:hover {
          background-color: #3f3f46 !important;
          color: #fff !important;
        }
        .driver-popover-progress-text {
          color: #71717a !important; /* zinc-500 */
          font-size: 10px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
        }
        .driver-popover-arrow {
          display: none !important; /* Esconde a setinha padrão */
        }
        .driver-active-element {
          border-radius: 16px !important;
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

        switch (stepNum) {
          case 2:
            stepConfig = {
              element: '#action-new-client',
              popover: {
                title: 'Fase 1: O Cliente',
                description: 'Tudo começa pelo cliente. Clique em Avançar para irmos à tela de cadastro.',
                side: 'bottom',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '3');
                  router.push('/clientes');
                }
              }
            };
            break;
          case 3:
            stepConfig = {
              element: '#btn-novo-cliente',
              popover: {
                title: 'Iniciando o Cadastro',
                description: 'Clique em Avançar e o sistema abrirá a janela de cadastro para você.',
                side: 'bottom',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '4');
                  if (driverInstance) driverInstance.destroy();
                  window.dispatchEvent(new Event('vehlox:open-client-modal'));
                  setTimeout(() => runStep('4'), 600);
                }
              }
            };
            break;
          case 4:
            stepConfig = {
              element: '#field-cliente-nome',
              popover: {
                title: 'Nome do Cliente',
                description: 'Digite o nome completo ou a razão social. É o primeiro dado essencial.',
                side: 'bottom',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '5');
                  runStep('5');
                }
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
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '6');
                  runStep('6');
                }
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
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '7');
                  runStep('7');
                }
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
                doneBtnText: 'Ir para Veículos',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '8');
                  if (driverInstance) driverInstance.destroy();
                  window.dispatchEvent(new Event('vehlox:close-client-modal'));
                  router.push('/veiculos/novo');
                }
              }
            };
            break;
          case 8:
            stepConfig = {
              element: 'form',
              popover: {
                title: 'Fase 2: O Veículo',
                description: 'Vincule a placa e o modelo ao cliente. Ao salvar, vamos para a OS.',
                side: 'top',
                doneBtnText: 'Criar Ordem de Serviço',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '9');
                  if (driverInstance) driverInstance.destroy();
                  router.push('/os/nova');
                }
              }
            };
            break;
          case 9:
            // Na tela /os/nova, temos o seletor de tipo (Oficina ou Campo)
            // Vamos apontar para o botão de escolher OFICINA
            stepConfig = {
              element: '#btn-tipo-oficina', 
              popover: {
                title: 'Fase 3: A Ordem de Serviço',
                description: 'Escolha o tipo de atendimento. Clique em Avançar para abrir o formulário da OS.',
                side: 'bottom',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '10');
                  if (driverInstance) driverInstance.destroy();
                  // Simula o clique no botão para abrir o formulário de Oficina
                  document.getElementById('btn-tipo-oficina')?.click();
                  setTimeout(() => runStep('10'), 800); // Espera a tela montar
                }
              }
            };
            break;
          case 10:
            // Já estamos dentro da WorkOrderOffice
            stepConfig = {
              element: '#section-mao-de-obra',
              popover: {
                title: 'Mão de Obra',
                description: 'Aqui você adiciona os serviços (ex: troca de óleo, revisão).',
                side: 'right',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '11');
                  runStep('11');
                }
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
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '12');
                  runStep('12');
                }
              }
            };
            break;
          case 12:
            stepConfig = {
              element: '#btn-protocolar-os',
              popover: {
                title: 'Finalizando a OS',
                description: 'Tudo pronto! Aqui você protocola a OS e ela entra no fluxo da oficina. Parabéns, você concluiu o tour!',
                side: 'top',
                doneBtnText: 'Finalizar Tutorial',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_done', 'true');
                  localStorage.setItem('@vehlox:tour_step', '0');
                  if (driverInstance) driverInstance.destroy();
                  router.push('/dashboard');
                }
              }
            };
            break;
          default:
            return;
        }

        if (stepConfig) {
          driverInstance = driver({
            showProgress: true,
            allowClose: false,
            overlayClickNext: false,
            nextBtnText: 'Avançar',
            prevBtnText: 'Voltar',
            steps: [stepConfig],
            onPopoverRender: (popover: any, opts: any) => {
              // Botão de Pular estilizado
              const skipBtn = document.createElement('button');
              skipBtn.innerText = 'Pular';
              skipBtn.style.background = 'transparent';
              skipBtn.style.border = 'none';
              skipBtn.style.color = '#ef4444';
              skipBtn.style.cursor = 'pointer';
              skipBtn.style.fontSize = '10px';
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
