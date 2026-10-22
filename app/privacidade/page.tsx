import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export const metadata = {
  title: `Política de Privacidade | ${BRANDING.name}`,
  description: 'Saiba como tratamos e protegemos os seus dados.',
};

export default function PrivacidadePage() {
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
            <Lock className="text-orange-500 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Política de Privacidade</h1>
          <p className="text-zinc-500 font-medium">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="space-y-8 text-zinc-300 leading-relaxed text-sm">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">1. Introdução e LGPD</h2>
            <p>A sua privacidade é importante para nós. Esta Política de Privacidade explica como o <strong>{BRANDING.name}</strong> coleta, usa, armazena e protege as suas informações, em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">2. Quais dados coletamos?</h2>
            <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
              <li><strong>Dados de Cadastro:</strong> Nome, e-mail, senha (criptografada), CNPJ da empresa e telefone.</li>
              <li><strong>Dados Operacionais (Inseridos por você):</strong> Informações de clientes, veículos (placas, KM, horímetro), fotos de manutenção, ordens de serviço e valores financeiros.</li>
              <li><strong>Dados de Navegação:</strong> Endereço IP, logs de acesso e dados do dispositivo (para segurança e prevenção de fraudes).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">3. Como usamos os seus dados?</h2>
            <p>Os dados são utilizados estritamente para:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
              <li>Fornecer e manter o funcionamento do sistema de gestão.</li>
              <li>Garantir a segurança da sua conta (autenticação e controle de sessão).</li>
              <li>Enviar e-mails transacionais essenciais (como recuperação de senha e alertas de preventivas).</li>
              <li>Melhorar a experiência do usuário e o suporte técnico.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">4. Compartilhamento com Terceiros</h2>
            <p>Para funcionar com alta performance e segurança, utilizamos provedores de nuvem renomados. Nós <strong>não vendemos</strong> seus dados. O compartilhamento ocorre apenas para viabilizar o serviço:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
              <li><strong>Cloudinary:</strong> Armazenamento seguro de todas as fotos anexadas no sistema.</li>
              <li><strong>Brevo:</strong> Plataforma utilizada para o envio seguro de e-mails transacionais.</li>
              <li><strong>Cloudflare:</strong> Proteção contra ataques cibernéticos e DNS.</li>
              <li><strong>Hostinger:</strong> Hospedagem dos servidores e banco de dados.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">5. Segurança da Informação</h2>
            <p>Adotamos as melhores práticas do mercado para proteger seus dados. Suas senhas são criptografadas utilizando o algoritmo <em>Bcrypt</em>. As sessões utilizam tokens <em>JWT</em> com validação de versão, o que permite o logout remoto imediato em caso de perda de dispositivo. As fotos e arquivos são guardados em nuvem privada.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">6. Seus Direitos</h2>
            <p>Como titular dos dados, você tem o direito de solicitar a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
              <li>Confirmação da existência de tratamento dos seus dados.</li>
              <li>Acesso, correção ou atualização de dados incompletos.</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários (respeitando obrigações legais e fiscais).</li>
              <li>A revogação do consentimento.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">7. Contato</h2>
            <p>Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato com o nosso Encarregado de Proteção de Dados (DPO) pelo e-mail: <strong>privacidade@pinheiromecanica.com</strong>.</p>
          </section>

        </div>
      </main>
    </div>
  );
}
