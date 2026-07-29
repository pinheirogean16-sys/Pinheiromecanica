import { PUT } from './app/api/ordens/[id]/route';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  const os = await prisma.ordemServico.findFirst({
    include: {
      ServicoOS: true,
      PecaAplicada: true
    }
  });

  if (!user || !os) {
    console.error("User or OS not found");
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      empresa_id: os.empresa_id || 'default'
    },
    jwtSecret,
    { expiresIn: '1d' }
  );

  // Mock Request object
  const bodyData = {
    tipoOS: os.tipoOS || 'OFICINA',
    cliente_id: os.cliente_id,
    veiculo_id: os.veiculo_id,
    mecanico_id: os.mecanico_id,
    diagnostico: os.diagnostico || 'Sem diagnóstico',
    status: os.status,
    desconto: Number(os.desconto) || 0,
    forma_pagamento: os.forma_pagamento || 'DINHEIRO',
    servicos: os.ServicoOS.map(s => ({
      descricao: s.descricao,
      horas: Number(s.horas),
      valor_hora: Number(s.valor_hora),
      valor_total: Number(s.valor_total)
    })),
    pecas: os.PecaAplicada.map(p => ({
      peca_id: p.peca_id,
      quantidade: Number(p.quantidade),
      unidade: p.unidade,
      valor_unit: Number(p.valor_unit),
      valor_total: Number(p.valor_total),
      origem: p.origem
    }))
  };

  const reqHeaders = new Headers({
    'Content-Type': 'application/json',
    'Cookie': `auth-token=${token}`
  });

  const request = new Request(`http://localhost:3000/api/ordens/${os.id}`, {
    method: 'PUT',
    headers: reqHeaders,
    body: JSON.stringify(bodyData)
  });

  const params = Promise.resolve({ id: os.id });

  console.log("=== EXECUTING PUT ROUTE DIRECTLY ===");
  try {
    const response = await PUT(request, { params });
    console.log("Response status:", response.status);
    const json = await response.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Exception thrown directly from PUT:", err);
  }
  
  await prisma.$disconnect();
}

run();
