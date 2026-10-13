import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import * as crypto from "crypto";

// ============================================================
// GET — Listar execuções de checklist
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const execucoes = await prisma.checklistExecucao.findMany({
      where: {
        empresa_id: user.empresa_id,
      },
      include: {
        Checklist: true,
        OrdemServico: {
          include: {
            Cliente: true,
            Veiculo: true,
          },
        },
        Veiculo: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(execucoes);
  } catch (error: any) {
    return apiError(
      error,
      'CHECKLIST_EXECUCOES',
      'Erro ao buscar execuções de checklist'
    );
  }
}

// ============================================================
// POST — Criar execução de checklist
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const {
      checklist_id,
      os_id,
      veiculo_id,
      executado_por,
      respostas,
      observacoes,
    } = body;

    if (!checklist_id || !executado_por || !respostas) {
      return NextResponse.json(
        {
          error:
            "Campos 'checklist_id', 'executado_por' e 'respostas' são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    const createdExecucao = await prisma.checklistExecucao.create({
      data: {
        id,
        checklist_id,
        os_id: os_id || null,
        veiculo_id: veiculo_id || null,
        executado_por,
        respostas:
          typeof respostas === "string"
            ? respostas
            : JSON.stringify(respostas),
        observacoes: observacoes || null,
        empresa_id: user.empresa_id,
      },
      include: {
        Checklist: true,
        OrdemServico: true,
        Veiculo: true,
      },
    });

    return NextResponse.json(createdExecucao, { status: 201 });
  } catch (error: any) {
    return apiError(
      error,
      'CHECKLIST_EXECUCOES',
      'Erro ao registrar execução de checklist'
    );
  }
}
