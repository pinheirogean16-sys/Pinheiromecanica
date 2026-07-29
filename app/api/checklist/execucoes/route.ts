import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    // Fetch executions, utilizing exact model casing for relations from the introspected schema
    const execucoes = await prisma.checklistExecucao.findMany({
      include: {
        Checklist: true,
        OrdemServico: {
          include: {
            Cliente: true,
            Veiculo: true,
          }
        },
        Veiculo: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(execucoes);
  } catch (error: any) {
    console.error("CHECKLIST EXECUCOES FULL ERROR", error);
    console.error("CHECKLIST EXECUCOES MESSAGE", error?.message);
    console.error("CHECKLIST EXECUCOES STACK", error?.stack);

    return NextResponse.json(
      { error: "Erro ao buscar execuções de checklist", name: error?.name, message: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { checklist_id, os_id, veiculo_id, executado_por, respostas, observacoes, empresa_id } = body;

    if (!checklist_id || !executado_por || !respostas) {
      return NextResponse.json(
        { error: "Campos 'checklist_id', 'executado_por' e 'respostas' são obrigatórios." },
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
        respostas: typeof respostas === "string" ? respostas : JSON.stringify(respostas),
        observacoes: observacoes || null,
        empresa_id: empresa_id || "default",
      },
      include: {
        Checklist: true,
        OrdemServico: true,
        Veiculo: true,
      }
    });

    return NextResponse.json(createdExecucao, { status: 201 });
  } catch (error: any) {
    console.error("[CHECKLIST EXECUCAO POST CREATE FULL ERROR]", error);
    console.error("[CHECKLIST EXECUCAO POST CREATE MESSAGE]", error?.message);

    return NextResponse.json(
      { error: "Erro ao registrar execução de checklist", name: error?.name, message: error?.message },
      { status: 500 }
    );
  }
}
