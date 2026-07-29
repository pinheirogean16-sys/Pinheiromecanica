import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const preventivaSchema = z.object({
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  componente: z.enum(['OLEO', 'FILTROS', 'REVISAO', 'FREIOS', 'DIFERENCIAL', 'CAIXA', 'SUSPENSAO', 'COMPRESSOR', 'TURBINA']),
  descricao: z.string().optional().nullable().default(''),
  km_limite: z.preprocess((val) => (val === '' ? null : Number(val)), z.number().int().optional().nullable()),
  data_limite: z.string().optional().nullable()
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const veiculoId = searchParams.get('veiculo_id');
    const statusParam = searchParams.get('status');

    const where: any = {
      empresa_id: user?.empresa_id || 'default'
    };

    if (veiculoId) {
      where.veiculo_id = veiculoId;
    }

    const preventivas = await prisma.preventiva.findMany({
      where,
      include: {
        veiculo: {
          include: {
            cliente: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const evaluatedPreventivas = [];

    // Avaliação dinâmica de status baseada na quilometragem e data atual
    const hoje = new Date();
    for (const p of preventivas) {
      const kmAtual = p.veiculo.quilometragem || 0;
      let calculatedStatus = p.status || 'SAUDAVEL';

      let isVencido = false;
      let isProximo = false;

      // 1. Verificação por KM
      if (p.km_limite) {
        if (kmAtual >= p.km_limite) {
          isVencido = true;
        } else if (p.km_limite - kmAtual <= 1500) {
          isProximo = true;
        }
      }

      // 2. Verificação por Data
      if (p.data_limite) {
        const limite = new Date(p.data_limite);
        const diffTime = limite.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          isVencido = true;
        } else if (diffDays <= 15) {
          isProximo = true;
        }
      }

      if (isVencido) {
        calculatedStatus = 'VENCIDO';
      } else if (isProximo) {
        calculatedStatus = 'PROXIMO';
      } else {
        calculatedStatus = 'SAUDAVEL';
      }

      // Se o status calculado diferir do banco, vamos atualizar silenciosamente
      if (calculatedStatus !== p.status) {
        await prisma.preventiva.update({
          where: { id: p.id },
          data: { status: calculatedStatus }
        });
        p.status = calculatedStatus;
      }

      // Aplicar filtro de status se vier do parâmetro
      if (!statusParam || calculatedStatus === statusParam) {
        evaluatedPreventivas.push({
          ...p,
          km_atual: kmAtual
        });
      }
    }

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

    const body = preventivaSchema.parse(await request.json());

    const veiculo = await prisma.veiculo.findUnique({
      where: { id: body.veiculo_id }
    });

    if (!veiculo) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    const kmAtual = veiculo.quilometragem || 0;
    const hoje = new Date();
    let calculatedStatus = 'SAUDAVEL';

    let isVencido = false;
    let isProximo = false;

    if (body.km_limite) {
      if (kmAtual >= body.km_limite) {
        isVencido = true;
      } else if (body.km_limite - kmAtual <= 1500) {
        isProximo = true;
      }
    }

    if (body.data_limite) {
      const limite = new Date(body.data_limite);
      const diffTime = limite.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        isVencido = true;
      } else if (diffDays <= 15) {
        isProximo = true;
      }
    }

    if (isVencido) {
      calculatedStatus = 'VENCIDO';
    } else if (isProximo) {
      calculatedStatus = 'PROXIMO';
    }

    const novaPreventiva = await prisma.preventiva.create({
      data: {
        empresa_id: user?.empresa_id || 'default',
        veiculo_id: body.veiculo_id,
        componente: body.componente,
        descricao: body.descricao || '',
        km_limite: body.km_limite,
        km_atual: kmAtual,
        data_limite: body.data_limite ? new Date(body.data_limite) : null,
        status: calculatedStatus
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

    return NextResponse.json(novaPreventiva);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    log('ERROR', 'PREVENTIVAS', 'Erro ao criar preventiva', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao criar preventiva' }, { status: 500 });
  }
}
