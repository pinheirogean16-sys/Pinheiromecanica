import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { avaliarStatusPreventiva, notificarPreventivasPendentes } from '@/lib/preventivas';

const preventivaSchema = z.object({
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  nome: z.string().optional().nullable(),
  servico: z.string().optional().nullable(),
  componente: z.string().optional().nullable().default('REVISAO'),
  descricao: z.string().optional().nullable().default(''),
  observacoes: z.string().optional().nullable().default(''),
  tipo_controle: z.string().optional().default('KM'),
  intervalo_dias: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  intervalo_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  intervalo_horas: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().optional().nullable()),
  ultima_data: z.string().optional().nullable(),
  ultimo_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().nonnegative().optional().nullable()),
  ultimo_horimetro: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().nonnegative().optional().nullable()),
  proxima_data: z.string().optional().nullable(),
  proximo_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  proximo_horimetro: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().optional().nullable()),
  antecedencia_dias: z.preprocess((val) => (val === '' || val === null || val === undefined ? 15 : Number(val)), z.number().int().optional().nullable().default(15)),
  antecedencia_km: z.preprocess((val) => (val === '' || val === null || val === undefined ? 1500 : Number(val)), z.number().int().optional().nullable().default(1500)),
  antecedencia_horas: z.preprocess((val) => (val === '' || val === null || val === undefined ? 50 : Number(val)), z.number().optional().nullable().default(50)),
  ativo: z.boolean().optional().default(true),
  // Campos retrocompatíveis
  km_limite: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().optional().nullable()),
  data_limite: z.string().optional().nullable()
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const veiculoId = searchParams.get('veiculo_id');
    const clienteId = searchParams.get('cliente_id');
    const statusParam = searchParams.get('status');
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    const where: any = {
      empresa_id: user.empresa_id
    };

    if (veiculoId) {
      where.veiculo_id = veiculoId;
    }

    if (clienteId) {
      where.Veiculo = {
        cliente_id: clienteId
      };
    }

    const preventivas = await prisma.preventiva.findMany({
      where,
      include: {
        Veiculo: {
          include: {
            Cliente: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const evaluatedPreventivas = [];

    for (const p of preventivas) {
      const avaliacao = avaliarStatusPreventiva(p);

      // Se o status calculado diferir do gravado no banco, atualiza para consistência
      if (avaliacao.status !== p.status) {
        await prisma.preventiva.update({
          where: { id: p.id },
          data: { status: avaliacao.status }
        });
        p.status = avaliacao.status;
      }

      // Filtro por status
      if (statusParam && avaliacao.status !== statusParam) {
        continue;
      }

      // Filtro de busca textual geral
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
        veiculo: p.Veiculo
      });
    }

    // Disparar checagem assíncrona de notificações em background sem bloquear a resposta
    notificarPreventivasPendentes(user.empresa_id).catch(err => {
      console.error('Falha ao rodar notificarPreventivasPendentes:', err);
    });

    return NextResponse.json(evaluatedPreventivas);
  } catch (error: any) {
    log('ERROR', 'PREVENTIVAS', 'Erro ao obter preventivas', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao obter preventivas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'criar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = preventivaSchema.parse(await request.json());

    // Validar se veículo pertence à empresa autenticada
    const veiculo = await prisma.veiculo.findFirst({
      where: { 
        id: body.veiculo_id,
        empresa_id: user.empresa_id
      },
      include: {
        Cliente: true
      }
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado nesta empresa' }, { status: 404 });
    }

    const kmAtual = veiculo.quilometragem || 0;
    const horimetroAtual = veiculo.horimetro_atual || 0;

    // Calcular limites previstos se não informados explicitamente, utilizando os intervalos
    let proximaData: Date | null = null;
    if (body.proxima_data) {
      proximaData = new Date(body.proxima_data);
    } else if (body.data_limite) {
      proximaData = new Date(body.data_limite);
    } else if (body.intervalo_dias) {
      const baseDate = body.ultima_data ? new Date(body.ultima_data) : new Date();
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
      antecedencia_horas: body.antecedencia_horas
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
        tipo_controle: body.tipo_controle || 'KM',
        intervalo_dias: body.intervalo_dias ?? null,
        intervalo_km: body.intervalo_km ?? null,
        intervalo_horas: body.intervalo_horas ?? null,
        ultima_data: body.ultima_data ? new Date(body.ultima_data) : null,
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
        // Campos retrocompatíveis mantidos sincronizados
        km_limite: proximoKm,
        km_atual: kmAtual,
        horimetro_atual: horimetroAtual,
        data_limite: proximaData,
        status: avaliacao.status,
        updated_at: new Date()
      },
      include: {
        Veiculo: {
          include: {
            Cliente: true
          }
        }
      }
    });

    await createAuditLog({
      modulo: 'PREVENTIVAS',
      acao: 'CRIAR',
      entidade: 'Preventiva',
      entidade_id: novaPreventiva.id,
      usuario: user?.name || user?.email || 'Sistema',
      dados_depois: novaPreventiva
    });

    log('INFO', 'PREVENTIVAS', 'Plano de manutenção preventiva criado', { id: novaPreventiva.id }, user?.name);

    return NextResponse.json(novaPreventiva, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao criar preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao criar preventiva' }, { status: 500 });
  }
}
