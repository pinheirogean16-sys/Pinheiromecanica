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
      // @ts-ignore (ignora o erro do TypeScript porque estamos usando via CDN)
      const driver = window.driver.js.driver;

      const tour = driver({
        showProgress: true,
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        doneBtnText: 'Concluir',
        progressText: 'Passo {{current}} de {{total}}',
        steps: [
          {
            element: 'a[href="/clientes"]',
            popover: {
              title: '1. Seus Clientes',
              description: 'Cadastre os proprietários dos veículos aqui. Você pode adicionar quantos quiser.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: 'a[href="/veiculos"]',
            popover: {
              title: '2. Seus Veículos',
              description: 'Aqui ficam os caminhões, carretas e máquinas vinculados aos clientes.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: 'a[href="/estoque"]',
            popover: {
              title: '3. Almoxarifado',
              description: 'Controle suas peças, entradas e saídas de estoque neste módulo.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: 'a[href="/os"]',
            popover: {
              title: '4. Ordens de Serviço',
              description: 'O coração do sistema. Crie a OS, adicione serviços e peças, e acompanhe o status.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: 'a[href="/financeiro"]',
            popover: {
              title: '5. Financeiro',
              description: 'Acompanhe o faturamento da oficina e as contas a pagar/receber.',
              side: 'right',
              align: 'start'
            }
          }
        ],
        onDestroyed: () => {
          // Salva no navegador que ele já viu o tour
          localStorage.setItem('@vehlox:tour_done', 'true');
        }
      });

      // Inicia o tour após 1 segundo (para dar tempo do menu carregar na tela)
      setTimeout(() => {
        tour.drive();
      }, 1000);
    };

    document.body.appendChild(script);

    // Limpeza (se o componente for desmontado)
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return null; // O componente não aparece na tela, ele só executa a ação
}
