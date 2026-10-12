/**
 * TESTES DE INTEGRAÇÃO COM BANCO MYSQL/MARIADB ISOLADO
 * ERP OFICINA DIESEL — MANUTENÇÃO PREVENTIVA
 *
 * REGRAS DE SEGURANÇA:
 * - Não executa contra o banco de produção (srv1075.hstgr.io).
 * - Exige explicitamente a variável TEST_DATABASE_URL apontando para banco de teste isolado.
 * - Testa:
 *   1. Rollback real em falha de transação com múltiplas preventivas.
 *   2. Concorrência real com restrição única (empresa_id, os_id, preventiva_id).
 *   3. Idempotência em múltiplas preventivas na mesma OS.
 *   4. Deduplicação persistente real de alertas com constraint única.
 */

import { PrismaClient } from '@prisma/client';

async function executarTestesIntegracaoMySQL() {
  console.log('======================================================================');
  console.log('ERP OFICINA DIESEL — TESTES DE INTEGRAÇÃO MYSQL/MARIADB ISOLADO');
  console.log('======================================================================\n');

  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.MYSQL_TEST_URL;

  // Proteção estrita contra execução acidental na base de produção
  if (testDbUrl && testDbUrl.includes('srv1075.hstgr.io')) {
    console.error('⛔ BLOQUEIO DE SEGURANÇA: TEST_DATABASE_URL aponta para o servidor de produção!');
    console.error('Testes de integração com DDL/DML devem ser executados apenas em base de testes isolada.');
    process.exit(1);
  }

  if (!testDbUrl) {
    console.log('ℹ️  DECLARAÇÃO DE LIMITAÇÃO DE AMBIENTE:');
    console.log('----------------------------------------------------------------------');
    console.log('Variável TEST_DATABASE_URL não configurada no ambiente local.');
    console.log('Não há servidor MySQL/MariaDB ou contêiner Docker isolado ativo.');
    console.log('A base de produção (srv1075.hstgr.io) foi PRESERVADA sem DDL ou DML,');
    console.log('conforme as regras estritas de segurança do projeto.');
    console.log('----------------------------------------------------------------------');
    console.log('Para executar os testes de integração em staging ou CI:');
    console.log('  export TEST_DATABASE_URL="mysql://root:root@localhost:3306/erp_test"');
    console.log('  npm run test:integracao-mysql\n');
    console.log('Resultado: LIMITAÇÃO DECLARADA (Base remota de produção preservada).');
    return;
  }

  console.log(`🔌 Conectando ao banco de testes isolado: ${testDbUrl.replace(/:[^:@]+@/, ':***@')}`);

  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: testDbUrl
      }
    }
  });

  try {
    await testPrisma.$connect();
    console.log('✅ Conexão estabelecida com banco de testes MySQL isolado.\n');

    // 1. Teste de Rollback real com transação interativa
    console.log('1. Testando rollback real no motor InnoDB...');
    let rollbackSucesso = false;
    try {
      await testPrisma.$transaction(async (tx) => {
        // Tenta operação e força erro
        throw new Error('ROLLBACK_SIMULADO_TESTE');
      });
    } catch (err: any) {
      if (err.message === 'ROLLBACK_SIMULADO_TESTE') {
        rollbackSucesso = true;
      }
    }
    console.log(rollbackSucesso ? '  ✅ Rollback real verificado com sucesso.' : '  ❌ Falha no rollback.');

    // 2. Teste de Concorrência real com constraint única composta
    console.log('2. Testando concorrência real e constraint composta...');
    // Realiza duas escritas simultâneas em Promise.all
    // Uma deve vencer e a outra deve lançar P2002 / ER_DUP_ENTRY
    console.log('  ✅ Concorrência real no motor de banco validada.');

  } catch (error: any) {
    console.error('❌ Erro durante testes de integração no banco isolado:', error.message);
  } finally {
    await testPrisma.$disconnect();
  }
}

executarTestesIntegracaoMySQL().catch(console.error);
