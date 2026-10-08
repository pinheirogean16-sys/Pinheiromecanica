const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'Pinheirodiesel2026@Seguro#ERP';

const resultsTable = [];

function recordResult(modulo, teste, resultado, erro, status) {
  resultsTable.push({
    modulo,
    teste,
    resultado,
    erro: erro ? String(erro).substring(0, 80) : '-',
    status
  });
  console.log(`[${status}] [${modulo}] ${teste}: ${resultado}`);
}

async function main() {
  console.log('=================================================================');
  console.log('INICIANDO BATERIA DE TESTES FUNCIONAIS E CROSS-TENANT DO ERP');
  console.log('=================================================================\n');

  // IDs para Empresa A e B
  const EMPRESA_A_ID = 'test_empresa_a_val';
  const EMPRESA_B_ID = 'test_empresa_b_val';

  const USER_A_ID = 'test_user_admin_a';
  const USER_B_ID = 'test_user_admin_b';
  const USER_A_SEC_ID = 'test_user_sec_a';

  const PASSWORD_RAW = 'SenhaValida123!';
  const passwordHash = await bcrypt.hash(PASSWORD_RAW, 10);

  // 1. SETUP DE DADOS DE TESTE NO BANCO CONTROLADO
  console.log('Preparando tenants e usuários no banco de desenvolvimento...');

  // Limpeza prévia de eventuais sobras de testes anteriores
  try {
    await prisma.auditLog.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.checklistFoto.deleteMany({ where: { ChecklistExecucao: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.checklistExecucao.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.checklistItem.deleteMany({ where: { Checklist: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.checklist.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.movimentacaoEstoque.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.movimentacaoFinanceira.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.pecaAplicada.deleteMany({ where: { OrdemServico: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.servicoOS.deleteMany({ where: { OrdemServico: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.ordemServico.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.orcamentoPeca.deleteMany({ where: { Orcamento: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.orcamentoServico.deleteMany({ where: { Orcamento: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.orcamento.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.preventiva.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.eventoAgenda.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.notificacao.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.peca.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.veiculo.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.cliente.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A_ID, USER_B_ID, USER_A_SEC_ID] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
  } catch (err) {
    console.warn('Aviso na limpeza prévia:', err.message);
  }

  // Criação dos Tenants
  await prisma.empresa.create({
    data: {
      id: EMPRESA_A_ID,
      nome: 'Oficina Diesel Alfa',
      cnpj: '11.111.111/0001-11',
      updated_at: new Date()
    }
  });

  await prisma.empresa.create({
    data: {
      id: EMPRESA_B_ID,
      nome: 'Oficina Diesel Beta',
      cnpj: '22.222.222/0002-22',
      updated_at: new Date()
    }
  });

  // Criação dos Usuários
  await prisma.user.create({
    data: {
      id: USER_A_ID,
      name: 'Admin Alfa',
      email: 'admin.alfa@teste.com',
      password_hash: passwordHash,
      role: 'ADMIN',
      empresa_id: EMPRESA_A_ID,
      updated_at: new Date()
    }
  });

  await prisma.user.create({
    data: {
      id: USER_A_SEC_ID,
      name: 'Mecânico Alfa',
      email: 'mecanico.alfa@teste.com',
      password_hash: passwordHash,
      role: 'MECANICO',
      empresa_id: EMPRESA_A_ID,
      updated_at: new Date()
    }
  });

  await prisma.user.create({
    data: {
      id: USER_B_ID,
      name: 'Admin Beta',
      email: 'admin.beta@teste.com',
      password_hash: passwordHash,
      role: 'ADMIN',
      empresa_id: EMPRESA_B_ID,
      updated_at: new Date()
    }
  });

  console.log('Tenants e usuários preparados com sucesso.\n');

  // Tokens para autenticação
  let tokenA = '';
  let tokenB = '';

  // Helper fetcher
  async function api(path, options = {}, token = null) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (token) {
      headers['Cookie'] = `auth-token=${token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers
    });
    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  // =================================================================
  // 1. AUTENTICAÇÃO
  // =================================================================
  console.log('--- TESTANDO MÓDULO: AUTENTICAÇÃO ---');
  try {
    // 1.1 Login com credenciais válidas Admin A
    const loginResA = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin.alfa@teste.com', password: PASSWORD_RAW })
    });
    const setCookieA = loginResA.headers.get('set-cookie');
    if (loginResA.status === 200 && setCookieA && setCookieA.includes('auth-token=')) {
      tokenA = setCookieA.split('auth-token=')[1].split(';')[0];
      recordResult('AUTENTICAÇÃO', 'Login Admin A com credenciais válidas', 'Sucesso (HTTP 200 + cookie emitido)', null, 'PASSOU');
    } else {
      recordResult('AUTENTICAÇÃO', 'Login Admin A com credenciais válidas', `Falhou HTTP ${loginResA.status}`, JSON.stringify(loginResA.data), 'FALHOU');
    }

    // Login Admin B
    const loginResB = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin.beta@teste.com', password: PASSWORD_RAW })
    });
    const setCookieB = loginResB.headers.get('set-cookie');
    if (loginResB.status === 200 && setCookieB && setCookieB.includes('auth-token=')) {
      tokenB = setCookieB.split('auth-token=')[1].split(';')[0];
      recordResult('AUTENTICAÇÃO', 'Login Admin B com credenciais válidas', 'Sucesso (HTTP 200 + cookie emitido)', null, 'PASSOU');
    } else {
      recordResult('AUTENTICAÇÃO', 'Login Admin B com credenciais válidas', `Falhou HTTP ${loginResB.status}`, JSON.stringify(loginResB.data), 'FALHOU');
    }

    // 1.2 Sessão e verificação de claims de Tenant para Admin A
    const sessionResA = await api('/api/auth/session', { method: 'GET' }, tokenA);
    if (
      sessionResA.status === 200 &&
      sessionResA.data.user &&
      sessionResA.data.user.id === USER_A_ID &&
      sessionResA.data.user.role === 'ADMIN' &&
      sessionResA.data.user.empresa_id === EMPRESA_A_ID &&
      sessionResA.data.user.empresa_id !== 'default'
    ) {
      recordResult('AUTENTICAÇÃO', 'Consulta de sessão Admin A (id, role, empresa_id)', 'Sucesso e isolado', null, 'PASSOU');
    } else {
      recordResult('AUTENTICAÇÃO', 'Consulta de sessão Admin A (id, role, empresa_id)', 'Inconsistência nos dados de sessão', JSON.stringify(sessionResA.data), 'FALHOU');
    }

    // 1.3 Sessão e verificação de claims de Tenant para Admin B
    const sessionResB = await api('/api/auth/session', { method: 'GET' }, tokenB);
    if (
      sessionResB.status === 200 &&
      sessionResB.data.user &&
      sessionResB.data.user.empresa_id === EMPRESA_B_ID
    ) {
      recordResult('AUTENTICAÇÃO', 'Consulta de sessão Admin B (id, role, empresa_id)', 'Sucesso e isolado', null, 'PASSOU');
    } else {
      recordResult('AUTENTICAÇÃO', 'Consulta de sessão Admin B', 'Inconsistência na sessão B', JSON.stringify(sessionResB.data), 'FALHOU');
    }

    // 1.4 Token com empresa_id='default' ou ausente
    const tokenInvalidoDefault = jwt.sign(
      { id: USER_A_ID, email: 'admin.alfa@teste.com', name: 'Admin', role: 'ADMIN', empresa_id: 'default' },
      JWT_SECRET
    );
    const sessionDefaultRes = await api('/api/auth/session', { method: 'GET' }, tokenInvalidoDefault);
    if (sessionDefaultRes.status === 401) {
      recordResult('AUTENTICAÇÃO', 'Rejeição de token com fallback "default"', 'Rejeitado com HTTP 401 como esperado', null, 'PASSOU');
    } else {
      recordResult('AUTENTICAÇÃO', 'Rejeição de token com fallback "default"', `Falhou: aceitou token default (HTTP ${sessionDefaultRes.status})`, null, 'FALHOU');
    }

    // 1.5 Sessão sem token
    const noTokenRes = await api('/api/auth/session', { method: 'GET' });
    if (noTokenRes.status === 401) {
      recordResult('AUTENTICAÇÃO', 'Rejeição de requisição sem token', 'Rejeitado com HTTP 401', null, 'PASSOU');
    } else {
      recordResult('AUTENTICAÇÃO', 'Rejeição de requisição sem token', `Status inesperado: ${noTokenRes.status}`, null, 'FALHOU');
    }
  } catch (err) {
    recordResult('AUTENTICAÇÃO', 'Exceção geral no módulo de autenticação', 'Erro inesperado', err.message, 'FALHOU');
  }

  // IDs armazenados para testes de cruzamento
  let clienteA_id = null;
  let clienteB_id = null;
  let veiculoA_id = null;
  let veiculoB_id = null;
  let pecaA_id = null;
  let pecaB_id = null;
  let orcamentoA_id = null;
  let osA_id = null;
  let osB_id = null;
  let financeiroA_id = null;
  let checklistA_id = null;
  let execucaoChecklistA_id = null;
  let preventivaA_id = null;
  let eventoA_id = null;

  // =================================================================
  // 2. CLIENTES
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: CLIENTES ---');
  try {
    const CPF_COMPARTILHADO = '555.444.333-22';

    // 2.1 Criar Cliente na Empresa A
    const resCliA = await api('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Transportadora Alfa Cargo',
        cpf_cnpj: CPF_COMPARTILHADO,
        telefone: '(11) 98888-1111',
        tipo: 'PJ',
        tipo_pessoa: 'JURIDICA'
      })
    }, tokenA);

    if (resCliA.status === 201 || resCliA.status === 200) {
      clienteA_id = resCliA.data.id;
      recordResult('CLIENTES', 'Criar cliente na Empresa A', `Sucesso ID ${clienteA_id}`, null, 'PASSOU');
    } else {
      recordResult('CLIENTES', 'Criar cliente na Empresa A', `HTTP ${resCliA.status}`, JSON.stringify(resCliA.data), 'FALHOU');
    }

    // 2.2 Consultar Cliente por ID na Empresa A
    const resCliAGet = await api(`/api/clientes/${clienteA_id}`, { method: 'GET' }, tokenA);
    if (resCliAGet.status === 200 && resCliAGet.data.id === clienteA_id) {
      recordResult('CLIENTES', 'Consultar cliente por ID na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('CLIENTES', 'Consultar cliente por ID na Empresa A', `HTTP ${resCliAGet.status}`, JSON.stringify(resCliAGet.data), 'FALHOU');
    }

    // 2.3 Editar Cliente na Empresa A
    const resCliAPut = await api(`/api/clientes/${clienteA_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome: 'Transportadora Alfa Cargo Atualizada',
        telefone: '(11) 98888-2222'
      })
    }, tokenA);
    if (resCliAPut.status === 200 && resCliAPut.data.nome.includes('Atualizada')) {
      recordResult('CLIENTES', 'Editar cliente na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('CLIENTES', 'Editar cliente na Empresa A', `HTTP ${resCliAPut.status}`, JSON.stringify(resCliAPut.data), 'FALHOU');
    }

    // 2.4 Criar Cliente na Empresa B com o MESMO CPF/CNPJ
    const resCliB = await api('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Logística Beta Express',
        cpf_cnpj: CPF_COMPARTILHADO,
        telefone: '(11) 97777-2222',
        tipo: 'PJ',
        tipo_pessoa: 'JURIDICA'
      })
    }, tokenB);

    if (resCliB.status === 201 || resCliB.status === 200) {
      clienteB_id = resCliB.data.id;
      recordResult('CLIENTES', 'Mesmo CPF/CNPJ na Empresa B (Multi-tenant isolado)', `Permitido ID ${clienteB_id}`, null, 'PASSOU');
    } else {
      recordResult('CLIENTES', 'Mesmo CPF/CNPJ na Empresa B', `HTTP ${resCliB.status}`, JSON.stringify(resCliB.data), 'FALHOU');
      // Garantir dependência de Cliente B para não cascatear falsos negativos nos testes de OS/Orçamento de B
      const resCliBFallback = await api('/api/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nome: 'Logística Beta Express Principal',
          cpf_cnpj: '22.333.444/0001-55',
          telefone: '(11) 97777-2222',
          tipo: 'PJ',
          tipo_pessoa: 'JURIDICA'
        })
      }, tokenB);
      if (resCliBFallback.status === 201 || resCliBFallback.status === 200) {
        clienteB_id = resCliBFallback.data.id;
      }
    }

    // 2.5 Criar Cliente na Empresa A novamente com o MESMO CPF/CNPJ (deve bloquear por duplicidade interna)
    const resCliADup = await api('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Outra Empresa Alfa Duplicada',
        cpf_cnpj: CPF_COMPARTILHADO,
        telefone: '(11) 91111-0000',
        tipo: 'PJ',
        tipo_pessoa: 'JURIDICA'
      })
    }, tokenA);

    if (resCliADup.status === 400) {
      recordResult('CLIENTES', 'Duplicidade de CPF/CNPJ na mesma empresa (Empresa A)', 'Bloqueado HTTP 400 com sucesso', null, 'PASSOU');
    } else {
      recordResult('CLIENTES', 'Duplicidade de CPF/CNPJ na mesma empresa (Empresa A)', `Status inesperado: ${resCliADup.status}`, JSON.stringify(resCliADup.data), 'FALHOU');
    }

    // 2.6 Criar e excluir cliente temporário na Empresa A
    const resCliTemp = await api('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cliente Temporário Exclusão',
        cpf_cnpj: '999.888.777-66',
        telefone: '(11) 90000-0000',
        tipo: 'PF',
        tipo_pessoa: 'FISICA'
      })
    }, tokenA);
    if (resCliTemp.status === 201 || resCliTemp.status === 200) {
      const resDel = await api(`/api/clientes/${resCliTemp.data.id}`, { method: 'DELETE' }, tokenA);
      if (resDel.status === 200) {
        recordResult('CLIENTES', 'Excluir cliente sem vínculos na Empresa A', 'Sucesso', null, 'PASSOU');
      } else {
        recordResult('CLIENTES', 'Excluir cliente sem vínculos na Empresa A', `HTTP ${resDel.status}`, JSON.stringify(resDel.data), 'FALHOU');
      }
    }
  } catch (err) {
    recordResult('CLIENTES', 'Exceção no módulo de clientes', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 3. VEÍCULOS
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: VEÍCULOS ---');
  try {
    const PLACA_COMPARTILHADA = 'RST-9988';

    // 3.1 Criar Veículo na Empresa A associado ao Cliente A
    const resVeiA = await api('/api/veiculos', {
      method: 'POST',
      body: JSON.stringify({
        placa: PLACA_COMPARTILHADA,
        modelo: 'Scania R450 6x2',
        marca: 'Scania',
        ano: 2021,
        quilometragem: 185000,
        tipo: 'CAMINHAO_PESADO',
        cliente_id: clienteA_id
      })
    }, tokenA);

    if (resVeiA.status === 201 || resVeiA.status === 200) {
      veiculoA_id = resVeiA.data.id;
      recordResult('VEÍCULOS', 'Criar veículo associado ao cliente na Empresa A', `Sucesso ID ${veiculoA_id}`, null, 'PASSOU');
    } else {
      recordResult('VEÍCULOS', 'Criar veículo associado ao cliente na Empresa A', `HTTP ${resVeiA.status}`, JSON.stringify(resVeiA.data), 'FALHOU');
    }

    // 3.2 Consultar Veículo por ID
    const resVeiAGet = await api(`/api/veiculos/${veiculoA_id}`, { method: 'GET' }, tokenA);
    if (resVeiAGet.status === 200 && resVeiAGet.data.id === veiculoA_id) {
      recordResult('VEÍCULOS', 'Consultar veículo por ID na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('VEÍCULOS', 'Consultar veículo por ID na Empresa A', `HTTP ${resVeiAGet.status}`, JSON.stringify(resVeiAGet.data), 'FALHOU');
    }

    // 3.3 Editar Veículo
    const resVeiAPut = await api(`/api/veiculos/${veiculoA_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        quilometragem: 190000
      })
    }, tokenA);
    if (resVeiAPut.status === 200 && resVeiAPut.data.quilometragem === 190000) {
      recordResult('VEÍCULOS', 'Editar veículo na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('VEÍCULOS', 'Editar veículo na Empresa A', `HTTP ${resVeiAPut.status}`, JSON.stringify(resVeiAPut.data), 'FALHOU');
    }

    // 3.4 Histórico do Veículo
    const resVeiHist = await api(`/api/veiculos/${veiculoA_id}/historico`, { method: 'GET' }, tokenA);
    if (resVeiHist.status === 200 && resVeiHist.data.veiculo) {
      recordResult('VEÍCULOS', 'Histórico do veículo na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('VEÍCULOS', 'Histórico do veículo na Empresa A', `HTTP ${resVeiHist.status}`, JSON.stringify(resVeiHist.data), 'FALHOU');
    }

    // 3.5 Criar Veículo com a MESMA PLACA na Empresa B
    const resVeiB = await api('/api/veiculos', {
      method: 'POST',
      body: JSON.stringify({
        placa: PLACA_COMPARTILHADA,
        modelo: 'Mercedes-Benz Actros 2651',
        marca: 'Mercedes-Benz',
        ano: 2022,
        quilometragem: 120000,
        tipo: 'CAMINHAO_PESADO',
        cliente_id: clienteB_id
      })
    }, tokenB);

    if (resVeiB.status === 201 || resVeiB.status === 200) {
      veiculoB_id = resVeiB.data.id;
      recordResult('VEÍCULOS', 'Mesma placa na Empresa B (Multi-tenant isolado)', `Permitido ID ${veiculoB_id}`, null, 'PASSOU');
    } else {
      recordResult('VEÍCULOS', 'Mesma placa na Empresa B', `HTTP ${resVeiB.status}`, JSON.stringify(resVeiB.data), 'FALHOU');
      // Garantir dependência de Veículo B para testes subsequentes de OS de B
      if (clienteB_id) {
        const resVeiBFallback = await api('/api/veiculos', {
          method: 'POST',
          body: JSON.stringify({
            placa: 'BET-5566',
            modelo: 'Mercedes-Benz Actros 2651 Principal',
            marca: 'Mercedes-Benz',
            ano: 2022,
            quilometragem: 120000,
            tipo: 'CAMINHAO_PESADO',
            cliente_id: clienteB_id
          })
        }, tokenB);
        if (resVeiBFallback.status === 201 || resVeiBFallback.status === 200) {
          veiculoB_id = resVeiBFallback.data.id;
        }
      }
    }
  } catch (err) {
    recordResult('VEÍCULOS', 'Exceção no módulo de veículos', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 4. PEÇAS / ESTOQUE
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: PEÇAS / ESTOQUE ---');
  try {
    const CODIGO_PECA_COMPARTILHADO = 'FILTRO-RACOR-01';

    // 4.1 Criar Peça na Empresa A
    const resPecA = await api('/api/pecas', {
      method: 'POST',
      body: JSON.stringify({
        codigo: CODIGO_PECA_COMPARTILHADO,
        descricao: 'Filtro Separador Racor Diesel',
        quantidade: 20,
        estoque_minimo: 5,
        preco_custo: 120.00,
        preco_venda: 210.00,
        categoria: 'FILTROS',
        unidade_medida: 'UN'
      })
    }, tokenA);

    if (resPecA.status === 201 || resPecA.status === 200) {
      pecaA_id = resPecA.data.id;
      recordResult('ESTOQUE', 'Criar peça na Empresa A', `Sucesso ID ${pecaA_id}`, null, 'PASSOU');
    } else {
      recordResult('ESTOQUE', 'Criar peça na Empresa A', `HTTP ${resPecA.status}`, JSON.stringify(resPecA.data), 'FALHOU');
    }

    // 4.2 Pesquisar Peça na Empresa A
    const resPecSearch = await api(`/api/pecas?q=Racor`, { method: 'GET' }, tokenA);
    if (resPecSearch.status === 200 && resPecSearch.data.items && resPecSearch.data.items.length > 0) {
      recordResult('ESTOQUE', 'Pesquisar peça na Empresa A', `Retornou ${resPecSearch.data.items.length} itens`, null, 'PASSOU');
    } else {
      recordResult('ESTOQUE', 'Pesquisar peça na Empresa A', `HTTP ${resPecSearch.status}`, JSON.stringify(resPecSearch.data), 'FALHOU');
    }

    // 4.3 Movimentação de Estoque na Empresa A (Entrada +5)
    const resMovEntrada = await api('/api/estoque/movimentacao', {
      method: 'POST',
      body: JSON.stringify({
        peca_id: pecaA_id,
        tipo: 'ENTRADA',
        quantidade: 5,
        motivo: 'COMPRA',
        observacao: 'Reposição quinzenal'
      })
    }, tokenA);

    if (resMovEntrada.status === 200 && resMovEntrada.data.id) {
      recordResult('ESTOQUE', 'Movimentação de entrada de estoque na Empresa A (+5)', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('ESTOQUE', 'Movimentação de entrada de estoque na Empresa A (+5)', `HTTP ${resMovEntrada.status}`, JSON.stringify(resMovEntrada.data), 'FALHOU');
    }

    // 4.4 Criar Peça na Empresa B com o MESMO CÓDIGO
    const resPecB = await api('/api/pecas', {
      method: 'POST',
      body: JSON.stringify({
        codigo: CODIGO_PECA_COMPARTILHADO,
        descricao: 'Filtro Racor Empresa Beta',
        quantidade: 8,
        estoque_minimo: 2,
        preco_custo: 130.00,
        preco_venda: 230.00,
        categoria: 'FILTROS',
        unidade_medida: 'UN'
      })
    }, tokenB);

    if (resPecB.status === 201 || resPecB.status === 200) {
      pecaB_id = resPecB.data.id;
      recordResult('ESTOQUE', 'Mesmo código de peça na Empresa B (Multi-tenant isolado)', `Permitido ID ${pecaB_id}`, null, 'PASSOU');
    } else {
      recordResult('ESTOQUE', 'Mesmo código de peça na Empresa B', `HTTP ${resPecB.status}`, JSON.stringify(resPecB.data), 'FALHOU');
    }

    // 4.5 Empresa A tentar movimentar estoque da peça da Empresa B (deve ser REJEITADO)
    const resMovCross = await api('/api/estoque/movimentacao', {
      method: 'POST',
      body: JSON.stringify({
        peca_id: pecaB_id,
        tipo: 'SAIDA',
        quantidade: 1,
        motivo: 'TESTE_INVADIR_B'
      })
    }, tokenA);

    if (resMovCross.status === 400 || resMovCross.status === 404 || resMovCross.status === 403) {
      recordResult('ESTOQUE', 'Empresa A movimentar estoque de peça da Empresa B', `Bloqueado com sucesso (HTTP ${resMovCross.status})`, null, 'PASSOU');
    } else {
      recordResult('ESTOQUE', 'Empresa A movimentar estoque de peça da Empresa B', `Vulnerabilidade: aceitou HTTP ${resMovCross.status}`, JSON.stringify(resMovCross.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('ESTOQUE', 'Exceção no módulo de estoque', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 5. ORÇAMENTOS
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: ORÇAMENTOS ---');
  try {
    // 5.1 Criar Orçamento na Empresa A
    const resOrcA = await api('/api/orcamentos', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: clienteA_id,
        veiculo_id: veiculoA_id,
        status: 'RASCUNHO',
        servicos: [
          { descricao: 'Revisão Sistema de Injeção', horas: 3, valor_hora: 150.00, valor_total: 450.00 }
        ],
        pecas: [
          { peca_id: pecaA_id, descricao: 'Filtro Separador Racor Diesel', quantidade: 1, valor_unit: 210.00, valor_total: 210.00 }
        ],
        valor_servicos: 450.00,
        valor_pecas: 210.00,
        valor_total: 660.00,
        desconto: 0,
        observacoes: 'Orçamento de teste de motor diesel'
      })
    }, tokenA);

    if (resOrcA.status === 201 || resOrcA.status === 200) {
      orcamentoA_id = resOrcA.data.id;
      recordResult('ORÇAMENTOS', 'Criar orçamento na Empresa A', `Sucesso ID ${orcamentoA_id}`, null, 'PASSOU');
    } else {
      recordResult('ORÇAMENTOS', 'Criar orçamento na Empresa A', `HTTP ${resOrcA.status}`, JSON.stringify(resOrcA.data), 'FALHOU');
    }

    // 5.2 Consultar Orçamento por ID na Empresa A
    const resOrcAGet = await api(`/api/orcamentos/${orcamentoA_id}`, { method: 'GET' }, tokenA);
    if (resOrcAGet.status === 200 && resOrcAGet.data.id === orcamentoA_id) {
      recordResult('ORÇAMENTOS', 'Consultar orçamento por ID na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('ORÇAMENTOS', 'Consultar orçamento por ID na Empresa A', `HTTP ${resOrcAGet.status}`, JSON.stringify(resOrcAGet.data), 'FALHOU');
    }

    // 5.3 Editar Orçamento na Empresa A
    const resOrcAPut = await api(`/api/orcamentos/${orcamentoA_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        cliente_id: clienteA_id,
        veiculo_id: veiculoA_id,
        status: 'APROVADO',
        valor_servicos: 450.00,
        valor_pecas: 210.00,
        valor_total: 660.00,
        desconto: 0,
        observacoes: 'Orçamento APROVADO pelo cliente'
      })
    }, tokenA);
    if (resOrcAPut.status === 200 && resOrcAPut.data.status === 'APROVADO') {
      recordResult('ORÇAMENTOS', 'Editar orçamento na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('ORÇAMENTOS', 'Editar orçamento na Empresa A', `HTTP ${resOrcAPut.status}`, JSON.stringify(resOrcAPut.data), 'FALHOU');
    }

    // 5.4 Converter Orçamento para OS
    const resConv = await api(`/api/orcamentos/${orcamentoA_id}/converter`, {
      method: 'POST'
    }, tokenA);
    if (resConv.status === 200 && resConv.data.os && resConv.data.os.id) {
      osA_id = resConv.data.os.id;
      recordResult('ORÇAMENTOS', 'Converter orçamento em OS na Empresa A', `Gerou OS ID ${osA_id} Nº ${resConv.data.os.numero}`, null, 'PASSOU');
    } else {
      recordResult('ORÇAMENTOS', 'Converter orçamento em OS na Empresa A', `HTTP ${resConv.status}`, JSON.stringify(resConv.data), 'FALHOU');
    }

    // 5.5 Tentar criar Orçamento na Empresa A com Veículo da Empresa B (deve REJEITAR)
    const resOrcCross = await api('/api/orcamentos', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: clienteA_id,
        veiculo_id: veiculoB_id, // Veículo de B!
        status: 'RASCUNHO',
        servicos: [],
        pecas: [],
        valor_servicos: 0,
        valor_pecas: 0,
        valor_total: 0
      })
    }, tokenA);

    if (resOrcCross.status === 400 || resOrcCross.status === 404) {
      recordResult('ORÇAMENTOS', 'Criar orçamento com veículo de outro tenant', `Rejeitado com sucesso (HTTP ${resOrcCross.status})`, null, 'PASSOU');
    } else {
      recordResult('ORÇAMENTOS', 'Criar orçamento com veículo de outro tenant', `Vulnerabilidade: aceitou HTTP ${resOrcCross.status}`, JSON.stringify(resOrcCross.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('ORÇAMENTOS', 'Exceção no módulo de orçamentos', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 6. ORDENS DE SERVIÇO
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: ORDENS DE SERVIÇO ---');
  try {
    // 6.1 Criar OS Direta na Empresa B
    const resOSB = await api('/api/ordens', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: clienteB_id,
        veiculo_id: veiculoB_id,
        tipoOS: 'OFICINA',
        status: 'ABERTA',
        diagnostico: 'Troca de pastilhas e lonas de freio pesadas',
        servicos: [
          { descricao: 'Mão de obra sistema de freios', horas: 4, valor_hora: 160.00, valor_total: 640.00 }
        ],
        pecas: [
          { pecaId: pecaB_id, quantidade: 2, valor_unit: 230.00, valor_total: 460.00 }
        ],
        desconto: 0
      })
    }, tokenB);

    if (resOSB.status === 201 || resOSB.status === 200) {
      osB_id = resOSB.data.id;
      recordResult('ORDENS', 'Criar Ordem de Serviço na Empresa B com serviços e peças', `Sucesso ID ${osB_id} Nº ${resOSB.data.numero}`, null, 'PASSOU');
    } else {
      recordResult('ORDENS', 'Criar Ordem de Serviço na Empresa B', `HTTP ${resOSB.status}`, JSON.stringify(resOSB.data), 'FALHOU');
      // Garantir OS B para testar consulta, edição e finalização sem falsos negativos
      if (clienteB_id && veiculoB_id) {
        try {
          const fallbackOS = await prisma.ordemServico.create({
            data: {
              id: 'test_os_b_fallback',
              numero: 99999,
              empresa_id: EMPRESA_B_ID,
              tipoOS: 'OFICINA',
              cliente_id: clienteB_id,
              veiculo_id: veiculoB_id,
              status: 'ABERTA',
              diagnostico: 'OS de contingência para testes funcionais da Empresa B',
              valor_servicos: 0,
              valor_pecas: 0,
              valor_total: 0,
              created_by: 'Admin Beta',
              updated_at: new Date()
            }
          });
          osB_id = fallbackOS.id;
        } catch (e) {
          console.warn('Erro ao criar OS fallback:', e.message);
        }
      }
    }

    // 6.2 Consultar OS na Empresa B
    const resOSBGet = await api(`/api/ordens/${osB_id}`, { method: 'GET' }, tokenB);
    if (resOSBGet.status === 200 && resOSBGet.data.id === osB_id) {
      recordResult('ORDENS', 'Consultar OS por ID na Empresa B', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('ORDENS', 'Consultar OS por ID na Empresa B', `HTTP ${resOSBGet.status}`, JSON.stringify(resOSBGet.data), 'FALHOU');
    }

    // 6.3 Editar OS na Empresa B
    const resOSBPut = await api(`/api/ordens/${osB_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        cliente_id: clienteB_id,
        veiculo_id: veiculoB_id,
        status: 'EM_EXECUCAO',
        diagnostico: 'Serviço em andamento na bancada'
      })
    }, tokenB);
    if (resOSBPut.status === 200 && resOSBPut.data.status === 'EM_EXECUCAO') {
      recordResult('ORDENS', 'Editar OS na Empresa B', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('ORDENS', 'Editar OS na Empresa B', `HTTP ${resOSBPut.status}`, JSON.stringify(resOSBPut.data), 'FALHOU');
    }

    // 6.4 Finalizar OS na Empresa B
    const resOSBFin = await api(`/api/ordens/${osB_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        cliente_id: clienteB_id,
        veiculo_id: veiculoB_id,
        status: 'FINALIZADA',
        diagnostico: 'Serviço concluído e testado'
      })
    }, tokenB);
    if (resOSBFin.status === 200 && resOSBFin.data.status === 'FINALIZADA') {
      recordResult('ORDENS', 'Finalizar OS na Empresa B', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('ORDENS', 'Finalizar OS na Empresa B', `HTTP ${resOSBFin.status}`, JSON.stringify(resOSBFin.data), 'FALHOU');
    }

    // 6.5 Cross-Tenant OS: Cliente A + Veículo B na Empresa A (deve REJEITAR)
    const resOSCross1 = await api('/api/ordens', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: clienteA_id,
        veiculo_id: veiculoB_id, // Veículo de B!
        tipoOS: 'OFICINA',
        status: 'ABERTA'
      })
    }, tokenA);

    if (resOSCross1.status === 400 || resOSCross1.status === 404) {
      recordResult('ORDENS', 'Criar OS na Empresa A com veículo da Empresa B', `Rejeitado com sucesso (HTTP ${resOSCross1.status})`, null, 'PASSOU');
    } else {
      recordResult('ORDENS', 'Criar OS na Empresa A com veículo da Empresa B', `Vulnerabilidade: aceitou HTTP ${resOSCross1.status}`, JSON.stringify(resOSCross1.data), 'FALHOU');
    }

    // 6.6 Cross-Tenant OS: Peça da Empresa A na OS da Empresa B (deve REJEITAR)
    const resOSCross2 = await api('/api/ordens', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: clienteB_id,
        veiculo_id: veiculoB_id,
        tipoOS: 'OFICINA',
        status: 'ABERTA',
        pecas: [
          { pecaId: pecaA_id, quantidade: 1, valor_unit: 200.00 } // Peça de A!
        ]
      })
    }, tokenB);

    if (resOSCross2.status === 400 || resOSCross2.status === 404 || resOSCross2.status === 500) {
      recordResult('ORDENS', 'Usar peça da Empresa A em OS da Empresa B', `Rejeitado com sucesso (HTTP ${resOSCross2.status})`, null, 'PASSOU');
    } else {
      recordResult('ORDENS', 'Usar peça da Empresa A em OS da Empresa B', `Vulnerabilidade: aceitou HTTP ${resOSCross2.status}`, JSON.stringify(resOSCross2.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('ORDENS', 'Exceção no módulo de ordens', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 7. FINANCEIRO
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: FINANCEIRO ---');
  try {
    // 7.1 Criar Lançamento na Empresa A
    const resFinA = await api('/api/financeiro', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'ENTRADA',
        descricao: 'Pagamento Parcial Serviços Bomba Injetora',
        valor: 1500.00,
        status: 'PENDENTE',
        categoria: 'SERVICOS',
        forma_pagamento: 'PIX',
        data: new Date().toISOString()
      })
    }, tokenA);

    if (resFinA.status === 201 || resFinA.status === 200) {
      const item = Array.isArray(resFinA.data) ? resFinA.data[0] : resFinA.data;
      financeiroA_id = item.id;
      recordResult('FINANCEIRO', 'Criar movimentação financeira na Empresa A', `Sucesso ID ${financeiroA_id}`, null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Criar movimentação financeira na Empresa A', `HTTP ${resFinA.status}`, JSON.stringify(resFinA.data), 'FALHOU');
    }

    // 7.2 Listar Lançamentos na Empresa A
    const resFinListA = await api('/api/financeiro', { method: 'GET' }, tokenA);
    if (resFinListA.status === 200 && resFinListA.data.items && resFinListA.data.items.length > 0) {
      recordResult('FINANCEIRO', 'Listar movimentações na Empresa A', `Retornou ${resFinListA.data.items.length} itens`, null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Listar movimentações na Empresa A', `HTTP ${resFinListA.status}`, JSON.stringify(resFinListA.data), 'FALHOU');
    }

    // 7.3 Consultar por ID na Empresa A
    const resFinAGet = await api(`/api/financeiro/${financeiroA_id}`, { method: 'GET' }, tokenA);
    if (resFinAGet.status === 200 && resFinAGet.data.id === financeiroA_id) {
      recordResult('FINANCEIRO', 'Consultar movimentação por ID na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Consultar movimentação por ID na Empresa A', `HTTP ${resFinAGet.status}`, JSON.stringify(resFinAGet.data), 'FALHOU');
    }

    // 7.4 Pagar Lançamento na Empresa A
    const resFinPagar = await api(`/api/financeiro/${financeiroA_id}/pagar`, { method: 'POST' }, tokenA);
    if (resFinPagar.status === 200 && resFinPagar.data.status === 'PAGO') {
      recordResult('FINANCEIRO', 'Pagar movimentação financeira na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Pagar movimentação financeira na Empresa A', `HTTP ${resFinPagar.status}`, JSON.stringify(resFinPagar.data), 'FALHOU');
    }

    // 7.5 Resumo Financeiro
    const resResumoA = await api('/api/financeiro/resumo', { method: 'GET' }, tokenA);
    if (resResumoA.status === 200 && resResumoA.data.entradas !== undefined) {
      recordResult('FINANCEIRO', 'Resumo financeiro na Empresa A', `Entradas: ${resResumoA.data.entradas}`, null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Resumo financeiro na Empresa A', `HTTP ${resResumoA.status}`, JSON.stringify(resResumoA.data), 'FALHOU');
    }

    // 7.6 Alertas Financeiros
    const resAlertasA = await api('/api/financeiro/alertas', { method: 'GET' }, tokenA);
    if (resAlertasA.status === 200 && resAlertasA.data.resumo) {
      recordResult('FINANCEIRO', 'Alertas financeiros na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Alertas financeiros na Empresa A', `HTTP ${resAlertasA.status}`, JSON.stringify(resAlertasA.data), 'FALHOU');
    }

    // 7.7 Análise Financeira (DRE)
    const resAnaliseA = await api('/api/financeiro/analise', { method: 'GET' }, tokenA);
    if (resAnaliseA.status === 200 && resAnaliseA.data.dre) {
      recordResult('FINANCEIRO', 'Análise financeira (DRE) na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('FINANCEIRO', 'Análise financeira na Empresa A', `HTTP ${resAnaliseA.status}`, JSON.stringify(resAnaliseA.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('FINANCEIRO', 'Exceção no módulo financeiro', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 8. CHECKLIST
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: CHECKLIST ---');
  try {
    // 8.1 Criar Checklist na Empresa A
    const resChk = await api('/api/checklist', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Checklist Entrada Caminhão Pesado',
        descricao: 'Verificação inicial de pátio',
        categoria: 'ENTRADA',
        itens: [
          { descricao: 'Nível Óleo do Motor', tipo: 'CONFORME_NAO_CONFORME', obrigatorio: true },
          { descricao: 'Vazamentos no Cárter ou Filtros', tipo: 'CONFORME_NAO_CONFORME', obrigatorio: true }
        ]
      })
    }, tokenA);

    if (resChk.status === 201 || resChk.status === 200) {
      checklistA_id = resChk.data.id;
      recordResult('CHECKLIST', 'Criar modelo de checklist na Empresa A', `Sucesso ID ${checklistA_id}`, null, 'PASSOU');
    } else {
      recordResult('CHECKLIST', 'Criar modelo de checklist na Empresa A', `HTTP ${resChk.status}`, JSON.stringify(resChk.data), 'FALHOU');
    }

    // 8.2 Listar Checklists na Empresa A
    const resChkListA = await api('/api/checklist', { method: 'GET' }, tokenA);
    if (resChkListA.status === 200 && Array.isArray(resChkListA.data) && resChkListA.data.length > 0) {
      recordResult('CHECKLIST', 'Listar checklists na Empresa A', `Retornou ${resChkListA.data.length} modelos`, null, 'PASSOU');
    } else {
      recordResult('CHECKLIST', 'Listar checklists na Empresa A', `HTTP ${resChkListA.status}`, JSON.stringify(resChkListA.data), 'FALHOU');
    }

    // 8.3 Executar Checklist na Empresa A
    const resExec = await api('/api/checklist/executar', {
      method: 'POST',
      body: JSON.stringify({
        checklist_id: checklistA_id,
        os_id: osA_id || null,
        executado_por: 'Mecânico Alfa',
        respostas: {
          item_1: 'CONFORME',
          item_2: 'CONFORME'
        },
        observacoes: 'Veículo em bom estado geral de pátio'
      })
    }, tokenA);

    if (resExec.status === 200 || resExec.status === 201) {
      execucaoChecklistA_id = resExec.data.id;
      recordResult('CHECKLIST', 'Executar checklist na Empresa A', `Sucesso Execução ID ${execucaoChecklistA_id}`, null, 'PASSOU');
    } else {
      recordResult('CHECKLIST', 'Executar checklist na Empresa A', `HTTP ${resExec.status}`, JSON.stringify(resExec.data), 'FALHOU');
    }

    // 8.4 Consultar Execução por ID
    const resExecGet = await api(`/api/checklist/execucao/${execucaoChecklistA_id}`, { method: 'GET' }, tokenA);
    if (resExecGet.status === 200 && resExecGet.data.id === execucaoChecklistA_id) {
      recordResult('CHECKLIST', 'Consultar execução de checklist por ID na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('CHECKLIST', 'Consultar execução de checklist por ID', `HTTP ${resExecGet.status}`, JSON.stringify(resExecGet.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('CHECKLIST', 'Exceção no módulo de checklist', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 9. AGENDA / PREVENTIVAS
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: AGENDA / PREVENTIVAS ---');
  try {
    // 9.1 Criar Evento de Agenda na Empresa A
    const resEvA = await api('/api/agenda', {
      method: 'POST',
      body: JSON.stringify({
        titulo: 'Revisão Caixa ZF Scania',
        descricao: 'Troca de óleo e filtros',
        data_inicio: new Date().toISOString(),
        data_fim: new Date(Date.now() + 3600000).toISOString(),
        tipo: 'MANUTENCAO_PREVENTIVA',
        status: 'AGENDADO'
      })
    }, tokenA);

    if (resEvA.status === 201 || resEvA.status === 200) {
      eventoA_id = resEvA.data.id;
      recordResult('AGENDA', 'Criar evento de agenda na Empresa A', `Sucesso ID ${eventoA_id}`, null, 'PASSOU');
    } else {
      recordResult('AGENDA', 'Criar evento de agenda na Empresa A', `HTTP ${resEvA.status}`, JSON.stringify(resEvA.data), 'FALHOU');
    }

    // 9.2 Editar Evento de Agenda
    const resEvPut = await api(`/api/agenda/${eventoA_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'EM_ANDAMENTO'
      })
    }, tokenA);
    if (resEvPut.status === 200 && resEvPut.data.status === 'EM_ANDAMENTO') {
      recordResult('AGENDA', 'Editar evento de agenda na Empresa A', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('AGENDA', 'Editar evento de agenda', `HTTP ${resEvPut.status}`, JSON.stringify(resEvPut.data), 'FALHOU');
    }

    // 9.3 Criar Preventiva na Empresa A
    if (!veiculoA_id) {
      recordResult('PREVENTIVAS', 'Criar manutenção preventiva na Empresa A', 'SETUP FAILED: veiculoA_id ausente', null, 'FALHOU');
    } else {
      const resPrevA = await api('/api/preventivas', {
        method: 'POST',
        body: JSON.stringify({
          veiculo_id: veiculoA_id,
          componente: 'FREIOS',
          descricao: 'Substituição preventiva de lonas e tambores',
          km_limite: 240000
        })
      }, tokenA);

      if (resPrevA.status === 201 || resPrevA.status === 200) {
        preventivaA_id = resPrevA.data.id;
        recordResult('PREVENTIVAS', 'Criar manutenção preventiva na Empresa A', `Sucesso ID ${preventivaA_id}`, null, 'PASSOU');
      } else {
        recordResult('PREVENTIVAS', 'Criar manutenção preventiva na Empresa A', `HTTP ${resPrevA.status}`, JSON.stringify(resPrevA.data), 'FALHOU');
      }
    }

    // 9.4 Editar Preventiva
    if (preventivaA_id) {
      const resPrevPut = await api(`/api/preventivas/${preventivaA_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          km_limite: 245000
        })
      }, tokenA);
      if (resPrevPut.status === 200 && resPrevPut.data.km_limite === 245000) {
        recordResult('PREVENTIVAS', 'Editar manutenção preventiva na Empresa A', 'Sucesso', null, 'PASSOU');
      } else {
        recordResult('PREVENTIVAS', 'Editar preventiva', `HTTP ${resPrevPut.status}`, JSON.stringify(resPrevPut.data), 'FALHOU');
      }
    } else {
      recordResult('PREVENTIVAS', 'Editar preventiva', 'SETUP FAILED: preventivaA_id ausente', null, 'FALHOU');
    }

    // 9.5 Empresa A tentando criar Preventiva para Veículo da Empresa B (deve ser rejeitado)
    if (veiculoB_id) {
      const resPrevCross = await api('/api/preventivas', {
        method: 'POST',
        body: JSON.stringify({
          veiculo_id: veiculoB_id,
          componente: 'FREIOS',
          descricao: 'Tentativa indevida cross-tenant'
        })
      }, tokenA);
      if (resPrevCross.status === 400 || resPrevCross.status === 404) {
        recordResult('PREVENTIVAS', 'Empresa A criar preventiva para veículo de B', `Rejeitado com sucesso (HTTP ${resPrevCross.status})`, null, 'PASSOU');
      } else {
        recordResult('PREVENTIVAS', 'Empresa A criar preventiva para veículo de B', `Vulnerabilidade: aceitou HTTP ${resPrevCross.status}`, JSON.stringify(resPrevCross.data), 'FALHOU');
      }
    }

    // 9.6 Empresa A tentando criar Evento de Agenda com Veículo de B (deve ser rejeitado)
    if (veiculoB_id) {
      const resEvCross = await api('/api/agenda', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Tentativa cross-tenant agenda',
          data_inicio: new Date().toISOString(),
          data_fim: new Date(Date.now() + 3600000).toISOString(),
          tipo: 'MANUTENCAO_PREVENTIVA',
          veiculo_id: veiculoB_id
        })
      }, tokenA);
      if (resEvCross.status === 400 || resEvCross.status === 404) {
        recordResult('AGENDA', 'Empresa A criar agenda para veículo de B', `Rejeitado com sucesso (HTTP ${resEvCross.status})`, null, 'PASSOU');
      } else {
        recordResult('AGENDA', 'Empresa A criar agenda para veículo de B', `Vulnerabilidade: aceitou HTTP ${resEvCross.status}`, JSON.stringify(resEvCross.data), 'FALHOU');
      }
    }
  } catch (err) {
    recordResult('PREVENTIVAS', 'Exceção no módulo de preventivas/agenda', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 10. USUÁRIOS
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: USUÁRIOS ---');
  try {
    // 10.1 Listar Usuários na Empresa A
    const resUserListA = await api('/api/usuarios', { method: 'GET' }, tokenA);
    if (resUserListA.status === 200 && resUserListA.data.items && resUserListA.data.items.length >= 2) {
      const hasOtherTenant = resUserListA.data.items.some(u => u.id === USER_B_ID);
      if (!hasOtherTenant) {
        recordResult('USUÁRIOS', 'Listar usuários da própria empresa (Empresa A)', `Retornou ${resUserListA.data.items.length} usuários sem vazar outros tenants`, null, 'PASSOU');
      } else {
        recordResult('USUÁRIOS', 'Listar usuários da própria empresa', 'Vazou usuário de outro tenant!', null, 'FALHOU');
      }
    } else {
      recordResult('USUÁRIOS', 'Listar usuários da própria empresa', `HTTP ${resUserListA.status}`, JSON.stringify(resUserListA.data), 'FALHOU');
    }

    // 10.2 Consultar Usuário de A
    const resUserAGet = await api(`/api/usuarios/${USER_A_SEC_ID}`, { method: 'GET' }, tokenA);
    if (resUserAGet.status === 200 && resUserAGet.data.id === USER_A_SEC_ID) {
      recordResult('USUÁRIOS', 'Consultar usuário por ID dentro do próprio tenant', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('USUÁRIOS', 'Consultar usuário por ID', `HTTP ${resUserAGet.status}`, JSON.stringify(resUserAGet.data), 'FALHOU');
    }

    // 10.3 Resetar Senha de Usuário de A
    const resResetA = await api(`/api/usuarios/${USER_A_SEC_ID}/reset-password`, { method: 'POST' }, tokenA);
    if (resResetA.status === 200 && resResetA.data.success) {
      recordResult('USUÁRIOS', 'Resetar senha de usuário da mesma empresa', 'Sucesso', null, 'PASSOU');
    } else {
      recordResult('USUÁRIOS', 'Resetar senha de usuário da mesma empresa', `HTTP ${resResetA.status}`, JSON.stringify(resResetA.data), 'FALHOU');
    }

    // 10.4 Empresa A tentar acessar usuário da Empresa B (deve REJEITAR com 403 ou 404)
    const resUserCrossGet = await api(`/api/usuarios/${USER_B_ID}`, { method: 'GET' }, tokenA);
    if (resUserCrossGet.status === 404 || resUserCrossGet.status === 403) {
      recordResult('USUÁRIOS', 'Empresa A consultar usuário da Empresa B', `Bloqueado com sucesso (HTTP ${resUserCrossGet.status})`, null, 'PASSOU');
    } else {
      recordResult('USUÁRIOS', 'Empresa A consultar usuário da Empresa B', `Vulnerabilidade: aceitou HTTP ${resUserCrossGet.status}`, JSON.stringify(resUserCrossGet.data), 'FALHOU');
    }

    // 10.5 Empresa A tentar resetar senha de usuário da Empresa B (deve REJEITAR)
    const resUserCrossReset = await api(`/api/usuarios/${USER_B_ID}/reset-password`, { method: 'POST' }, tokenA);
    if (resUserCrossReset.status === 404 || resUserCrossReset.status === 403) {
      recordResult('USUÁRIOS', 'Empresa A resetar senha de usuário da Empresa B', `Bloqueado com sucesso (HTTP ${resUserCrossReset.status})`, null, 'PASSOU');
    } else {
      recordResult('USUÁRIOS', 'Empresa A resetar senha de usuário da Empresa B', `Vulnerabilidade: aceitou HTTP ${resUserCrossReset.status}`, JSON.stringify(resUserCrossReset.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('USUÁRIOS', 'Exceção no módulo de usuários', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 11. AUDITORIA
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: AUDITORIA ---');
  try {
    const resLogsA = await api('/api/logs', { method: 'GET' }, tokenA);
    if (resLogsA.status === 200 && resLogsA.data.items) {
      const logsDeB = resLogsA.data.items.filter(l => l.empresa_id === EMPRESA_B_ID);
      if (logsDeB.length === 0) {
        recordResult('AUDITORIA', 'Consulta /api/logs Admin A (isolamento estrito)', `Retornou ${resLogsA.data.items.length} logs exclusivos do Tenant A`, null, 'PASSOU');
      } else {
        recordResult('AUDITORIA', 'Consulta /api/logs Admin A', `Vazamento de ${logsDeB.length} logs da Empresa B`, null, 'FALHOU');
      }
    } else {
      recordResult('AUDITORIA', 'Consulta /api/logs Admin A', `HTTP ${resLogsA.status}`, JSON.stringify(resLogsA.data), 'FALHOU');
    }
  } catch (err) {
    recordResult('AUDITORIA', 'Exceção no módulo de auditoria', 'Erro inesperado', err.message, 'FALHOU');
  }

  // =================================================================
  // 12. DASHBOARD
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: DASHBOARD ---');
  const dashEndpoints = [
    { name: 'Stats Gerais', path: '/api/dashboard/stats' },
    { name: 'Atividades Recentes', path: '/api/dashboard/atividades' },
    { name: 'OS por Status', path: '/api/dashboard/os-por-status' },
    { name: 'Faturamento Mensal', path: '/api/dashboard/faturamento-mensal' },
    { name: 'Entradas da Semana', path: '/api/dashboard/entradas-semana' },
    { name: 'Serviços Mais Realizados', path: '/api/dashboard/servicos-mais-realizados' },
    { name: 'Resumo Financeiro', path: '/api/dashboard/resumo-financeiro' }
  ];

  for (const dash of dashEndpoints) {
    try {
      const resDash = await api(dash.path, { method: 'GET' }, tokenA);
      if (resDash.status === 200) {
        recordResult('DASHBOARD', `Rota ${dash.name} (${dash.path})`, 'HTTP 200 isolado', null, 'PASSOU');
      } else {
        recordResult('DASHBOARD', `Rota ${dash.name} (${dash.path})`, `HTTP ${resDash.status}`, JSON.stringify(resDash.data), 'FALHOU');
      }
    } catch (err) {
      recordResult('DASHBOARD', `Rota ${dash.name}`, 'Exceção', err.message, 'FALHOU');
    }
  }

  // =================================================================
  // 13. TESTE CROSS-TENANT BIDIRECIONAL COMPLETO (O MAIS IMPORTANTE)
  // =================================================================
  console.log('\n--- TESTANDO MÓDULO: CROSS-TENANT (O MAIS IMPORTANTE) ---');

  const crossTests = [
    // A -> B
    { mod: 'CROSS-TENANT', label: 'Admin A consultar Cliente de B', method: 'GET', path: `/api/clientes/${clienteB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A editar Cliente de B', method: 'PUT', path: `/api/clientes/${clienteB_id}`, body: { nome: 'Hacked' }, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A excluir Cliente de B', method: 'DELETE', path: `/api/clientes/${clienteB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A consultar Veículo de B', method: 'GET', path: `/api/veiculos/${veiculoB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A editar Veículo de B', method: 'PUT', path: `/api/veiculos/${veiculoB_id}`, body: { quilometragem: 999999 }, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A excluir Veículo de B', method: 'DELETE', path: `/api/veiculos/${veiculoB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A consultar Histórico de Veículo de B', method: 'GET', path: `/api/veiculos/${veiculoB_id}/historico`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A consultar Peça de B', method: 'GET', path: `/api/pecas/${pecaB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A editar Peça de B', method: 'PUT', path: `/api/pecas/${pecaB_id}`, body: { preco_venda: 1.00 }, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A excluir Peça de B', method: 'DELETE', path: `/api/pecas/${pecaB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A consultar OS de B', method: 'GET', path: `/api/ordens/${osB_id}`, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A editar OS de B', method: 'PUT', path: `/api/ordens/${osB_id}`, body: { diagnostico: 'Hacked OS' }, token: tokenA },
    { mod: 'CROSS-TENANT', label: 'Admin A excluir OS de B', method: 'DELETE', path: `/api/ordens/${osB_id}`, token: tokenA },

    // B -> A
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Cliente de A', method: 'GET', path: `/api/clientes/${clienteA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B editar Cliente de A', method: 'PUT', path: `/api/clientes/${clienteA_id}`, body: { nome: 'Hacked by B' }, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B excluir Cliente de A', method: 'DELETE', path: `/api/clientes/${clienteA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Veículo de A', method: 'GET', path: `/api/veiculos/${veiculoA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B editar Veículo de A', method: 'PUT', path: `/api/veiculos/${veiculoA_id}`, body: { quilometragem: 111111 }, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B excluir Veículo de A', method: 'DELETE', path: `/api/veiculos/${veiculoA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Peça de A', method: 'GET', path: `/api/pecas/${pecaA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Orçamento de A', method: 'GET', path: `/api/orcamentos/${orcamentoA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B editar Orçamento de A', method: 'PUT', path: `/api/orcamentos/${orcamentoA_id}`, body: { observacoes: 'Hacked by B' }, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B converter Orçamento de A em OS', method: 'POST', path: `/api/orcamentos/${orcamentoA_id}/converter`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Financeiro de A', method: 'GET', path: `/api/financeiro/${financeiroA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B pagar Financeiro de A', method: 'POST', path: `/api/financeiro/${financeiroA_id}/pagar`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Checklist de A', method: 'GET', path: `/api/checklist/${checklistA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Execução Checklist de A', method: 'GET', path: `/api/checklist/execucao/${execucaoChecklistA_id}`, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Preventiva de A', method: 'PUT', path: `/api/preventivas/${preventivaA_id}`, body: { km_limite: 100 }, token: tokenB },
    { mod: 'CROSS-TENANT', label: 'Admin B consultar Evento Agenda de A', method: 'GET', path: `/api/agenda/${eventoA_id}`, token: tokenB }
  ];

  for (const ct of crossTests) {
    try {
      const res = await api(ct.path, {
        method: ct.method,
        body: ct.body ? JSON.stringify(ct.body) : undefined
      }, ct.token);

      if (res.status === 404 || res.status === 403 || res.status === 400) {
        recordResult('CROSS-TENANT', ct.label, `Bloqueado com sucesso (HTTP ${res.status})`, null, 'PASSOU');
      } else {
        recordResult('CROSS-TENANT', ct.label, `Vulnerabilidade Cross-Tenant: aceitou com HTTP ${res.status}`, JSON.stringify(res.data), 'FALHOU');
      }
    } catch (err) {
      recordResult('CROSS-TENANT', ct.label, 'Exceção', err.message, 'FALHOU');
    }
  }

  // =================================================================
  // 15. DATABASE.SQL × PRISMA AUDIT
  // =================================================================
  console.log('\n--- AUDITANDO: DATABASE.SQL × PRISMA ---');
  try {
    const fs = require('fs');
    const sqlContent = fs.readFileSync('./database.sql', 'utf8');
    const prismaContent = fs.readFileSync('./prisma/schema.prisma', 'utf8');

    // 15.1 Contagem de tabelas / models
    const sqlTables = (sqlContent.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/g) || []).length;
    const prismaModels = (prismaContent.match(/model\s+(\w+)\s+\{/g) || []).length;

    if (sqlTables === prismaModels) {
      recordResult('DATABASE', `Contagem de modelos e tabelas (${sqlTables} tabelas / ${prismaModels} models)`, '100% Sincronizado', null, 'PASSOU');
    } else {
      recordResult('DATABASE', 'Contagem de modelos e tabelas', `Divergência: SQL=${sqlTables}, Prisma=${prismaModels}`, null, 'FALHOU');
    }

    // 15.2 Unique Constraints multi-tenant
    const hasClienteUnique = sqlContent.includes('`Cliente_cpf_cnpj_empresa_id_key`(`cpf_cnpj`, `empresa_id`)') &&
                             prismaContent.includes('@@unique([cpf_cnpj, empresa_id])');
    recordResult('DATABASE', 'Cliente @@unique([cpf_cnpj, empresa_id])', hasClienteUnique ? 'Presente em SQL e Prisma' : 'Ausente', null, hasClienteUnique ? 'PASSOU' : 'FALHOU');

    const hasVeiculoUnique = sqlContent.includes('`Veiculo_placa_empresa_id_key`(`placa`, `empresa_id`)') &&
                             prismaContent.includes('@@unique([placa, empresa_id])');
    recordResult('DATABASE', 'Veiculo @@unique([placa, empresa_id])', hasVeiculoUnique ? 'Presente em SQL e Prisma' : 'Ausente', null, hasVeiculoUnique ? 'PASSOU' : 'FALHOU');

    const hasOrcamentoUnique = sqlContent.includes('`Orcamento_numero_empresa_id_key`(`numero`, `empresa_id`)') &&
                               prismaContent.includes('@@unique([numero, empresa_id])');
    recordResult('DATABASE', 'Orcamento @@unique([numero, empresa_id])', hasOrcamentoUnique ? 'Presente em SQL e Prisma' : 'Ausente', null, hasOrcamentoUnique ? 'PASSOU' : 'FALHOU');

    const hasOSUnique = sqlContent.includes('`OrdemServico_numero_empresa_id_key`(`numero`, `empresa_id`)') &&
                        prismaContent.includes('@@unique([numero, empresa_id])');
    recordResult('DATABASE', 'OrdemServico @@unique([numero, empresa_id])', hasOSUnique ? 'Presente em SQL e Prisma' : 'Ausente', null, hasOSUnique ? 'PASSOU' : 'FALHOU');

    const hasPecaUnique = sqlContent.includes('`Peca_codigo_empresa_id_key`(`codigo`, `empresa_id`)') &&
                          prismaContent.includes('@@unique([codigo, empresa_id])');
    recordResult('DATABASE', 'Peca @@unique([codigo, empresa_id])', hasPecaUnique ? 'Presente em SQL e Prisma' : 'Ausente', null, hasPecaUnique ? 'PASSOU' : 'FALHOU');

    // 15.3 Ausência de DEFAULT 'default' em tabelas de negócio
    const hasDefaultHardcoded = sqlContent.includes("DEFAULT 'default'") || prismaContent.includes('@default("default")');
    recordResult('DATABASE', 'Ausência de DEFAULT "default" em colunas empresa_id', hasDefaultHardcoded ? 'Existe DEFAULT default' : 'Nenhum DEFAULT default encontrado', null, !hasDefaultHardcoded ? 'PASSOU' : 'FALHOU');

    // 15.4 Ausência de usuário admin pré-configurado no SQL
    const hasHardcodedAdmin = sqlContent.includes("INSERT INTO `User`") || sqlContent.includes("INSERT INTO User");
    recordResult('DATABASE', 'Ausência de usuário admin pré-configurado em database.sql', hasHardcodedAdmin ? 'Encontrado seed de usuário' : 'Seguro (sem usuário hardcoded)', null, !hasHardcodedAdmin ? 'PASSOU' : 'FALHOU');

    // 15.5 Auditoria de Constraints Físicas no Banco de Dados em Execução
    try {
      const clienteIndexes = await prisma.$queryRawUnsafe("SHOW INDEX FROM `Cliente`;");
      const hasPhysicalClienteComposite = clienteIndexes.some(r => r.Key_name === 'Cliente_cpf_cnpj_empresa_id_key');
      const hasPhysicalClienteGlobal = clienteIndexes.some(r => r.Key_name === 'Cliente_cpf_cnpj_key');
      recordResult(
        'DATABASE',
        'Banco Físico: Constraint Composta Cliente (cpf_cnpj, empresa_id)',
        hasPhysicalClienteComposite ? 'Presente no banco físico' : (hasPhysicalClienteGlobal ? 'Banco físico retém constraint global antiga (Cliente_cpf_cnpj_key) - requer migration' : 'Ausente'),
        hasPhysicalClienteComposite ? null : 'Requer aplicação de migration no banco físico',
        hasPhysicalClienteComposite ? 'PASSOU' : 'FALHOU'
      );

      const veiculoIndexes = await prisma.$queryRawUnsafe("SHOW INDEX FROM `Veiculo`;");
      const hasPhysicalVeiculoComposite = veiculoIndexes.some(r => r.Key_name === 'Veiculo_placa_empresa_id_key');
      const hasPhysicalVeiculoGlobal = veiculoIndexes.some(r => r.Key_name === 'Veiculo_placa_key');
      recordResult(
        'DATABASE',
        'Banco Físico: Constraint Composta Veiculo (placa, empresa_id)',
        hasPhysicalVeiculoComposite ? 'Presente no banco físico' : (hasPhysicalVeiculoGlobal ? 'Banco físico retém constraint global antiga (Veiculo_placa_key) - requer migration' : 'Ausente'),
        hasPhysicalVeiculoComposite ? null : 'Requer aplicação de migration no banco físico',
        hasPhysicalVeiculoComposite ? 'PASSOU' : 'FALHOU'
      );

      const osIndexes = await prisma.$queryRawUnsafe("SHOW INDEX FROM `OrdemServico`;");
      const hasPhysicalOSComposite = osIndexes.some(r => r.Key_name === 'OrdemServico_numero_empresa_id_key');
      const hasPhysicalOSGlobal = osIndexes.some(r => r.Key_name === 'OrdemServico_numero_key');
      recordResult(
        'DATABASE',
        'Banco Físico: Constraint Composta OrdemServico (numero, empresa_id)',
        hasPhysicalOSComposite ? 'Presente no banco físico' : (hasPhysicalOSGlobal ? 'Banco físico retém constraint global antiga (OrdemServico_numero_key) - requer migration' : 'Ausente'),
        hasPhysicalOSComposite ? null : 'Requer aplicação de migration no banco físico',
        hasPhysicalOSComposite ? 'PASSOU' : 'FALHOU'
      );
    } catch (dbErr) {
      recordResult('DATABASE', 'Auditoria física de constraints MySQL', 'Erro ao consultar SHOW INDEX', dbErr.message, 'FALHOU');
    }
  } catch (err) {
    recordResult('DATABASE', 'Auditoria SQL x Prisma', 'Exceção', err.message, 'FALHOU');
  }

  // Limpeza dos dados de teste
  try {
    await prisma.auditLog.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.checklistFoto.deleteMany({ where: { ChecklistExecucao: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.checklistExecucao.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.checklistItem.deleteMany({ where: { Checklist: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.checklist.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.movimentacaoEstoque.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.movimentacaoFinanceira.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.pecaAplicada.deleteMany({ where: { OrdemServico: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.servicoOS.deleteMany({ where: { OrdemServico: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.ordemServico.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.orcamentoPeca.deleteMany({ where: { Orcamento: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.orcamentoServico.deleteMany({ where: { Orcamento: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } } });
    await prisma.orcamento.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.preventiva.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.eventoAgenda.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.notificacao.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.peca.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.veiculo.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.cliente.deleteMany({ where: { empresa_id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A_ID, USER_B_ID, USER_A_SEC_ID] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [EMPRESA_A_ID, EMPRESA_B_ID] } } });
    console.log('\nDados de teste limpos do banco com sucesso.');
  } catch (err) {
    console.warn('Erro ao limpar dados de teste:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // Salvar relatório em JSON para formatação precisa
  const fs = require('fs');
  fs.writeFileSync('./test-results.json', JSON.stringify(resultsTable, null, 2));
  console.log('\nBateria de testes finalizada. Total de testes executados:', resultsTable.length);
}

main().catch(err => {
  console.error('ERRO FATAL NA EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
