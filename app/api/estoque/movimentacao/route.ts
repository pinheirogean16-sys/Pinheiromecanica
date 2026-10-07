import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const where: any = { empresa_id: session.empresa_id };
  
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
      lt: endDate
    };
  }
  
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where,
    include: { 
      Peca: { select: { descricao: true, codigo: true } }, 
      OrdemServico: { select: { numero: true } } 
    },
    orderBy: { created_at: 'desc' },
    take: 50
  });
  
  const mapped = movimentacoes.map(m => {
    const { Peca, OrdemServico, ...rest } = m;
    return {
      ...rest,
      peca: Peca,
      os: OrdemServico
    };
  });
  
  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  
  const body = await request.json();
  const { peca_id, tipo, quantidade, motivo, observacao, os_id } = body;
  
  if (!peca_id || !tipo || quantidade === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios: peca_id, tipo, quantidade' }, { status: 400 });
  }

  const qtdNum = Number(quantidade);
  if (isNaN(qtdNum) || qtdNum <= 0) {
    return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
  }
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const peca = await tx.peca.findFirst({ 
        where: { id: peca_id, empresa_id: session.empresa_id } 
      });
      
      if (!peca) throw new Error('Peça não encontrada');
      
      const novaQtd = tipo === 'ENTRADA' ? peca.quantidade + qtdNum : peca.quantidade - qtdNum;
      
      if (tipo === 'SAIDA' && novaQtd < 0) {
        throw new Error('Estoque insuficiente');
      }
      
      await tx.peca.update({ 
        where: { id: peca_id }, 
        data: { quantidade: novaQtd } 
      });
      
      return await tx.movimentacaoEstoque.create({
        data: {
          id: crypto.randomUUID(),
          peca_id,
          tipo,
          quantidade: qtdNum,
          motivo: motivo || 'AJUSTE',
          observacao,
          os_id: os_id || null,
          usuario_id: session.id,
          empresa_id: session.empresa_id
        }
      });
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
