const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'Pinheirodiesel2026@Seguro#ERP';
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('======================================================================');
  console.log('BATERIA DE AUDITORIA FINAL MULTI-TENANT: EMPRESA A × EMPRESA B');
  console.log('======================================================================\n');

  const TENANT_A = 'test_audit_tenant_a';
  const TENANT_B = 'test_audit_tenant_b';
  const USER_A_ID = 'test_usr_audit_a';
  const USER_B_ID = 'test_usr_audit_b';

  const tokenA = jwt.sign(
    { id: USER_A_ID, email: 'admin@audita.com', name: 'Admin Auditoria A', role: 'ADMIN', empresa_id: TENANT_A },
    JWT_SECRET
  );
  const tokenB = jwt.sign(
    { id: USER_B_ID, email: 'admin@auditb.com', name: 'Admin Auditoria B', role: 'ADMIN', empresa_id: TENANT_B },
    JWT_SECRET
  );

  async function api(path, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: `auth-token=${token}` }
    });
    const text = await res.text();
    try {
      return { status: res.status, data: JSON.parse(text) };
    } catch {
      return { status: res.status, data: text };
    }
  }

  const results = [];
  function assert(category, testName, condition, detail) {
    const status = condition ? 'PASSOU' : 'FALHOU';
    results.push({ category, testName, status, detail });
    console.log(`[${status}] [${category}] ${testName}: ${detail}`);
  }

  try {
    // 1. Limpeza prévia
    await prisma.notificacao.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.eventoAgenda.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.preventiva.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.movimentacaoFinanceira.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.pecaAplicada.deleteMany({ where: { OrdemServico: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.servicoOS.deleteMany({ where: { OrdemServico: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.ordemServico.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.orcamentoPeca.deleteMany({ where: { Orcamento: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.orcamentoServico.deleteMany({ where: { Orcamento: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.orcamento.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.peca.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.veiculo.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.cliente.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A_ID, USER_B_ID] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });

    // 2. Criação das Empresas e Usuários
    await prisma.empresa.createMany({
      data: [
        { id: TENANT_A, nome: 'Empresa Teste Alfa', cnpj: '99.111.111/0001-99', updated_at: new Date() },
        { id: TENANT_B, nome: 'Empresa Teste Beta', cnpj: '99.222.222/0001-99', updated_at: new Date() }
      ]
    });

    await prisma.user.createMany({
      data: [
        { id: USER_A_ID, name: 'Admin Alfa', email: 'admin@audita.com', password_hash: 'hash', role: 'ADMIN', empresa_id: TENANT_A, updated_at: new Date() },
        { id: USER_B_ID, name: 'Admin Beta', email: 'admin@auditb.com', password_hash: 'hash', role: 'ADMIN', empresa_id: TENANT_B, updated_at: new Date() }
      ]
    });

    // 3. Cadastrar dados COMPLETOS na Empresa A
    const cliA = await prisma.cliente.create({
      data: {
        id: 'cli_audit_a',
        nome: 'Transportes Rodoviários Alfa',
        cpf_cnpj: '66.777.888/0001-99',
        telefone: '(11) 98888-1111',
        tipo: 'PJ',
        tipo_pessoa: 'JURIDICA',
        empresa_id: TENANT_A,
        updated_at: new Date()
      }
    });

    const veiA = await prisma.veiculo.create({
      data: {
        id: 'vei_audit_a',
        placa: 'ALF-9A99',
        modelo: 'Volvo FH 540 6x4',
        marca: 'Volvo',
        ano: 2023,
        tipo: 'CAMINHAO_PESADO',
        quilometragem: 95000,
        cliente_id: cliA.id,
        empresa_id: TENANT_A,
        updated_at: new Date()
      }
    });

    const pecaA = await prisma.peca.create({
      data: {
        id: 'peca_audit_a',
        codigo: 'FILTRO-DIESEL-ALFA',
        descricao: 'Filtro de Combustível Principal FH',
        categoria: 'FILTROS',
        quantidade: 15,
        estoque_minimo: 5,
        preco_custo: 120.00,
        preco_venda: 240.00,
        empresa_id: TENANT_A,
        updated_at: new Date()
      }
    });

    const osA = await prisma.ordemServico.create({
      data: {
        id: 'os_audit_a',
        numero: 7001,
        empresa_id: TENANT_A,
        cliente_id: cliA.id,
        veiculo_id: veiA.id,
        tipoOS: 'OFICINA',
        status: 'EM_EXECUCAO',
        diagnostico: 'Manutenção do sistema de alimentação diesel',
        valor_servicos: 600.00,
        valor_pecas: 240.00,
        valor_total: 840.00,
        created_by: 'Admin Alfa',
        data_entrada: new Date(),
        updated_at: new Date()
      }
    });

    const orcA = await prisma.orcamento.create({
      data: {
        id: 'orc_audit_a',
        numero: 'ORC-2026-7001',
        empresa_id: TENANT_A,
        cliente_id: cliA.id,
        veiculo_id: veiA.id,
        status: 'RASCUNHO',
        valor_servicos: 300,
        valor_pecas: 100,
        valor_total: 400,
        updated_at: new Date()
      }
    });

    const finA = await prisma.movimentacaoFinanceira.create({
      data: {
        id: 'fin_audit_a',
        empresa_id: TENANT_A,
        cliente_id: cliA.id,
        tipo: 'ENTRADA',
        categoria: 'SERVICOS',
        descricao: 'Adiantamento Serviços FH 540',
        valor: 500.00,
        status: 'PAGO',
        forma_pagamento: 'PIX',
        created_by: 'Admin Alfa',
        data: new Date(),
        updated_at: new Date()
      }
    });

    const prevA = await prisma.preventiva.create({
      data: {
        id: 'prev_audit_a',
        empresa_id: TENANT_A,
        veiculo_id: veiA.id,
        componente: 'FREIOS',
        descricao: 'Revisão das sapatas e lonas',
        km_limite: 110000,
        km_atual: 95000,
        status: 'SAUDAVEL',
        updated_at: new Date()
      }
    });

    const agA = await prisma.eventoAgenda.create({
      data: {
        id: 'ag_audit_a',
        empresa_id: TENANT_A,
        titulo: 'Revisão Técnica FH Alfa',
        data_inicio: new Date(),
        data_fim: new Date(Date.now() + 3600000),
        tipo: 'MANUTENCAO_PREVENTIVA',
        usuario_id: USER_A_ID,
        cliente_id: cliA.id,
        veiculo_id: veiA.id,
        updated_at: new Date()
      }
    });

    const notifA = await prisma.notificacao.create({
      data: {
        id: 'notif_audit_a',
        empresa_id: TENANT_A,
        usuario_id: USER_A_ID,
        titulo: 'Alerta Exclusivo Alfa',
        mensagem: 'Notificação confidencial da Empresa A',
        lida: false
      }
    });

    console.log('✅ Setup Empresa A concluído (1 cliente, 1 veículo, 1 OS, 1 peça, 1 orçamento, 1 financeiro, 1 preventiva, 1 agenda, 1 notificação).\n');
    console.log('✅ Empresa B possui ZERO registros.\n');

    // ======================================================================
    // 4. TESTES COMO EMPRESA B (DEVE RETORNAR ABSOLUTAMENTE ZERO DADOS DE A)
    // ======================================================================
    console.log('--- TESTANDO COMO EMPRESA B (DEVE MOSTRAR ZERO) ---');

    // 4.1 Notificações da Empresa B
    const resNotifB = await api('/api/notificacoes', tokenB);
    assert('NOTIFICAÇÕES', 'Lista de Notificações Empresa B', resNotifB.data.items?.length === 0, `Itens retornados: ${resNotifB.data.items?.length}`);
    assert('NOTIFICAÇÕES', 'Contador de Notificações Não Lidas Empresa B', resNotifB.data.naoLidas === 0, `Não lidas: ${resNotifB.data.naoLidas}`);
    assert('NOTIFICAÇÕES', 'Total de Notificações Empresa B', resNotifB.data.total === 0, `Total: ${resNotifB.data.total}`);

    // 4.2 Controle de Frota (Cards)
    const resFrotaStatsB = await api('/api/veiculos/stats', tokenB);
    assert('CONTROLE DE FROTA', 'Total de Veículos na Empresa B', resFrotaStatsB.data.total === 0, `Total: ${resFrotaStatsB.data.total}`);
    assert('CONTROLE DE FROTA', 'Veículos Ativos na Empresa B', resFrotaStatsB.data.ativo === 0, `Ativos: ${resFrotaStatsB.data.ativo}`);
    assert('CONTROLE DE FROTA', 'Manutenções Hoje na Empresa B', resFrotaStatsB.data.maintToday === 0, `MaintToday: ${resFrotaStatsB.data.maintToday}`);
    assert('CONTROLE DE FROTA', 'Em Manutenção na Empresa B', resFrotaStatsB.data.inMaint === 0, `InMaint: ${resFrotaStatsB.data.inMaint}`);

    // 4.3 Clientes
    const resCliB = await api('/api/clientes', tokenB);
    const cliItemsB = resCliB.data.items || resCliB.data;
    assert('CLIENTES', 'Listagem de Clientes Empresa B', Array.isArray(cliItemsB) && cliItemsB.length === 0, `Itens: ${cliItemsB.length}`);

    // 4.4 Veículos
    const resVeiB = await api('/api/veiculos', tokenB);
    const veiItemsB = resVeiB.data.items || resVeiB.data;
    assert('VEÍCULOS', 'Listagem de Veículos Empresa B', Array.isArray(veiItemsB) && veiItemsB.length === 0, `Itens: ${veiItemsB.length}`);

    // 4.5 Ordens de Serviço
    const resOSB = await api('/api/ordens', tokenB);
    const osItemsB = resOSB.data.items || resOSB.data;
    assert('ORDENS', 'Listagem de OS Empresa B', Array.isArray(osItemsB) && osItemsB.length === 0, `Itens: ${osItemsB.length}`);

    const resOSStatsB = await api('/api/ordens/stats', tokenB);
    assert('ORDENS', 'Total de OS nos Stats Empresa B', resOSStatsB.data.total === 0, `Total OS: ${resOSStatsB.data.total}`);
    assert('ORDENS', 'Faturamento do Mês nos Stats Empresa B', resOSStatsB.data.faturamentoMes === 0, `Faturamento: ${resOSStatsB.data.faturamentoMes}`);

    // 4.6 Orçamentos
    const resOrcB = await api('/api/orcamentos', tokenB);
    const orcItemsB = resOrcB.data.items || resOrcB.data;
    assert('ORÇAMENTOS', 'Listagem de Orçamentos Empresa B', Array.isArray(orcItemsB) && orcItemsB.length === 0, `Itens: ${orcItemsB.length}`);

    // 4.7 Financeiro
    const resFinB = await api('/api/financeiro', tokenB);
    const finItemsB = resFinB.data.items || resFinB.data;
    assert('FINANCEIRO', 'Listagem Financeira Empresa B', Array.isArray(finItemsB) && finItemsB.length === 0, `Itens: ${finItemsB.length}`);

    const resFinResumoB = await api('/api/financeiro/resumo', tokenB);
    assert('FINANCEIRO', 'Resumo Financeiro Empresa B', resFinResumoB.data.saldo === 0, `Saldo: ${resFinResumoB.data.saldo}`);

    // 4.8 Estoque
    const resEstB = await api('/api/pecas', tokenB);
    const estItemsB = resEstB.data.items || resEstB.data;
    assert('ESTOQUE', 'Listagem de Peças Empresa B', Array.isArray(estItemsB) && estItemsB.length === 0, `Itens: ${estItemsB.length}`);

    // 4.9 Preventivas
    const resPrevB = await api('/api/preventivas', tokenB);
    assert('PREVENTIVAS', 'Listagem de Preventivas Empresa B', Array.isArray(resPrevB.data) && resPrevB.data.length === 0, `Itens: ${resPrevB.data.length}`);

    // 4.10 Agenda
    const resAgB = await api('/api/agenda', tokenB);
    assert('AGENDA', 'Listagem da Agenda Empresa B', Array.isArray(resAgB.data) && resAgB.data.length === 0, `Itens: ${resAgB.data.length}`);

    // 4.11 Dashboard Agregações
    const resDashStatsB = await api('/api/dashboard/stats', tokenB);
    assert('DASHBOARD', 'Stats Gerais Empresa B', resDashStatsB.data.osEmAberto === 0 && resDashStatsB.data.clientesAtivos === 0, `OS: ${resDashStatsB.data.osEmAberto}, Clientes: ${resDashStatsB.data.clientesAtivos}`);

    const resDashAtivB = await api('/api/dashboard/atividades', tokenB);
    assert('DASHBOARD', 'Atividades Recentes Empresa B', resDashAtivB.data.recentOS?.length === 0 && resDashAtivB.data.recentFinances?.length === 0, `OS: ${resDashAtivB.data.recentOS?.length}, Fin: ${resDashAtivB.data.recentFinances?.length}`);

    const resDashResumoB = await api('/api/dashboard/resumo-financeiro', tokenB);
    assert('DASHBOARD', 'Resumo Financeiro Dashboard Empresa B', resDashResumoB.data.receitas === 0 && resDashResumoB.data.saldo === 0, `Receitas: ${resDashResumoB.data.receitas}`);

    const resDashAReceberB = await api('/api/dashboard/a-receber', tokenB);
    assert('DASHBOARD', 'Contas a Receber Dashboard Empresa B', Array.isArray(resDashAReceberB.data) && resDashAReceberB.data.length === 0, `Itens: ${resDashAReceberB.data.length}`);

    const resDashOSEmAndB = await api('/api/dashboard/os-em-andamento', tokenB);
    assert('DASHBOARD', 'OS em Andamento Dashboard Empresa B', Array.isArray(resDashOSEmAndB.data) && resDashOSEmAndB.data.length === 0, `Itens: ${resDashOSEmAndB.data.length}`);

    const resDashTopServB = await api('/api/dashboard/servicos-mais-realizados', tokenB);
    assert('DASHBOARD', 'Top Serviços Dashboard Empresa B', Array.isArray(resDashTopServB.data) && resDashTopServB.data.length === 0, `Itens: ${resDashTopServB.data.length}`);

    // ======================================================================
    // 5. TESTES COMO EMPRESA A (SEUS PRÓPRIOS DADOS DEVEM APARECER NORMALMENTE)
    // ======================================================================
    console.log('\n--- TESTANDO COMO EMPRESA A (SEUS DADOS DEVEM APARECER) ---');

    const resNotifA = await api('/api/notificacoes', tokenA);
    assert('EMPRESA A', 'Notificações da Empresa A', resNotifA.data.items?.length === 1 && resNotifA.data.items[0].titulo === 'Alerta Exclusivo Alfa', `Notificações: ${resNotifA.data.items?.length}`);

    const resFrotaStatsA = await api('/api/veiculos/stats', tokenA);
    assert('EMPRESA A', 'Controle de Frota da Empresa A', resFrotaStatsA.data.total === 1 && resFrotaStatsA.data.ativo === 1, `Total=${resFrotaStatsA.data.total}, Ativos=${resFrotaStatsA.data.ativo}`);

    const resCliA = await api('/api/clientes', tokenA);
    const cliItemsA = resCliA.data.items || resCliA.data;
    assert('EMPRESA A', 'Clientes da Empresa A', cliItemsA.length >= 1 && cliItemsA[0].nome === 'Transportes Rodoviários Alfa', `Clientes: ${cliItemsA.length}`);

    const resVeiA = await api('/api/veiculos', tokenA);
    const veiItemsA = resVeiA.data.items || resVeiA.data;
    assert('EMPRESA A', 'Veículos da Empresa A', veiItemsA.length >= 1 && veiItemsA[0].placa === 'ALF-9A99', `Veículos: ${veiItemsA.length}`);

    const resOSA = await api('/api/ordens', tokenA);
    const osItemsA = resOSA.data.items || resOSA.data;
    assert('EMPRESA A', 'OS da Empresa A', osItemsA.length >= 1 && osItemsA[0].numero === 7001, `OS: ${osItemsA.length}`);

    const resFinA = await api('/api/financeiro', tokenA);
    const finItemsA = resFinA.data.items || resFinA.data;
    assert('EMPRESA A', 'Financeiro da Empresa A', finItemsA.length >= 1 && Number(finItemsA[0].valor) === 500, `Movimentações: ${finItemsA.length}`);

    const resPrevA = await api('/api/preventivas', tokenA);
    assert('EMPRESA A', 'Preventivas da Empresa A', resPrevA.data.length >= 1 && resPrevA.data[0].componente === 'FREIOS', `Preventivas: ${resPrevA.data.length}`);

    const resAgA = await api('/api/agenda', tokenA);
    assert('EMPRESA A', 'Agenda da Empresa A', resAgA.data.length >= 1 && resAgA.data[0].titulo === 'Revisão Técnica FH Alfa', `Eventos: ${resAgA.data.length}`);

    const resDashStatsA = await api('/api/dashboard/stats', tokenA);
    assert('EMPRESA A', 'Dashboard Stats da Empresa A', resDashStatsA.data.osEmAberto === 1 && resDashStatsA.data.clientesAtivos === 1, `OS abertas: ${resDashStatsA.data.osEmAberto}, Clientes: ${resDashStatsA.data.clientesAtivos}`);

    const failed = results.filter(r => r.status === 'FALHOU');
    console.log(`\n======================================================================`);
    console.log(`TOTAL DE ASSERÇÕES: ${results.length} | SUCESSOS: ${results.length - failed.length} | FALHAS: ${failed.length}`);
    console.log(`======================================================================`);

    if (failed.length > 0) {
      console.error('Falhas detectadas:', failed);
      process.exit(1);
    }

  } catch (err) {
    console.error('Erro na auditoria final:', err);
    process.exit(1);
  } finally {
    // Limpeza
    await prisma.notificacao.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.eventoAgenda.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.preventiva.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.movimentacaoFinanceira.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.pecaAplicada.deleteMany({ where: { OrdemServico: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.servicoOS.deleteMany({ where: { OrdemServico: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.ordemServico.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.orcamentoPeca.deleteMany({ where: { Orcamento: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.orcamentoServico.deleteMany({ where: { Orcamento: { empresa_id: { in: [TENANT_A, TENANT_B] } } } });
    await prisma.orcamento.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.peca.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.veiculo.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.cliente.deleteMany({ where: { empresa_id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A_ID, USER_B_ID] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.$disconnect();
  }
}

main();
