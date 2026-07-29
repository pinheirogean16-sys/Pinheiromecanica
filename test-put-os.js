import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function runTest() {
  console.log("=== DESCOBRINDO ERRO REAL DO PUT OS ===");

  const user = await prisma.user.findFirst();
  const os = await prisma.ordemServico.findFirst({
    include: {
      ServicoOS: true,
      PecaAplicada: true
    }
  });

  if (!user || !os) {
    console.error("Não há usuário ou Ordem de Serviço cadastrado para teste.");
    await prisma.$disconnect();
    return;
  }

  console.log(`OS ID: ${os.id}`);
  console.log(`Cliente ID: ${os.cliente_id}`);
  console.log(`Veículo ID: ${os.veiculo_id}`);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET não está definido!");
    await prisma.$disconnect();
    return;
  }

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

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `auth-token=${token}`
  };

  const domain = 'http://localhost:3000';

  console.log(`\nEnviando PUT para ${domain}/api/ordens/${os.id}...`);

  try {
    const res = await fetch(`${domain}/api/ordens/${os.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        tipoOS: os.tipoOS || 'OFICINA',
        cliente_id: os.cliente_id,
        veiculo_id: os.veiculo_id,
        mecanico_id: os.mecanico_id,
        diagnostico: os.diagnostico || 'Sem diagnóstico',
        status: os.status,
        desconto: os.desconto || 0,
        forma_pagamento: os.forma_pagamento || 'DINHEIRO',
        servicos: os.ServicoOS.map(s => ({
          descricao: s.descricao,
          horas: s.horas,
          valor_hora: s.valor_hora,
          valor_total: s.valor_total
        })),
        pecas: os.PecaAplicada.map(p => ({
          peca_id: p.peca_id,
          quantidade: p.quantidade,
          unidade: p.unidade,
          valor_unit: p.valor_unit,
          valor_total: p.valor_total,
          origem: p.origem
        }))
      })
    });

    console.log(`\nResultado da Chamada:`);
    console.log(`Status HTTP: ${res.status}`);
    console.log(`Headers:`);
    res.headers.forEach((val, key) => console.log(`  ${key}: ${val}`));
    const text = await res.text();
    console.log(`Resposta JSON:\n${text}`);
  } catch (err) {
    console.error("Erro ao efetuar requisição de teste:", err);
  }

  await prisma.$disconnect();
}

runTest();
