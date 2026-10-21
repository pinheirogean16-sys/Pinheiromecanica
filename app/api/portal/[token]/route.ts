import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';

// ============================================================
// GET — Cliente acessa o link para ver os dados
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });
    }

    // Busca a preventiva usando o token seguro
    const preventiva = await prisma.preventiva.findUnique({
      where: { token_publico: token },
      include: {
        Veiculo: {
          include: { Cliente: true },
        },
      },
    });

    if (!preventiva) {
      return NextResponse.json(
        { error: 'Este link é inválido, expirou ou a preventiva não foi encontrada.' },
        { status: 404 }
      );
    }

    // Busca os dados da sua empresa para exibir o cabeçalho
    const empresa = await prisma.configuracaoEmpresa.findUnique({
      where: { empresa_id: preventiva.empresa_id },
      select: {
        nome_fantasia: true,
        razao_social: true,
        logo_url: true,
        telefone: true,
        endereco: true,
      },
    });

    // Trata as fotos (que estão salvas como JSON string)
    let fotosArray: string[] = [];
    if (preventiva.fotos) {
      try {
        fotosArray = JSON.parse(preventiva.fotos);
      } catch {
        fotosArray = [];
      }
    }

    // Retorna apenas o que o cliente precisa ver (Segurança)
    return NextResponse.json({
      id: preventiva.id,
      nome: preventiva.nome || preventiva.servico || preventiva.componente,
      descricao: preventiva.descricao,
      status: preventiva.status,
      proximo_km: preventiva.proximo_km,
      proxima_data: preventiva.proxima_data,
      fotos: fotosArray,
      veiculo: {
        placa: preventiva.Veiculo.placa,
        marca: preventiva.Veiculo.marca,
        modelo: preventiva.Veiculo.modelo,
        km: preventiva.Veiculo.quilometragem,
        horimetro: preventiva.Veiculo.horimetro_atual,
      },
      cliente: {
        nome: preventiva.Veiculo.Cliente.nome,
      },
      empresa: empresa || null,
      assinatura_cliente: preventiva.assinatura_cliente,
      data_assinatura: preventiva.data_assinatura,
    });
  } catch (error: any) {
    log('ERROR', 'PORTAL_PUBLICO', 'Erro ao carregar preventiva pública', { error: error?.message }, 'SISTEMA');
    return apiError(error, 'PORTAL', 'Erro ao carregar dados do portal.');
  }
}

// ============================================================
// POST — Cliente envia a assinatura pelo celular
// ============================================================
const assinarSchema = z.object({
  assinatura_base64: z.string().min(10, 'Assinatura inválida.'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    // Valida se a assinatura foi enviada corretamente
    const parsed = assinarSchema.parse(body);

    const preventiva = await prisma.preventiva.findUnique({
      where: { token_publico: token },
      select: {
        id: true,
        assinatura_cliente: true,
        empresa_id: true,
        nome: true,
      },
    });

    if (!preventiva) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    // ✅ TRAVA DE SEGURANÇA: Se já foi assinado, bloqueia nova assinatura
    if (preventiva.assinatura_cliente) {
      return NextResponse.json(
        { error: 'Este documento já foi assinado anteriormente.' },
        { status: 400 }
      );
    }

    // Salva a assinatura no banco de dados
    await prisma.preventiva.update({
      where: { id: preventiva.id },
      data: {
        assinatura_cliente: parsed.assinatura_base64,
        data_assinatura: new Date(),
        // token_publico: null, // Opcional: Se quiser que o link pare de funcionar após assinar, descomente esta linha.
      },
    });

    log('INFO', 'PORTAL_PUBLICO', 'Preventiva assinada pelo cliente', { preventivaId: preventiva.id }, 'CLIENTE');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'PORTAL', 'Erro ao salvar assinatura.');
  }
}
