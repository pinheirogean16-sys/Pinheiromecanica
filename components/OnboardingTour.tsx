'use client';

import { useEffect } from 'react';

export default function OnboardingTour() {
  useEffect(() => {
    // 1. Verifica se o usuário já viu o tour
    const jaViuTour = localStorage.getItem('@vehlox:tour_done');
    if (jaViuTour) return;

    // 2. Injeta o CSS do Driver.js
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css';
    document.head.appendChild(link);

    // 3. Injeta o JS do Driver.js
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js';
    script.async = true;
    
    script.onload = () => {
      // @ts-ignore
      const driver = window.driver.js.driver;

      const tour = driver({
        showProgress: true,
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        doneBtnText: 'Concluir',
        progressText: 'Passo {{current}} de {{total}}',
        steps: [
          {
            element: '#action-new-client', // Aponta para o botão gigante no Dashboard
            popover: {
              title: '1. Cadastre seus Clientes',
              description: 'Sempre comece por aqui. Cadastre o proprietário do veículo.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#action-new-vehicle',
            popover: {
              title: '2. Adicione os Veículos',
              description: 'Vincule a placa e o modelo do caminhão ou máquina ao cliente.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#action-new-nfe',
            popover: {
              title: '3. Importação NF-e',
              description: 'Se você comprou peças e tem o XML, pode dar entrada no estoque direto por aqui.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#action-new-os',
            popover: {
              title: '4. Abra sua primeira OS',
              description: 'O coração do sistema. Clique aqui para criar uma Ordem de Serviço, adicionar peças e serviços.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#action-new-quote',
            popover: {
              title: '5. Gere um Orçamento',
              description: 'Antes de iniciar um serviço, envie uma proposta para o cliente aprovar.',
              side: 'bottom',
              align: 'center'
            }
          }
        ],
        onDestroyed: () => {
          localStorage.setItem('@vehlox:tour_done', 'true');
        }
      });

      setTimeout(() => {
        tour.drive();
      }, 1000);
    };

    document.body.appendChild(script);

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return null;
}
