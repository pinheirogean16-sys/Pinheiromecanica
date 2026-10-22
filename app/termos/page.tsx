import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export const metadata = {
  title: `Termos de Uso | ${BRANDING.name}`,
  description: 'Termos e condições de uso da plataforma.',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500/30 pb-20">
      
      {/* Header Simples */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Voltar para o início
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-widest text-zinc-600">{BRANDING.name}</span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 space-y-10">
        
        <div className="space-y-4 text-center border-b border-zinc-800 pb-10">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scale className="text-orange-500 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Termos de Uso</h1>
          <p className="text-zinc-500 font-medium">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="space-y-8 text-zinc-300 leading-relaxed text-sm">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a plataforma <strong>{BRANDING.name}</strong>, você concorda integralmente com estes Termos de Uso. Se você não concorda com qualquer disposição aqui presente, não deverá utilizar nossos serviços.</p>
            <p>Estes termos aplicam-se a todos os usuários, incluindo administradores, mecânicos e visitantes.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">2. Descrição do Serviço</h2>
            <p>O <strong>{BRANDING.name}</strong> é um software como serviço (SaaS) destinado à gestão de oficinas mecânicas, frotas e máquinas pesadas. A plataforma oferece ferramentas para controle de Ordens de Serviço, gestão de estoque, acompanhamento de manutenção preventiva e controle financeiro.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">3. Conta e Período de Testes</h2>
            <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
              <li>Para utilizar o sistema, é necessário criar uma conta fornecendo informações verídicas e completas.</li>
              <li>Oferecemos um período de teste gratuito (Trial) de 14 dias. Após este período, o acesso será suspenso caso não haja a contratação de um plano.</li>
              <li>Você é o único responsável pela segurança de suas credenciais de acesso (e-mail e senha). Não compartilhe sua conta com terceiros.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">4. Pagamento e Cancelamento</h2>
            <p>Os planos são cobrados de forma recorrente (mensal ou anual, conforme a escolha). O cancelamento pode ser feito a qualquer momento diretamente no painel do sistema, sem multas ou fidelidade. O acesso permanecerá ativo até o fim do período já pago.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">5. Uso Aceitável</h2>
            <p>Você concorda em não utilizar a plataforma para:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
              <li>Violar leis ou regulamentos aplicáveis.</li>
              <li>Fazer engenharia reversa, descompilar ou tentar extrair o código-fonte do sistema.</li>
              <li>Realizar ataques cibernéticos, sobrecarga de servidores (DDoS) ou tentativas de invasão (hacking).</li>
              <li>Enviar dados falsos ou fazer uso indevido da comunicação com os clientes finais.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">6. Propriedade Intelectual</h2>
            <p>Todo o código, design, logotipos e funcionalidades do sistema são de propriedade exclusiva do <strong>{BRANDING.name}</strong>. Os dados inseridos na plataforma (dados de clientes, veículos e fotos) pertencem à empresa assinante, que é a única responsável por sua gestão.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">7. Limitação de Responsabilidade</h2>
            <p>O sistema é fornecido "como está". Não nos responsabilizamos por lucros cessantes, perda de dados decorrentes de uso incorreto, ou indisponibilidades temporárias do servidor (manutenções programadas ou falhas de provedores de nuvem).</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">8. Foro</h2>
            <p>Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca da sede da empresa fornecedora do software.</p>
          </section>

        </div>
      </main>
    </div>
  );
}
