import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { getPlanLimits, Plano } from '@/lib/plan-limits';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatSchema = z.object({
  mode: z.enum(['sistema', 'mecanico']),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).min(1, 'Envie ao menos uma mensagem'),
});

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ Bloqueio de Plano (Opcional: Deixar apenas para PRO)
    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      select: { plano: true },
    });
    const planoAtual = (empresa?.plano?.toUpperCase() as Plano) || 'BASICO';

    if (planoAtual !== 'PRO') {
      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          code: 'UPGRADE_REQUIRED',
          message: 'O Assistente com IA está disponível apenas no plano PRO.',
          planoAtual,
          feature: 'ia_suporte',
        },
        { status: 402 }
      );
    }

    const body = await request.json();
    const parsed = chatSchema.parse(body);

    let systemPrompt = '';

    // ============================================================
    // PERSONALIDADE 1: SUPORTE DO SISTEMA
    // ============================================================
    if (parsed.mode === 'sistema') {
      systemPrompt = `Você é a "Vehly", a assistente virtual do sistema VEHLOX.
Você é especialista em ensinar o usuário a usar o software.
O VEHLOX gerencia: Ordens de Serviço (Oficina e Campo), Preventivas, Estoque, Financeiro, Orçamentos e Portal do Cliente.

Suas regras:
- Responda SEMPRE em português do Brasil.
- Seja direta e use listas passo a passo.
- Se o usuário perguntar "Onde fica X?", explique o caminho no menu.
- Se ele estiver com erro, dê dicas de como resolver (ex: "Verifique se o veículo está vinculado a um cliente").
- NUNCA dê diagnósticos de mecânica nesta aba. Se ele perguntar de mecânica, avise: "Para diagnósticos de defeitos, mude para a aba 'Mecânico IA'".
- O usuário atual é: ${user.name} (${user.role}).`;
    } 
    // ============================================================
    // PERSONALIDADE 2: MECÂNICO CHEFE (DIAGNÓSTICO)
    // ============================================================
    else {
      // Busca as peças em estoque para dar contexto
      const pecasEstoque = await prisma.peca.findMany({
        where: { empresa_id: user.empresa_id, quantidade: { gt: 0 } },
        select: { descricao: true, codigo: true, quantidade: true },
        take: 20,
      });
      const listaPecas = pecasEstoque.map(p => `- ${p.descricao} (Estoque: ${p.quantidade})`).join('\n');

      systemPrompt = `Você é um Mecânico Chefe Sênior, especialista em caminhões diesel e máquinas pesadas.
Você está ajudando o mecânico da oficina a encontrar o defeito de um veículo.

Suas regras:
- Responda SEMPRE em português do Brasil, com linguagem técnica de oficina.
- Se o usuário não informar o modelo do veículo, PERGUNTE antes de dar o diagnóstico.
- Liste de 3 a 5 possíveis causas (da mais comum para a mais rara).
- Sugira testes práticos para isolar o problema.
- Cruze o diagnóstico com as peças em estoque que a oficina tem: \n${listaPecas || 'Nenhuma peça em estoque.'}
- Formate a resposta em Markdown (negrito, listas).
- NUNCA ensine a usar o sistema VEHLOX nesta aba. Se ele perguntar, avise: "Para dúvidas do sistema, mude para a aba 'Sistema'".
- O usuário atual é: ${user.name} (${user.role}).`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...parsed.messages,
      ],
      temperature: parsed.mode === 'mecanico' ? 0.3 : 0.5, // Mecânico é mais objetivo
      max_tokens: 800,
    });

    const respostaIA = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    return NextResponse.json({ resposta: respostaIA });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Erro na IA:', error);
    return apiError(error, 'IA', 'Erro ao processar mensagem do suporte IA');
  }
}
