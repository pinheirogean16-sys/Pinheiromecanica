import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';
import { obterHistoricoExecucoesPreventiva } from '@/lib/preventivas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'preventivas', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { id } = await params;

    // Verifica se a preventiva pertence à empresa do usuário (isolamento multi-tenant)
    const preventiva = await prisma.preventiva.findFirst({
      where: {
        id,
        empresa_id: user.empresa_id,
      },
      include: {
        Veiculo: { include: { Cliente: true } },
      },
    });

    if (!preventiva) {
      return NextResponse.json({ error: 'Preventiva não encontrada' }, { status: 404 });
    }

    const resultadoHistorico = await obterHistoricoExecucoesPreventiva(id, user.empresa_id);

    if (resultadoHistorico.indisponivel) {
      // ✅ Não expõe a mensagem bruta do erro — apenas o motivo (machine-readable)
      const isMigrationPendente = resultadoHistorico.motivo === 'TABELA_INEXISTENTE';
      return NextResponse.json(
        {
          preventiva,
          historico: [],
          migration_pendente: isMigrationPendente,
          indisponivel: true,
          motivo: resultadoHistorico.motivo,
          // Mensagem amigável para o usuário — sem stack trace ou erro do banco
          aviso: isMigrationPendente
            ? 'O histórico de execuções ainda não está disponível. Aguardando a aplicação de uma migration no banco.'
            : 'O histórico de execuções está temporariamente indisponível. Tente novamente em instantes.',
        },
        { status: isMigrationPendente ? 200 : 503 }
      );
    }

    return NextResponse.json({
      preventiva,
      historico: resultadoHistorico.dados,
      indisponivel: false,
      migration_pendente: false,
    });
  } catch (error: any) {
    // ✅ Tratamento de erro padronizado
    return apiError(error, 'PREVENTIVAS_HISTORICO', 'Erro ao obter histórico de preventiva');
  }
}
