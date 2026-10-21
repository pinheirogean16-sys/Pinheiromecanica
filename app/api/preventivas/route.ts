import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';
import { avaliarStatusPreventiva } from '@/lib/preventivas';

// ============================================================
// CONSTANTES
// ============================================================
const MAX_ITENS_GET = 1000;

const TIPOS_CONTROLE = ['KM', 'DIAS', 'HORAS', 'MISTO'] as const;

// ============================================================
// HELPER: parse de data seguro
// ============================================================
function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// SCHEMAS
// ============================================================
const preventivaSchema = z.object({
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  nome: z.string().max(200).optional().nullable(),
  servico: z.string().max(200).optional().nullable(),
  componente: z.string().max(100).optional().nullable().default('REVISAO'),
  descricao: z.string().max(1000).optional().nullable().default(''),
  observacoes: z.string().max(2000).optional().nullable().default(''),
  
  // ✅ NOVO: Aceita a URL da foto
  foto_url: z.string().optional().nullable(),

  // ✅ CORRIGIDO: Aceita 'COMBINADO' do frontend e transforma em 'MISTO' para o banco
  tipo_controle: z.preprocess(
    (val) => (val === 'COMBINADO' ? 'MISTO' : val),
    z.enum(TIPOS_CONTROLE).optional().default('KM')
  ),
  
  intervalo_dias: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  intervalo_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  intervalo_horas: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive().optional().nullable()
  ),
  ultima_data: z.string().optional().nullable(),
  ultimo_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().nonnegative().optional().nullable()
  ),
  ultimo_horimetro: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().nonnegative().optional().nullable()
  ),
  proxima_data: z.string().optional().nullable(),
  proximo_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  proximo_horimetro: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive().optional().nullable()
  ),
  antecedencia_dias: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 15 : Number(val)),
    z.number().int().optional().nullable().default(15)
  ),
  antecedencia_km: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 1500 : Number(val)),
    z.number().int().optional().nullable().default(1500)
  ),
  antecedencia_horas: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 50 : Number(val)),
    z.number().optional().nullable().default(50)
  ),
  ativo: z.boolean().optional().default(true),
  km_limite: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().optional().nullable()
  ),
  data_limite: z.string().optional().nullable(),
});

const listarPreventivasQuerySchema = z.object({
  veiculo_id: z.string().optional(),
  cliente_id: z.string().optional(),
  status: z.string().max(50).optional(),
  q: z.string().max(100).optional().transform((v) => v?.trim().toLowerCase() || ''),
});

// ============================================================
// GET — Listar preventivas
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listarPreventivasQuerySchema.parse({
      veiculo_id: searchParams.get('veiculo_id') || undefined,
      cliente_id: searchParams.get('cliente_id') || undefined,
      status: searchParams.get('status') || undefined,
      q: searchParams.get('q') || undefined,
    });

    const { veiculo_id, cliente_id, status: statusParam, q: query } = parsed;

    const where: any = {
      empresa_id: user.empresa_id,
    };

    if (veiculo_id) where.veiculo_id = veiculo_id;
    if (cliente_id) where.Veiculo = { cliente_id };

    const preventivas = await prisma.preventiva.findMany({
      where,
      include: {
        Veiculo: { include: { Cliente: true } },
      },
      orderBy: { created_at: 'desc' },
      take: MAX_ITENS_GET,
    });

    const evaluatedPreventivas: any[] = [];
    const statusUpdates: Record<string, string[]> = {};

    for (const p of preventivas) {
      const avaliacao = avaliarStatusPreventiva(p);

      if (avaliacao.status !== p.status) {
        if (!statusUpdates[avaliacao.status]) statusUpdates[avaliacao.status] = [];
        statusUpdates[avaliacao.status].push(p.id);
        p.status = avaliacao.status;
      }

      if (statusParam && avaliacao.status !== statusParam) continue;

      if (query) {
        const matchPlaca = p.Veiculo?.placa?.toLowerCase().includes(query);
        const matchModelo = p.Veiculo?.modelo?.toLowerCase().includes(query);
        const matchMarca = p.Veiculo?.marca?.toLowerCase().includes(query);
        const matchCliente = p.Veiculo?.Cliente?.nome?.toLowerCase().includes(query);
        const matchNome = p.nome?.toLowerCase().includes(query);
        const matchServico = p.servico?.toLowerCase().includes(query);
        const matchComponente = p.componente?.toLowerCase().includes(query);
        const matchDesc = p.descricao?.toLowerCase().includes(query);

        if (!matchPlaca && !matchModelo && !matchMarca && !matchCliente && !matchNome && !matchServico && !matchComponente && !matchDesc) {
          continue;
        }
      }

      evaluatedPreventivas.push({
        ...p,
        km_atual: avaliacao.km_atual,
        horimetro_atual: avaliacao.horimetro_atual,
        km_restante: avaliacao.km_restante,
        horas_restantes: avaliacao.horas_restantes,
        dias_restantes: avaliacao.dias_restantes,
        isVencido: avaliacao.isVencido,
        isProximo: avaliacao.isProximo,
        veiculo: p.Veiculo,
      });
    }

    // Atualiza status em batch
    for (const [novoStatus, ids] of Object.entries(statusUpdates)) {
      try {
        await prisma.preventiva.updateMany({
          where: {
            id: { in: ids },
            empresa_id: user.empresa_id,
          },
          data: { status: novoStatus },
        });
      } catch (err: any) {
        log('WARN', 'PREVENTIVAS', 'Falha ao sincronizar status em batch', { error: err?.message, count: ids.length }, 'sistema');
      }
    }

    return NextResponse.json(evaluatedPreventivas);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'PREVENTIVAS', 'Erro ao obter preventivas');
  }
}

// ============================================================
// POST — Criar preventiva
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = preventivaSchema.parse(await request.json());

    const veiculo = await prisma.veiculo.findFirst({
      where: {
        id: body.veiculo_id,
        empresa_id: user.empresa_id,
      },
      include: { Cliente: true },
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 404 });
    }

    const kmAtual = veiculo.quilometragem || 0;
    const horimetroAtual = veiculo.horimetro_atual || 0;

    let proximaData: Date | null = null;
    if (body.proxima_data) {
      proximaData = parseDate(body.proxima_data);
    } else if (body.data_limite) {
      proximaData = parseDate(body.data_limite);
    } else if (body.intervalo_dias) {
      const baseDate = body.ultima_data ? parseDate(body.ultima_data) || new Date() : new Date();
      baseDate.setDate(baseDate.getDate() + body.intervalo_dias);
      proximaData = baseDate;
    }

    let proximoKm = body.proximo_km ?? body.km_limite ?? null;
    if (!proximoKm && body.intervalo_km) {
      const baseKm = body.ultimo_km ?? kmAtual;
      proximoKm = baseKm + body.intervalo_km;
    }

    let proximoHorimetro = body.proximo_horimetro ?? null;
    if (!proximoHorimetro && body.intervalo_horas) {
      const baseHoras = body.ultimo_horimetro ?? horimetroAtual;
      proximoHorimetro = baseHoras + body.intervalo_horas;
    }

    const componenteFinal = body.componente || body.servico || body.nome || 'REVISAO';
    const nomeFinal = body.nome || body.servico || componenteFinal;
    const servicoFinal = body.servico || body.nome || componenteFinal;

    const tempObj = {
      Veiculo: veiculo,
      proximo_km: proximoKm,
      km_limite: proximoKm,
      proximo_horimetro: proximoHorimetro,
      proxima_data: proximaData,
      data_limite: proximaData,
      antecedencia_dias: body.antecedencia_dias,
      antecedencia_km: body.antecedencia_km,
      antecedencia_horas: body.antecedencia_horas,
      ativo: body.ativo !== undefined ? body.ativo : true,
    };

    const avaliacao = avaliarStatusPreventiva(tempObj, veiculo);

    const novaPreventiva = await prisma.preventiva.create({
      data: {
        id: globalThis.crypto.randomUUID(),
        empresa_id: user.empresa_id,
        veiculo_id: body.veiculo_id,
        nome: nomeFinal,
        servico: servicoFinal,
        componente: componenteFinal,
        descricao: body.descricao || '',
        observacoes: body.observacoes || '',
        
        foto_url: body.foto_url || null, // ✅ SALVANDO A FOTO AQUI
        
        tipo_controle: body.tipo_controle || 'KM',
        intervalo_dias: body.intervalo_dias ?? null,
        intervalo_km: body.intervalo_km ?? null,
        intervalo_horas: body.intervalo_horas ?? null,
        ultima_data: parseDate(body.ultima_data),
        ultimo_km: body.ultimo_km ?? null,
        ultimo_horimetro: body.ultimo_horimetro ?? null,
        proxima_data: proximaData,
        proximo_km: proximoKm,
        proximo_horimetro: proximoHorimetro,
        antecedencia_dias: body.antecedencia_dias ?? 15,
        antecedencia_km: body.antecedencia_km ?? 1500,
        antecedencia_horas: body.antecedencia_horas ?? 50,
        ativo: body.ativo !== undefined ? body.ativo : true,
        created_by: user.name || user.email || 'Usuário',
        km_limite: proximoKm,
        km_atual: kmAtual,
        horimetro_atual: horimetroAtual,
        data_limite: proximaData,
        status: body.ativo === false ? 'DESATIVADO' : avaliacao.status,
        updated_at: new Date(),
      },
      include: {
        Veiculo: { include: { Cliente: true } },
      },
    });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'CRIAR',
      entidade: 'Preventiva',
      entidade_id: novaPreventiva.id,
      usuario: user?.name || user?.email || 'Sistema',
      empresa_id: user.empresa_id,
      dados_depois: novaPreventiva,
    });

    log('INFO', 'PREVENTIVAS', 'Plano de manutenção preventiva criado', { id: novaPreventiva.id }, user?.name);

    return NextResponse.json(novaPreventiva, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return apiError(error, 'PREVENTIVAS', 'Erro ao criar preventiva');
  }
}
