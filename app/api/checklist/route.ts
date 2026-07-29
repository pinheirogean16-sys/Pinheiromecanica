import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const checklists = await prisma.checklist.findMany({
      include: {
        ChecklistItem: {
          orderBy: {
            ordem: "asc",
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(checklists);
  } catch (error: any) {
    console.error("[CHECKLIST GET ALL ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar checklists", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[CHECKLIST CREATE INPUT]", JSON.stringify(body, null, 2));

    const { nome, descricao, categoria, ativo, itens, empresa_id } = body;

    if (!nome) {
      return NextResponse.json(
        { error: "O campo 'nome' é obrigatório." },
        { status: 400 }
      );
    }

    const checklistId = crypto.randomUUID();

    // Map the array input 'itens' to relation 'ChecklistItem' in Prisma schema
    const checklistItemsData = Array.isArray(itens)
      ? itens.map((item: any, index: number) => ({
          id: item.id || crypto.randomUUID(),
          descricao: item.descricao || "",
          tipo: item.tipo || "TEXTO",
          obrigatorio: typeof item.obrigatorio === "boolean" ? item.obrigatorio : true,
          ordem: typeof item.ordem === "number" ? item.ordem : index,
        }))
      : [];

    const updated_at = new Date();
    
    console.error('CHECKLIST BODY', JSON.stringify(body, null, 2));
    console.error('CHECKLIST CATEGORIA', categoria);
    console.error('CHECKLIST UPDATED_AT', updated_at);

    const createdChecklist = await prisma.checklist.create({
      data: {
        id: checklistId,
        nome,
        descricao: descricao || null,
        categoria: categoria || null,
        ativo: typeof ativo === "boolean" ? ativo : true,
        empresa_id: empresa_id || "default",
        updated_at,
        ChecklistItem: {
          create: checklistItemsData,
        },
      },
      include: {
        ChecklistItem: true,
      },
    });

    return NextResponse.json(createdChecklist, { status: 201 });
  } catch (error: any) {
    console.error('CHECKLIST CREATE FULL ERROR', error);
    console.error('CHECKLIST CREATE MESSAGE', error?.message);
    console.error('CHECKLIST CREATE STACK', error?.stack);

    return NextResponse.json(
      {
        error: error?.message || 'Erro ao criar checklist'
      },
      { status: 500 }
    );
  }
}
