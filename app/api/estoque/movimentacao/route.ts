import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { z } from 'zod';

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const movimentacaoSchema = z.object({
  peca_id: z.string().min(1, 'Peça é obrigatória'),
  tipo: z.enum(['ENTRADA', 'SAIDA'], {
    required_error: 'Tipo é obrigatório (ENTRADA ou SAIDA)',
  }),
  quantidade: z.coerce
    .number()
    .positive('Quantidade deve ser maior que zero'),
  motivo: z.string().optional().default('AJUSTE'),
  observacao: z.string().optional().nullable(),
  os_id: z.string().optional().nullable(),
});

// ============================================================
// GET — Listar movimentações
// ============================================================
export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para ver movimentações de estoque
    if (!checkPermission(user, 'estoque', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const where: any = { empresa_id: user.empresa_id };

    if (searchParams.get('peca_id')) where.peca_id = searchParams.get('peca_id');
    if (searchParams.get('tipo')) where.tipo = searchParams.get('tipo');
    if (searchParams.get('motivo')) where.motivo = searchParams.get('motivo');

    const dataRef = searchParams.get('data');
    if (dataRef) {
      const startDate = new Date(dataRef);
      const endDate = new Date(dataRef);
      endDate.setDate(endDate.getDate() + 1);

      where.created_at = {
        gte: startDate,
        lt: endDate,
      };
    }

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        Peca: { select: { descricao: true, codigo: true } },
        OrdemServico: { select: { numero: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const mapped = movimentacoes.map((m) => {
      const { Peca, OrdemServico, ...rest } = m;
      return {
        ...rest,
        peca: Peca,
        os: OrdemServico,
      };
    });

    return NextResponse.json(mapped);
  } catch (error: any) {
    return apiError(error, 'ESTOQUE', 'Erro ao listar movimentações');
  }
}

// ============================================================
// POST — Registrar movimentação de estoque
// ============================================================
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // C05: exige permissão para movimentar estoque
    if (!checkPermission(user, 'estoque', 'editar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = movimentacaoSchema.parse(await request.json());
    const { peca_id, tipo, quantidade, motivo, observacao, os_id } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Verifica se a peça existe e pertence à empresa
      const peca = await tx.peca.findFirst({
        where: { id: peca_id, empresa_id: user.empresa_id },
      });

      if (!peca) {
        throw new Error('Peça não encontrada nesta empresa');
      }

      // Se veio os_id, valida que a OS pertence à empresa (M09)
      if (os_id) {
        const osOk = await tx.ordemServico.findFirst({
          where: { id: os_id, empresa_id: user.empresa_id },
          select: { id: true },
        });
        if (!osOk) {
          throw new Error('OS vinculada não encontrada nesta empresa');
        }
      }

      // A05: operação atômica de estoque
      if (tipo === 'SAIDA') {
        // Decremento atômico com condição: só baixa se ainda tem saldo
        const updateResult = await tx.peca.updateMany({
          where: {
            id: peca_id,
            empresa_id: user.empresa_id,
            quantidade: { gte: quantidade },
          },
          data: { quantidade: { decrement: quantidade } },
        });

        if (updateResult.count === 0) {
          // Não conseguiu decrementar: ou a peça sumiu ou o saldo é insuficiente
          const atual = await tx.peca.findUnique({
            where: { id: peca_id },
            select: { quantidade: true, unidadeMedida: true, descricao: true },
          });
          const disp = atual?.quantidade ?? 0;
          const un = atual?.unidadeMedida || 'un';
          throw new Error(
            `Estoque insuficiente para ${atual?.descricao || 'a peça'}. Disponível: ${disp} ${un}, Solicitado: ${quantidade} ${un}`
          );
        }
      } else {
        // ENTRADA: incremento atômico
        await tx.peca.update({
          where: { id: peca_id },
          data: { quantidade: { increment: quantidade } },
        });
      }

      // Grava o histórico da movimentação
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          peca_id,
          tipo,
          quantidade,
          motivo: motivo || 'AJUSTE',
          observacao: observacao || null,
          os_id: os_id || null,
          usuario_id: user.id,
          empresa_id: user.empresa_id,
        },
      });

      return mov;
    });

    log(
      'INFO',
      'ESTOQUE',
      'Movimentação registrada',
      { peca_id, tipo, quantidade, motivo },
      user.name
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    // Erros de negócio: devolve 400 com a mensagem
    if (
      error?.message?.includes('Estoque insuficiente') ||
      error?.message?.includes('Peça não encontrada') ||
      error?.message?.includes('OS vinculada não encontrada')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return apiError(error, 'ESTOQUE', 'Erro ao registrar movimentação');
  }
}
