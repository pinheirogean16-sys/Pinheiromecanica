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
    localStorage.setItem('@vehlox:tour_step', '2'); // Começa no passo 2 (pós-introdução)
  };

  const skipTour = () => {
    localStorage.setItem('@vehlox:tour_done', 'true');
    setShowIntro(false);
  };

  // 2. Motor do Tour (Driver.js)
  useEffect(() => {
    if (showIntro) return; // Se a intro tá aberta, não roda o driver
    if (localStorage.getItem('@vehlox:tour_done')) return;

    const currentStep = parseInt(localStorage.getItem('@vehlox:tour_step') || '0', 10);
    if (currentStep < 2) return; // Só roda a partir do passo 2

    // Carrega Driver.js dinamicamente
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js';
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      const driver = window.driver.js.driver;
      let steps: any[] = [];

      const nextStep = (step: number, path?: string) => {
        localStorage.setItem('@vehlox:tour_step', step.toString());
        if (path) router.push(path);
      };

      // --- PASSO 2: Dashboard aponta pro Atalho ---
      if (pathname === '/dashboard' && currentStep === 2) {
        steps = [{
          element: '#action-new-client',
          popover: {
            title: 'Iniciando o Cadastro',
            description: 'Vamos aprender a usar o sistema na prática. Clique em Próximo para irmos para a tela de Clientes.',
            side: 'bottom',
            onNextClick: () => nextStep(3, '/clientes')
          }
        }];
      }

      // --- PASSO 3: Tela de Clientes aponta pro botão ---
      else if (pathname === '/clientes' && currentStep === 3) {
        steps = [{
          element: '#btn-novo-cliente',
          popover: {
            title: 'Abrindo o Cadastro',
            description: 'Aqui você adiciona novos clientes. Clique em Próximo e o sistema abrirá a janela de cadastro para você.',
            side: 'bottom',
            onNextClick: () => {
              nextStep(4);
              window.dispatchEvent(new Event('vehlox:open-client-modal'));
              // Dá um tempo pro modal abrir antes de o driver piscar
              setTimeout(() => { document.querySelector('.driver-active-element')?.classList.remove('driver-active-element'); }, 100);
            }
          }
        }];
      }

      // --- PASSO 4: Modal aberto (Campo Nome) ---
      else if (pathname === '/clientes' && currentStep === 4) {
        // Espera o modal abrir na tela
        setTimeout(() => {
          steps = [{
            element: '#field-cliente-nome',
            popover: {
              title: 'Nome do Cliente',
              description: 'Aqui você digita o nome completo ou a razão social. É o primeiro dado essencial.',
              side: 'bottom',
              onNextClick: () => nextStep(5)
            }
          }];
          if (steps.length > 0) startDriver(steps, false);
        }, 500);
        return; 
      }

      // --- PASSO 5: Modal aberto (Campo CPF) ---
      else if (pathname === '/clientes' && currentStep === 5) {
        steps = [{
          element: '#field-cliente-cpf',
          popover: {
            title: 'CPF ou CNPJ',
            description: 'O sistema valida automaticamente se o documento é verdadeiro. Muito importante para emitir notas.',
            side: 'bottom',
            onNextClick: () => nextStep(6)
          }
        }];
      }

      // --- PASSO 6: Modal aberto (Campo Telefone) ---
      else if (pathname === '/clientes' && currentStep === 6) {
        steps = [{
          element: '#field-cliente-telefone',
          popover: {
            title: 'Contato',
            description: 'Para enviar o orçamento ou avisar quando o veículo estiver pronto.',
            side: 'bottom',
            onNextClick: () => nextStep(7)
          }
        }];
      }

      // --- PASSO 7: Botão Salvar ---
      else if (pathname === '/clientes' && currentStep === 7) {
        steps = [{
          element: '#btn-salvar-cliente',
          popover: {
            title: 'Salvar o Cliente',
            description: 'Depois de preencher, é só clicar aqui. Vamos avançar para o cadastro do Veículo!',
            side: 'top',
            onNextClick: () => {
              nextStep(8, '/veiculos/novo');
              window.dispatchEvent(new Event('vehlox:close-client-modal'));
            }
          }
        }];
      }

      // --- PASSO 8: Tela de Veículo ---
      else if (pathname === '/veiculos/novo' && currentStep === 8) {
        steps = [{
          element: '#form-veiculo', // ID que você vai colocar no form de veículo
          popover: {
            title: 'Cadastrando o Veículo',
            description: 'Aqui você vincula a placa, modelo e ano ao cliente que acabou de criar. Parabéns, você já sabe o básico!',
            side: 'top',
            onNextClick: () => {
              localStorage.setItem('@vehlox:tour_done', 'true');
              nextStep(0, '/dashboard');
            }
          }
        }];
      }

      const startDriver = (tourSteps: any[], clearActive = true) => {
        const tour = driver({
          showProgress: true,
          allowClose: false,
          overlayClickNext: false,
          nextBtnText: 'Avançar',
          doneBtnText: 'Concluir',
          steps: tourSteps,
          onPopoverRender: (popover: any, opts: any) => {
            const skipBtn = document.createElement('button');
            skipBtn.innerText = 'Pular Tutorial';
            skipBtn.style.marginLeft = '10px';
            skipBtn.style.background = 'transparent';
            skipBtn.style.border = 'none';
            skipBtn.style.color = '#ef4444';
            skipBtn.style.cursor = 'pointer';
            skipBtn.style.fontSize = '12px';
            skipBtn.onclick = () => {
              localStorage.setItem('@vehlox:tour_done', 'true');
              opts.driver.destroy();
              router.push('/dashboard');
            };
            popover.footerButtons.prepend(skipBtn);
          }
        });
        tour.drive();
      };

      if (steps.length > 0) {
        setTimeout(() => startDriver(steps), clearActive ? 500 : 0);
      }
    };

    document.body.appendChild(script);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
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
