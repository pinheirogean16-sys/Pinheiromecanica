/**
 * TESTES DE INTEGRAÇÃO COM BANCO MYSQL/MARIADB ISOLADO
 * ERP OFICINA DIESEL — MANUTENÇÃO PREVENTIVA E TRANSAÇÕES
 *
 * REGRAS ESTRITAS DE SEGURANÇA:
 * 1. Exige explicitamente a variável TEST_DATABASE_URL apontando para banco de testes isolado.
 * 2. NUNCA utiliza DATABASE_URL como fallback.
 * 3. NUNCA conecta à produção (srv1075.hstgr.io), nunca aplica migrações e nunca apaga dados de produção.
 * 4. Se TEST_DATABASE_URL não puder ser confirmada como banco de teste seguro, aborta imediatamente.
 * 5. Se TEST_DATABASE_URL não for informada, os testes são declarados como NÃO EXECUTADOS (BLOQUEADOS POR FALTA DE AMBIENTE).
 *
 * ESCOPO DOS TESTES:
 * 1. Rollback real: grava dados dentro de uma transação InnoDB, força falha e comprova por consulta externa que houve rollback.
 * 2. Concorrência real: duas operações concorrentes registram a mesma execução preventiva; confirma no banco que existe exatamente 1 registro.
 * 3. Tratamento de duplicidade vs propagação de erros inesperados.
 * 4. Múltiplas preventivas na mesma OS (atomicidade, avanço correto de ciclos e idempotência contra duplo avanço).
 * 5. Histórico real obtido diretamente da tabela PreventivaExecucao.
 * 6. Limpeza estrita apenas dos registros criados pela suíte de teste.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  sincronizarPreventivasAposOS,
  obterHistoricoExecucoesPreventiva,
  obterExecucoesPreventivasDaOS
} from '../lib/preventivas';

interface CenariotResult {
  numero: number;
  titulo: string;
  executado: boolean;
  passou: boolean;
  detalhes: string;
}

const resultados: CenariotResult[] = [];

function registrarResultado(numero: number, titulo: string, executado: boolean, passou: boolean, detalhes: string) {
  resultados.push({ numero, titulo, executado, passou, detalhes });
  const statusStr = !executado
    ? '⚠️  BLOQUEADO (FALTA DE AMBIENTE)'
    : passou
    ? '✅ PASSOU'
    : '❌ FALHOU';
  console.log(`[Cenário ${numero.toString().padStart(2, '0')}] ${statusStr} — ${titulo}`);
  console.log(`               ${detalhes}\n`);
}

function validarSegurancaBancoTestes(url: string): { seguro: boolean; motivo?: string } {
  const urlLower = url.toLowerCase();

  // 1. Proibição absoluta de hosts de produção
  if (urlLower.includes('srv1075.hstgr.io') || urlLower.includes('hostinger') || urlLower.includes('prod')) {
    return { seguro: false, motivo: 'URL aponta para servidor ou domínio de produção (srv1075.hstgr.io/prod)!' };
  }

  // 2. A URL deve conter identificadores inequívocos de ambiente de teste
  const isLocalHost = urlLower.includes('localhost') || urlLower.includes('127.0.0.1') || urlLower.includes('mariadb') || urlLower.includes('mysql');
  const hasTestKeyword = urlLower.includes('test') || urlLower.includes('teste');

  if (!isLocalHost && !hasTestKeyword) {
    return {
      seguro: false,
      motivo: 'O banco não pôde ser identificado com segurança como base de testes (ausência de localhost/test/teste no host ou nome da base).'
    };
  }

  return { seguro: true };
}

export async function executarTestesIntegracaoMySQL() {
  console.log('======================================================================');
  console.log('ERP OFICINA DIESEL — TESTES DE INTEGRAÇÃO MYSQL/MARIADB ISOLADO');
  console.log('CONCORRÊNCIA REAL, ROLLBACK REAL E MULTI-PREVENTIVAS');
  console.log('======================================================================\n');

  // REGRA DE SEGURANÇA: Exige TEST_DATABASE_URL explicitamente. NUNCA usar DATABASE_URL como fallback!
  const testDbUrl = process.env.TEST_DATABASE_URL;

  if (!testDbUrl || testDbUrl.trim() === '') {
    console.log('🛡️  DECLARAÇÃO DE LIMITAÇÃO DE AMBIENTE E PROTEÇÃO DE PRODUÇÃO:');
    console.log('----------------------------------------------------------------------');
    console.log('1. A variável TEST_DATABASE_URL NÃO está configurada no ambiente.');
    console.log('2. Conforme regra estrita do projeto, a variável de produção DATABASE_URL');
    console.log('   NUNCA é utilizada como fallback para testes de integração.');
    console.log('3. A base de produção foi PRESERVADA sem qualquer conexão, DDL ou DML.');
    console.log('4. Todos os 5 testes de integração com banco MySQL real estão');
    console.log('   PLENAMENTE IMPLEMENTADOS neste arquivo.');
    console.log('----------------------------------------------------------------------\n');

    console.log('📋 ESPECIFICAÇÃO DOS TESTES IMPLEMENTADOS:');
    registrarResultado(
      1,
      'Rollback real no motor InnoDB via transação interativa',
      false,
      false,
      'Status: NÃO EXECUTADO (Bloqueado por falta de TEST_DATABASE_URL). Implementado: escrita em tx, erro forçado e verificação de ausência fora de tx.'
    );
    registrarResultado(
      2,
      'Concorrência real com duas requisições paralelas e constraint única',
      false,
      false,
      'Status: NÃO EXECUTADO (Bloqueado por falta de TEST_DATABASE_URL). Implementado: Promise.all com 2 gravações simultâneas e assert de registro único.'
    );
    registrarResultado(
      3,
      'Tratamento de colisão P2002 vs propagação de erros inesperados',
      false,
      false,
      'Status: NÃO EXECUTADO (Bloqueado por falta de TEST_DATABASE_URL). Implementado: verificação de que duplicidade é absorvida e erros reais falham.'
    );
    registrarResultado(
      4,
      'Múltiplas preventivas na mesma OS (Atomicidade e Idempotência)',
      false,
      false,
      'Status: NÃO EXECUTADO (Bloqueado por falta de TEST_DATABASE_URL). Implementado: OS com 3 planos, avanço conjunto e proteção contra duplo avanço.'
    );
    registrarResultado(
      5,
      'Consulta ao histórico real através da tabela PreventivaExecucao',
      false,
      false,
      'Status: NÃO EXECUTADO (Bloqueado por falta de TEST_DATABASE_URL). Implementado: verificação de sucesso e registros através das funções de consulta.'
    );

    console.log('======================================================================');
    console.log('RESUMO:');
    console.log('  - Testes executados: 0');
    console.log('  - Testes aprovados: 0');
    console.log('  - Testes bloqueados por falta de ambiente: 5');
    console.log('  - Integridade da produção: 100% PRESERVADA (sem alterações)');
    console.log('======================================================================\n');
    return;
  }

  // Validação estrita de segurança do banco apontado por TEST_DATABASE_URL
  const seguranca = validarSegurancaBancoTestes(testDbUrl);
  if (!seguranca.seguro) {
    console.error(`⛔ BLOQUEIO DE SEGURANÇA: ${seguranca.motivo}`);
    console.error('Abortando imediatamente para proteger a base de produção.');
    process.exit(1);
  }

  console.log(`🔌 Conectando ao banco de testes isolado: ${testDbUrl.replace(/:[^:@]+@/, ':***@')}`);

  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: testDbUrl
      }
    }
  });

  const testEmpresaId = `test_emp_${randomUUID()}`;
  const testClienteId = `test_cli_${randomUUID()}`;
  const testVeiculoId = `test_veic_${randomUUID()}`;

  try {
    await testPrisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso ao banco de testes MySQL.\n');

    // SETUP: Criação de entidades mínimas para atender às foreign keys
    console.log('⚙️  Criando fixtures isoladas no banco de testes...');
    await testPrisma.empresa.create({
      data: {
        id: testEmpresaId,
        nome: 'Empresa Teste Integracao',
        cnpj: `test-${Date.now()}`.slice(0, 18),
        updated_at: new Date()
      }
    });

    await testPrisma.cliente.create({
      data: {
        id: testClienteId,
        empresa_id: testEmpresaId,
        tipo: 'PJ',
        nome: 'Cliente Teste Integracao',
        cpf_cnpj: `cnpj-${Date.now()}`.slice(0, 18),
        telefone: '11999999999',
        updated_at: new Date()
      }
    });

    await testPrisma.veiculo.create({
      data: {
        id: testVeiculoId,
        empresa_id: testEmpresaId,
        cliente_id: testClienteId,
        placa: `TST${Math.floor(1000 + Math.random() * 9000)}`,
        modelo: 'Constellation 24.280',
        marca: 'Volkswagen',
        ano: 2022,
        tipo: 'CAMINHAO_PESADO',
        quilometragem: 120000,
        horimetro_atual: 3500,
        updated_at: new Date()
      }
    });
    console.log('✅ Fixtures criadas com sucesso.\n');

    // -------------------------------------------------------------------------
    // CENÁRIO 1: Rollback real no motor InnoDB via transação interativa
    // -------------------------------------------------------------------------
    try {
      const rollbackOsId = `test_os_rb_${randomUUID()}`;
      const rollbackPrevId = `test_prev_rb_${randomUUID()}`;

      await testPrisma.preventiva.create({
        data: {
          id: rollbackPrevId,
          empresa_id: testEmpresaId,
          veiculo_id: testVeiculoId,
          componente: 'Motor',
          nome: 'Troca de Óleo Rollback',
          intervalo_km: 10000,
          ultimo_km: 100000,
          proximo_km: 110000,
          status: 'VENCIDO',
          updated_at: new Date()
        }
      });

      await testPrisma.ordemServico.create({
        data: {
          id: rollbackOsId,
          empresa_id: testEmpresaId,
          cliente_id: testClienteId,
          veiculo_id: testVeiculoId,
          status: 'FINALIZADA',
          updated_at: new Date()
        }
      });

      let erroCapturado = false;
      try {
        await testPrisma.$transaction(async (tx) => {
          // 1. Grava a execução dentro da transação
          await tx.preventivaExecucao.create({
            data: {
              id: randomUUID(),
              empresa_id: testEmpresaId,
              os_id: rollbackOsId,
              preventiva_id: rollbackPrevId,
              veiculo_id: testVeiculoId,
              data_conclusao: new Date(),
              km_conclusao: 120000,
              observacoes: 'Registro para teste de rollback'
            }
          });

          // 2. Atualiza a preventiva dentro da transação
          await tx.preventiva.update({
            where: { id: rollbackPrevId },
            data: { ultimo_km: 120000, proximo_km: 130000 }
          });

          // 3. Força falha intencional APÓS as gravações
          throw new Error('ROLLBACK_INTENCIONAL_DE_TESTE');
        });
      } catch (err: any) {
        if (err.message === 'ROLLBACK_INTENCIONAL_DE_TESTE') {
          erroCapturado = true;
        } else {
          throw err;
        }
      }

      // 4. Consulta o banco FORA da transação usando o cliente independente
      const execucaoAposRollback = await testPrisma.preventivaExecucao.findUnique({
        where: {
          empresa_id_os_id_preventiva_id: {
            empresa_id: testEmpresaId,
            os_id: rollbackOsId,
            preventiva_id: rollbackPrevId
          }
        }
      });

      const preventivaAposRollback = await testPrisma.preventiva.findUnique({
        where: { id: rollbackPrevId }
      });

      const rollbackConfirmado =
        erroCapturado &&
        execucaoAposRollback === null &&
        preventivaAposRollback?.ultimo_km === 100000 &&
        preventivaAposRollback?.proximo_km === 110000;

      registrarResultado(
        1,
        'Rollback real no motor InnoDB via transação interativa',
        true,
        rollbackConfirmado,
        rollbackConfirmado
          ? 'Comprovado por consulta externa: registro PreventivaExecucao revertido e último KM mantido em 100000.'
          : 'Falha: dados gravados persistiram no banco após throw na transação.'
      );
    } catch (e: any) {
      registrarResultado(1, 'Rollback real no motor InnoDB', true, false, `Erro inesperado: ${e.message}`);
    }

    // -------------------------------------------------------------------------
    // CENÁRIO 2: Concorrência real com duas requisições paralelas
    // -------------------------------------------------------------------------
    let concOsId = '';
    let concPrevId = '';
    try {
      concOsId = `test_os_conc_${randomUUID()}`;
      concPrevId = `test_prev_conc_${randomUUID()}`;

      await testPrisma.preventiva.create({
        data: {
          id: concPrevId,
          empresa_id: testEmpresaId,
          veiculo_id: testVeiculoId,
          componente: 'Freios',
          nome: 'Troca de Pastilhas Concorrência',
          intervalo_km: 30000,
          ultimo_km: 90000,
          proximo_km: 120000,
          status: 'VENCIDO',
          updated_at: new Date()
        }
      });

      await testPrisma.ordemServico.create({
        data: {
          id: concOsId,
          empresa_id: testEmpresaId,
          cliente_id: testClienteId,
          veiculo_id: testVeiculoId,
          status: 'FINALIZADA',
          updated_at: new Date()
        }
      });

      const osData = {
        id: concOsId,
        veiculo_id: testVeiculoId,
        empresa_id: testEmpresaId,
        status: 'FINALIZADA'
      };

      // Dispara duas operações concorrentes em paralelo contra o MySQL real
      const [res1, res2] = await Promise.all([
        sincronizarPreventivasAposOS(osData, {
          preventivasIds: [concPrevId],
          kmVeiculo: 120000,
          prismaClient: testPrisma
        }),
        sincronizarPreventivasAposOS(osData, {
          preventivasIds: [concPrevId],
          kmVeiculo: 120000,
          prismaClient: testPrisma
        })
      ]);

      // Consulta no banco de dados para confirmar que existe EXATAMENTE UM registro gravado
      const registrosNoBanco = await testPrisma.preventivaExecucao.findMany({
        where: {
          empresa_id: testEmpresaId,
          os_id: concOsId,
          preventiva_id: concPrevId
        }
      });

      const concPassou =
        registrosNoBanco.length === 1 &&
        (res1.sucesso && res2.sucesso) &&
        (res1.executadas.length === 1 || res2.executadas.length === 1) &&
        (res1.ignoradas.length === 1 || res2.ignoradas.length === 1);

      registrarResultado(
        2,
        'Concorrência real com duas requisições paralelas e constraint única',
        true,
        concPassou,
        concPassou
          ? `Sucesso: 2 requisições concorrentes executadas em paralelo. Exatamente 1 registro persistido no MySQL (P2002 absorvido com segurança).`
          : `Falha na concorrência: encontrados ${registrosNoBanco.length} registros no banco (esperado: 1).`
      );
    } catch (e: any) {
      registrarResultado(2, 'Concorrência real com duas requisições paralelas', true, false, `Erro inesperado: ${e.message}`);
    }

    // -------------------------------------------------------------------------
    // CENÁRIO 3: Tratamento de duplicidade vs propagação de erros inesperados
    // -------------------------------------------------------------------------
    try {
      // 1. Chamar novamente a sincronização para o mesmo plano já registrado
      const osData = {
        id: concOsId,
        veiculo_id: testVeiculoId,
        empresa_id: testEmpresaId,
        status: 'FINALIZADA'
      };

      const resDuplicada = await sincronizarPreventivasAposOS(osData, {
        preventivasIds: [concPrevId],
        kmVeiculo: 120000,
        prismaClient: testPrisma
      });

      const duplicidadeTratada =
        resDuplicada.sucesso === true &&
        resDuplicada.executadas.length === 0 &&
        resDuplicada.ignoradas.includes(concPrevId);

      // 2. Chamar com erro inesperado (ex: transação externa forçando erro fatal de banco)
      const fakeErrorTx = {
        veiculo: {
          findFirst: async () => {
            throw new Error('CONEXAO_PERDIDA_SIMULADA_FATAL');
          }
        }
      };

      const resErroFatal = await sincronizarPreventivasAposOS(osData, {
        preventivasIds: [concPrevId],
        tx: fakeErrorTx
      });

      const erroPropagadoCorretamente =
        resErroFatal.sucesso === false &&
        Boolean(resErroFatal.erro?.includes('CONEXAO_PERDIDA_SIMULADA_FATAL'));

      const cenario3Passou = Boolean(duplicidadeTratada && erroPropagadoCorretamente);

      registrarResultado(
        3,
        'Tratamento de colisão P2002 vs propagação de erros inesperados',
        true,
        cenario3Passou,
        cenario3Passou
          ? 'Sucesso: Duplicidade reconhecida sem erro e erros reais não mascarados (sucesso: false com mensagem observável).'
          : 'Falha: duplicidade não tratada corretamente ou erro inesperado suprimido.'
      );
    } catch (e: any) {
      registrarResultado(3, 'Tratamento de colisão vs erros inesperados', true, false, `Erro inesperado: ${e.message}`);
    }

    // -------------------------------------------------------------------------
    // CENÁRIO 4: Múltiplas preventivas na mesma OS (Atomicidade e Idempotência)
    // -------------------------------------------------------------------------
    try {
      const multiOsId = `test_os_multi_${randomUUID()}`;
      const prevIds: string[] = [];

      for (let i = 1; i <= 3; i++) {
        const pId = `test_prev_multi_${i}_${randomUUID()}`;
        prevIds.push(pId);
        await testPrisma.preventiva.create({
          data: {
            id: pId,
            empresa_id: testEmpresaId,
            veiculo_id: testVeiculoId,
            componente: `Componente ${i}`,
            nome: `Plano Preventivo Multi ${i}`,
            intervalo_km: 15000,
            ultimo_km: 105000,
            proximo_km: 120000,
            status: 'VENCIDO',
            updated_at: new Date()
          }
        });
      }

      await testPrisma.ordemServico.create({
        data: {
          id: multiOsId,
          empresa_id: testEmpresaId,
          cliente_id: testClienteId,
          veiculo_id: testVeiculoId,
          status: 'FINALIZADA',
          updated_at: new Date()
        }
      });

      const multiOsData = {
        id: multiOsId,
        veiculo_id: testVeiculoId,
        empresa_id: testEmpresaId,
        status: 'FINALIZADA'
      };

      // Primeira execução: deve concluir todas as 3
      const resPrimeira = await sincronizarPreventivasAposOS(multiOsData, {
        preventivasIds: prevIds,
        kmVeiculo: 120000,
        prismaClient: testPrisma
      });

      const execucoesPrimeira = await testPrisma.preventivaExecucao.findMany({
        where: {
          empresa_id: testEmpresaId,
          os_id: multiOsId
        }
      });

      // Segunda execução (repetição): não deve avançar nem duplicar nenhuma
      const resSegunda = await sincronizarPreventivasAposOS(multiOsData, {
        preventivasIds: prevIds,
        kmVeiculo: 120000,
        prismaClient: testPrisma
      });

      const execucoesSegunda = await testPrisma.preventivaExecucao.findMany({
        where: {
          empresa_id: testEmpresaId,
          os_id: multiOsId
        }
      });

      const multiPassou =
        resPrimeira.sucesso === true &&
        resPrimeira.executadas.length === 3 &&
        execucoesPrimeira.length === 3 &&
        resSegunda.sucesso === true &&
        resSegunda.executadas.length === 0 &&
        resSegunda.ignoradas.length === 3 &&
        execucoesSegunda.length === 3;

      registrarResultado(
        4,
        'Múltiplas preventivas na mesma OS (Atomicidade e Idempotência)',
        true,
        multiPassou,
        multiPassou
          ? 'Sucesso: 3 preventivas processadas com criação atômica dos registros e avanço de ciclos. Repetição manteve exatamente 3 registros (duplo avanço evitado).'
          : 'Falha ao processar múltiplas preventivas ou na idempotência de repetição.'
      );
    } catch (e: any) {
      registrarResultado(4, 'Múltiplas preventivas na mesma OS', true, false, `Erro inesperado: ${e.message}`);
    }

    // -------------------------------------------------------------------------
    // CENÁRIO 5: Consulta ao histórico real através da tabela PreventivaExecucao
    // -------------------------------------------------------------------------
    try {
      const histPrev = await obterHistoricoExecucoesPreventiva(concPrevId, testEmpresaId, testPrisma);
      const histOs = await obterExecucoesPreventivasDaOS(concOsId, testEmpresaId, testPrisma);

      const histPassou =
        histPrev.sucesso === true &&
        histPrev.indisponivel === false &&
        histPrev.dados.length === 1 &&
        histOs.sucesso === true &&
        histOs.indisponivel === false &&
        histOs.dados.length === 1;

      registrarResultado(
        5,
        'Consulta ao histórico real através da tabela PreventivaExecucao',
        true,
        histPassou,
        histPassou
          ? 'Sucesso: Histórico lido diretamente do banco real sem indisponibilidade ou simulação.'
          : 'Falha na consulta ao histórico real.'
      );
    } catch (e: any) {
      registrarResultado(5, 'Consulta ao histórico real', true, false, `Erro inesperado: ${e.message}`);
    }

  } catch (error: any) {
    console.error('❌ Erro global durante execução da suíte de testes de integração:', error.message);
  } finally {
    // LIMPEZA ESTRITA: Exclui estritamente os dados gerados pela suíte de testes
    console.log('\n🧹 Limpando dados de teste isolados (empresa_id exclusivo)...');
    try {
      await testPrisma.preventivaExecucao.deleteMany({ where: { empresa_id: testEmpresaId } });
      await testPrisma.preventiva.deleteMany({ where: { empresa_id: testEmpresaId } });
      await testPrisma.ordemServico.deleteMany({ where: { empresa_id: testEmpresaId } });
      await testPrisma.veiculo.deleteMany({ where: { empresa_id: testEmpresaId } });
      await testPrisma.cliente.deleteMany({ where: { empresa_id: testEmpresaId } });
      await testPrisma.empresa.deleteMany({ where: { id: testEmpresaId } });
      console.log('✅ Limpeza dos registros de teste concluída.');
    } catch (cleanErr: any) {
      console.warn('Aviso ao limpar dados de teste:', cleanErr.message);
    } finally {
      await testPrisma.$disconnect();
    }
  }

  const totalExecutados = resultados.filter((r) => r.executado).length;
  const totalPassaram = resultados.filter((r) => r.passou).length;
  const totalBloqueados = resultados.filter((r) => !r.executado).length;

  console.log('\n======================================================================');
  console.log('RESUMO FINAL DOS TESTES DE INTEGRAÇÃO MYSQL:');
  console.log(`  - Testes executados: ${totalExecutados}`);
  console.log(`  - Testes aprovados: ${totalPassaram}`);
  console.log(`  - Testes bloqueados por falta de ambiente: ${totalBloqueados}`);
  console.log('======================================================================\n');
}

executarTestesIntegracaoMySQL().catch((err) => {
  console.error('Falha não tratada:', err);
  process.exit(1);
});
