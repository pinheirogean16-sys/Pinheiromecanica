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
    localStorage.setItem('@vehlox:tour_step', '2'); // Começa no passo 2
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

    // Carrega Driver.js dinamicamente se ainda não estiver carregado
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
      script.onload = () => {
        startDriverEngine();
      };
      document.body.appendChild(script);
    };

    const startDriverEngine = () => {
      // @ts-ignore
      const driver = window.driver.js.driver;

      const runStep = (stepStr: string) => {
        // Se já houver um tutorial na tela, destrói ele antes de abrir o próximo
        if (driverInstance) {
          driverInstance.destroy();
        }

        const stepNum = parseInt(stepStr, 10);
        let stepConfig: any = null;

        switch (stepNum) {
          case 2:
            stepConfig = {
              element: '#action-new-client',
              popover: {
                title: 'Iniciando o Cadastro',
                description: 'Vamos aprender a usar o sistema na prática. Clique em Próximo para irmos para a tela de Clientes.',
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
                title: 'Abrindo o Cadastro',
                description: 'Aqui você adiciona novos clientes. Clique em Próximo e o sistema abrirá a janela de cadastro para você.',
                side: 'bottom',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '4');
                  if (driverInstance) driverInstance.destroy();
                  // Abre o modal
                  window.dispatchEvent(new Event('vehlox:open-client-modal'));
                  // Dá um tempo pro modal renderizar na tela e inicia o próximo passo
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
                description: 'Aqui você digita o nome completo ou a razão social. É o primeiro dado essencial.',
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
                description: 'O sistema valida automaticamente se o documento é verdadeiro. Muito importante para emitir notas.',
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
                description: 'Depois de preencher, é só clicar aqui. Vamos avançar para o cadastro do Veículo!',
                side: 'top',
                doneBtnText: 'Ir para Veículos',
                onNextClick: () => {
                  localStorage.setItem('@vehlox:tour_step', '8');
                  if (driverInstance) driverInstance.destroy();
                  window.dispatchEvent(new Event('vehlox:close-client-modal'));
                  router.push('/veiculos/novo');
                  // O passo 8 vai iniciar automaticamente na próxima tela por causa do useEffect
                }
              }
            };
            break;
          case 8:
            stepConfig = {
              element: 'form', // Aponta para o form principal de veículos
              popover: {
                title: 'Cadastrando o Veículo',
                description: 'Aqui você vincula a placa, modelo e ano ao cliente que acabou de criar. Parabéns, você concluiu o básico!',
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
            steps: [stepConfig],
            onPopoverRender: (popover: any, opts: any) => {
              const skipBtn = document.createElement('button');
              skipBtn.innerText = 'Pular Tutorial';
              skipBtn.style.marginLeft = '10px';
              skipBtn.style.background = 'transparent';
              skipBtn.style.border = 'none';
              skipBtn.style.color = '#ef4444';
              skipBtn.style.cursor = 'pointer';
              skipBtn.style.fontSize = '12px';
              skipBtn.style.fontWeight = 'bold';
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
          
          // Pequeno delay para garantir que o DOM atualizou
          setTimeout(() => {
            driverInstance.drive();
          }, 300);
        }
      };

      // Inicia o passo atual com base no localStorage
      const stepAtual = localStorage.getItem('@vehlox:tour_step') || '2';
      runStep(stepAtual);
    };

    loadDriver();

    return () => {
      if (driverInstance) {
        driverInstance.destroy();
      }
    };
  }, [pathname, showIntro, router]);

  // TELA DE INTRODUÇÃO (Boas-Vindas)
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
