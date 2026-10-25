import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';
import { getPlanLimits } from '@/lib/plan-limits'; // ✅ UPGRADE

/**
 * ✅ UPGRADE: verifica se o plano da empresa libera o Portal do Cliente.
 * Retorna um NextResponse 402 se bloqueado, ou null se liberado.
 */
async function checarPlanoPortal(empresa_id: string) {
  // ⚠️ Ajuste aqui se o model/campo do plano tiver outro nome no seu schema.
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresa_id },
    select: { plano: true },
  });

  const planoAtual = empresa?.plano ?? 'BASICO';
  const limites = getPlanLimits(planoAtual);

  if (!limites.portalCliente) {
    log(
      'WARN',
      'PORTAL_PUBLICO',
      'Acesso ao Portal do Cliente bloqueado pelo plano',
      { empresa_id, plano: planoAtual },
      'SISTEMA'
    );

    return NextResponse.json(
      {
        error: 'UPGRADE_REQUIRED',
        code: 'UPGRADE_REQUIRED',
        message: 'O Portal do Cliente está disponível apenas no plano PRO.',
        planoAtual,
        feature: 'portal_cliente',
      },
      { status: 402 }
    );
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });
    }

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

    // ✅ UPGRADE: bloqueia antes das consultas pesadas
    const bloqueio = await checarPlanoPortal(preventiva.empresa_id);
    if (bloqueio) return bloqueio;

    const empresa = await prisma.configuracaoEmpresa.findUnique({
      where: { empresa_id: preventiva.empresa_id },
      select: { nome_fantasia: true, razao_social: true, logo_url: true, telefone: true, endereco: true },
    });

    const historico = await prisma.preventivaExecucao.findMany({
      where: { preventiva_id: preventiva.id, empresa_id: preventiva.empresa_id },
      orderBy: { data_conclusao: 'desc' },
      take: 10,
    });

    let pecasUsadas: any[] = [];
    let debugInfo: any = { tentativas: [] };
    const osIdsParaTentar: string[] = [];

    // 1. Adiciona a OS do histórico (se existir)
    if (historico.length > 0 && historico[0].os_id) {
      osIdsParaTentar.push(historico[0].os_id);
    }

    // 2. Adiciona a última OS FINALIZADA do veículo
    const ultimaOs = await prisma.ordemServico.findFirst({
      where: { veiculo_id: preventiva.veiculo_id, empresa_id: preventiva.empresa_id, status: 'FINALIZADA' },
      orderBy: { data_finalizada: 'desc' }
    });
    if (ultimaOs && !osIdsParaTentar.includes(ultimaOs.id)) {
      osIdsParaTentar.push(ultimaOs.id);
    }

    debugInfo.osIds_verificados = osIdsParaTentar;

    // 3. Loop para achar peças em qualquer uma das OSs
    for (const osId of osIdsParaTentar) {
      const pecas = await prisma.pecaAplicada.findMany({
        where: { os_id: osId },
        include: { Peca: { select: { descricao: true, codigo: true, unidadeMedida: true } } }
      });

      if (pecas.length > 0) {
        pecasUsadas = pecas.map(p => ({
          id: p.id,
          descricao: p.Peca?.descricao || 'Peça aplicada',
          codigo: p.Peca?.codigo,
          quantidade: p.quantidade,
          unidade: p.unidade || p.Peca?.unidadeMedida || 'un',
        }));
        debugInfo.achou_pecas_na_os = osId;
        debugInfo.total = pecasUsadas.length;
        break; // Achou as peças, para de procurar
      }
    }

    let fotosArray: string[] = [];
    if (preventiva.fotos) {
      try { fotosArray = JSON.parse(preventiva.fotos); } catch { fotosArray = []; }
    }

    return NextResponse.json({
      id: preventiva.id,
      nome: preventiva.nome || preventiva.servico || preventiva.componente,
      descricao: preventiva.descricao,
      status: preventiva.status,
      tipo_controle: preventiva.tipo_controle,
      proximo_km: preventiva.proximo_km,
      proxima_data: preventiva.proxima_data,
      proximo_horimetro: preventiva.proximo_horimetro,
      intervalo_km: preventiva.intervalo_km,
      intervalo_horas: preventiva.intervalo_horas,
      fotos: fotosArray,
      veiculo: {
        placa: preventiva.Veiculo.placa,
        marca: preventiva.Veiculo.marca,
        modelo: preventiva.Veiculo.modelo,
        km: preventiva.Veiculo.quilometragem,
        horimetro: preventiva.Veiculo.horimetro_atual,
      },
      cliente: { nome: preventiva.Veiculo.Cliente.nome },
      empresa: empresa || null,
      assinatura_cliente: preventiva.assinatura_cliente,
      data_assinatura: preventiva.data_assinatura,
      pecasUsadas,
      debugInfo,
      historico: historico.map(h => ({
        id: h.id,
        data_conclusao: h.data_conclusao,
        km_conclusao: h.km_conclusao,
        horimetro_conclusao: h.horimetro_conclusao,
        os_id: h.os_id,
        observacoes: h.observacoes
      }))
    });
  } catch (error: any) {
    log('ERROR', 'PORTAL_PUBLICO', 'Erro ao carregar preventiva pública', { error: error?.message }, 'SISTEMA');
    return apiError(error, 'PORTAL', 'Erro ao carregar dados do portal.');
  }
}

const assinarSchema = z.object({ assinatura_base64: z.string().min(10, 'Assinatura inválida.') });

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const parsed = assinarSchema.parse(body);

    const preventiva = await prisma.preventiva.findUnique({
      where: { token_publico: token },
      select: { id: true, assinatura_cliente: true, empresa_id: true },
    });

    if (!preventiva) return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });

    // ✅ UPGRADE: bloqueia a assinatura via API mesmo se o front estiver burlado
    const bloqueio = await checarPlanoPortal(preventiva.empresa_id);
    if (bloqueio) return bloqueio;

    if (preventiva.assinatura_cliente) return NextResponse.json({ error: 'Este documento já foi assinado.' }, { status: 400 });

    await prisma.preventiva.update({
      where: { id: preventiva.id },
      data: { assinatura_cliente: parsed.assinatura_base64, data_assinatura: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    return apiError(error, 'PORTAL', 'Erro ao salvar assinatura.');
  }
}
