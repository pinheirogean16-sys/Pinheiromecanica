import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

// A31: rota pública — só devolve dados que podem aparecer em documentos
// impressos (OS, orçamento, viagem, relatório financeiro).
// Dados bancários, PIX, token NFe e conta continuam só em
// GET /api/configuracoes/empresa (exige ADMIN).
//
// Qualquer usuário autenticado pode acessar esta rota, porque as telas
// de impressão precisam do cabeçalho para gerar o documento.
export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const config = await prisma.configuracaoEmpresa.findFirst({
      where: { empresa_id: user.empresa_id },
      select: {
        // Identidade visual
        nome_fantasia: true,
        razao_social: true,
        cnpj: true,
        inscricao_estadual: true,
        inscricao_municipal: true,
        // Contato
        telefone: true,
        email: true,
        // Endereço
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        uf: true,
        cep: true,
        // Aparência
        logo_url: true,
        rodape_personalizado: true,
        regime_tributario: true,
      },
    });

    if (!config) {
      // Sem config ainda — devolve vazio para o front usar fallback
      return NextResponse.json({});
    }

    return NextResponse.json(config);
  } catch (error: any) {
    log(
      'ERROR',
      'CONFIG',
      'Erro ao buscar configurações públicas da empresa',
      { error: error?.message },
      'sistema'
    );
    return apiError(error, 'CONFIG', 'Erro ao buscar configurações');
  }
}
