'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // 1. Verifica se já concluiu o tour
    const tourDone = localStorage.getItem('@vehlox:tour_done');
    if (tourDone) return;

    // 2. Define qual passo o usuário está
    let currentStep = parseInt(localStorage.getItem('@vehlox:tour_step') || '0', 10);
    if (currentStep === 0) {
      currentStep = 1; // Inicia no passo 1 se não tiver nada
      localStorage.setItem('@vehlox:tour_step', '1');
    }

    // 3. Injeta CSS e JS do Driver.js
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

      // PASSO 1: Dashboard -> Botão Novo Cliente
      if (pathname === '/dashboard' && currentStep === 1) {
        steps = [{
          element: '#action-new-client',
          popover: {
            title: 'Vamos cadastrar seu primeiro Cliente!',
            description: 'Clique em Próximo para abrirmos a tela de cadastro de clientes.',
            side: 'bottom',
            onNextClick: () => {
              localStorage.setItem('@vehlox:tour_step', '2');
              router.push('/clientes');
            }
          }
        }];
      }
      
      // PASSO 2: Tela de Clientes -> Botão Registrar Cliente
      else if (pathname === '/clientes' && currentStep === 2) {
        steps = [{
          element: '#btn-novo-cliente',
          popover: {
            title: 'Lista de Clientes',
            description: 'Aqui ficam todos os seus clientes. Vamos avançar para a tela de cadastro.',
            side: 'bottom',
            onNextClick: () => {
              localStorage.setItem('@vehlox:tour_step', '3');
              router.push('/clientes/novo');
            }
          }
        }];
      }

      // PASSO 3: Novo Cliente -> Formulário
      else if (pathname === '/clientes/novo' && currentStep === 3) {
        steps = [{
          element: '#form-cliente',
          popover: {
            title: 'Cadastro de Cliente',
            description: 'Preencha os dados, CPF/CNPJ e clique em salvar. Este é o primeiro passo para abrir uma OS!',
            side: 'top',
            onNextClick: () => {
              localStorage.setItem('@vehlox:tour_step', '0');
              localStorage.setItem('@vehlox:tour_done', 'true');
              router.push('/dashboard');
            }
          }
        }];
      }

      // Se encontrou o passo para a tela atual, inicia o tour
      if (steps.length > 0) {
        const tour = driver({
          showProgress: true,
          allowClose: false, // TRAVA: impede fechar clicando fora
          overlayClickNext: false, // TRAVA: impede avançar clicando no escuro
          showButtons: ['next'], // Apenas botão próximo
          nextBtnText: 'Próximo',
          doneBtnText: 'Concluir',
          steps: steps,
          // Adiciona o botão "Pular" (Sair) no rodapé
          onPopoverRender: (popover, opts) => {
            const skipBtn = document.createElement('button');
            skipBtn.innerText = 'Pular Tour';
            skipBtn.style.marginLeft = '10px';
            skipBtn.style.background = 'transparent';
            skipBtn.style.border = 'none';
            skipBtn.style.color = '#ef4444'; // Vermelho
            skipBtn.style.cursor = 'pointer';
            skipBtn.style.fontSize = '12px';
            skipBtn.style.fontWeight = 'bold';
            skipBtn.onclick = () => {
              localStorage.setItem('@vehlox:tour_step', '0');
              localStorage.setItem('@vehlox:tour_done', 'true');
              opts.driver.destroy();
              router.push('/dashboard');
            };
            // Adiciona o botão no canto esquerdo do rodapé do tour
            popover.footerButtons.prepend(skipBtn);
          }
        });

        // Delay para a página carregar os elementos antes de apontar
        setTimeout(() => {
          tour.drive();
        }, 1500);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [pathname, mounted, router]);

  return null;
}
