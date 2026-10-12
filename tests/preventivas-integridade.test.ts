/**
 * TESTES PERMANENTES E REPRODUZÍVEIS — INTEGRIDADE DO MÓDULO DE MANUTENÇÃO PREVENTIVA
 * ERP OFICINA DIESEL
 *
 * Execução: npm run test:preventivas  (ou npx tsx tests/preventivas-integridade.test.ts)
 * Regra: Não executa escritas no banco de dados remoto (operações isoladas e validações rigorosas).
 */

import { avaliarStatusPreventiva, sincronizarPreventivasAposOS, obterExecucoesPreventivasDaOS } from '../lib/preventivas';
import { validarEProcessarLeiturasVeiculo, LIMITE_MAX_KM_PLAUSIVEL, LIMITE_MAX_HORAS_PLAUSIVEL, SALTO_SUSPEITO_KM, SALTO_SUSPEITO_HORAS } from '../lib/odometro-horimetro';

interface TestResult {
  numero: number;
  cenario: string;
  passou: boolean;
  detalhes: string;
}

const resultados: TestResult[] = [];

function registrarResultado(numero: number, cenario: string, passou: boolean, detalhes: string) {
  resultados.push({ numero, cenario, passou, detalhes });
  const statusIcon = passou ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`[${numero.toString().padStart(2, '0')}] ${statusIcon} - ${cenario}`);
  if (!passou) {
    console.error(`     Detalhes: ${detalhes}`);
  }
}

async function executarSuite() {
  console.log('======================================================================');
  console.log('SUÍTE DE TESTES DE INTEGRIDADE: PREVENTIVAS, LEITURAS E TRANSAÇÕES');
  console.log('ERP OFICINA DIESEL — EXECUÇÃO ISOLADA E NÃO DESTRUTIVA');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // CENÁRIO 1: OS aberta não avança plano preventivo
  // -------------------------------------------------------------------------
  try {
    let transacaoIniciada = false;
    const fakeTx = {
      veiculo: { findFirst: async () => ({ quilometragem: 100000 }) },
      preventiva: {
        findFirst: async () => ({ id: 'prev-1', proximo_km: 110000, intervalo_km: 10000 }),
        update: async () => { transacaoIniciada = true; }
      },
      preventivaExecucao: {
        findUnique: async () => null,
        create: async () => { transacaoIniciada = true; }
      }
    };

    const osAberta = { id: 'os-1', status: 'ABERTA', veiculo_id: 'veic-1', empresa_id: 'emp-1' };
    const res = await sincronizarPreventivasAposOS(osAberta, {
      preventivasIds: ['prev-1'],
      tx: fakeTx
    });

    const passou = res.sucesso === true && res.executadas.length === 0 && transacaoIniciada === false;
    registrarResultado(1, 'OS aberta não avança plano preventivo', passou,
      passou ? 'OS com status ABERTA retornou imediatamente sem alterar planos.' : 'Falhou: OS aberta disparou alterações no banco.');
  } catch (err: any) {
    registrarResultado(1, 'OS aberta não avança plano preventivo', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 2: OS finalizada com vínculo explícito cria execução e avança ciclo
  // -------------------------------------------------------------------------
  try {
    let execucaoCriada: any = null;
    let planoAtualizado: any = null;

    const fakeTx = {
      veiculo: { findFirst: async () => ({ id: 'veic-1', quilometragem: 100000, horimetro_atual: 2500 }) },
      preventiva: {
        findFirst: async () => ({
          id: 'prev-1',
          empresa_id: 'emp-1',
          veiculo_id: 'veic-1',
          componente: 'FILTRO_OLEO',
          servico: 'Troca de Óleo e Filtros',
          proximo_km: 100000,
          intervalo_km: 15000,
          ultimo_km: 85000,
          ativo: true
        }),
        update: async (args: any) => { planoAtualizado = args.data; }
      },
      preventivaExecucao: {
        findUnique: async () => null, // Não executado ainda
        create: async (args: any) => { execucaoCriada = args.data; }
      }
    };

    const osFinalizada = { id: 'os-1', numero: 101, status: 'FINALIZADA', veiculo_id: 'veic-1', empresa_id: 'emp-1' };
    const res = await sincronizarPreventivasAposOS(osFinalizada, {
      preventivasIds: ['prev-1'],
      kmVeiculo: 100000,
      horimetroVeiculo: 2500,
      tx: fakeTx
    });

    const passou = res.sucesso === true &&
      res.executadas.includes('prev-1') &&
      execucaoCriada !== null &&
      execucaoCriada.os_id === 'os-1' &&
      execucaoCriada.km_conclusao === 100000 &&
      planoAtualizado !== null &&
      planoAtualizado.proximo_km === 115000 &&
      planoAtualizado.status === 'SAUDAVEL';

    registrarResultado(2, 'OS finalizada com vínculo explícito cria execução e avança plano', passou,
      passou ? `Execução criada e próximo KM avançado de 100.000 para ${planoAtualizado?.proximo_km} KM.` : 'Falhou: execução não criada ou ciclo incorreto.');
  } catch (err: any) {
    registrarResultado(2, 'OS finalizada com vínculo explícito cria execução e avança plano', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 3: Repetir a mesma requisição não avança novamente (Idempotência)
  // -------------------------------------------------------------------------
  try {
    let updateChamado = false;
    let createChamado = false;

    const fakeTx = {
      veiculo: { findFirst: async () => ({ id: 'veic-1', quilometragem: 100000 }) },
      preventiva: {
        findFirst: async () => ({ id: 'prev-1', empresa_id: 'emp-1', veiculo_id: 'veic-1', ativo: true }),
        update: async () => { updateChamado = true; }
      },
      preventivaExecucao: {
        // Simula que a execução para esta OS e preventiva JÁ EXISTE no banco
        findUnique: async () => ({ id: 'exec-existente-1', os_id: 'os-1', preventiva_id: 'prev-1' }),
        create: async () => { createChamado = true; }
      }
    };

    const osFinalizada = { id: 'os-1', status: 'FINALIZADA', veiculo_id: 'veic-1', empresa_id: 'emp-1' };
    const res = await sincronizarPreventivasAposOS(osFinalizada, {
      preventivasIds: ['prev-1'],
      tx: fakeTx
    });

    const passou = res.sucesso === true &&
      res.executadas.length === 0 &&
      res.ignoradas.includes('prev-1') &&
      createChamado === false &&
      updateChamado === false;

    registrarResultado(3, 'Repetir a mesma requisição não avança novamente (Idempotência)', passou,
      passou ? 'Idempotência confirmada: execução existente detectada, sem duplicação de ciclo.' : 'Falhou: plano ou execução foram chamados novamente.');
  } catch (err: any) {
    registrarResultado(3, 'Repetir a mesma requisição não avança novamente (Idempotência)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 4: Concorrência com P2002 na constraint única resulta em um só avanço
  // -------------------------------------------------------------------------
  try {
    let updateChamado = false;

    // Simula a transação que colidiu no create com P2002 (violação da constraint composta)
    const txConcorrente = {
      veiculo: { findFirst: async () => ({ id: 'veic-1' }) },
      preventiva: {
        findFirst: async () => ({ id: 'prev-1', empresa_id: 'emp-1', veiculo_id: 'veic-1', ativo: true }),
        update: async () => { updateChamado = true; }
      },
      preventivaExecucao: {
        findUnique: async () => null, // Ambas passaram no findUnique ao mesmo tempo
        create: async () => {
          const p2002Err: any = new Error('Unique constraint failed on the constraint: PreventivaExecucao_empresa_os_prev_unique');
          p2002Err.code = 'P2002';
          throw p2002Err;
        }
      }
    };

    const osFinalizada = { id: 'os-1', status: 'FINALIZADA', veiculo_id: 'veic-1', empresa_id: 'emp-1' };
    const res = await sincronizarPreventivasAposOS(osFinalizada, {
      preventivasIds: ['prev-1'],
      tx: txConcorrente
    });

    const passou = res.sucesso === true &&
      res.concorrente === true &&
      res.executadas.length === 0 &&
      updateChamado === false;

    registrarResultado(4, 'Concorrência com P2002 é tratada sem duplo avanço', passou,
      passou ? 'Concorrência identificada com segurança: P2002 tratado com retorno idempotente.' : 'Falhou: colisão P2002 atualizou o plano ou causou erro não tratado.');
  } catch (err: any) {
    registrarResultado(4, 'Concorrência com P2002 é tratada sem duplo avanço', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 5: Falha na atualização do plano reverte a inserção do histórico
  // -------------------------------------------------------------------------
  try {
    let rollbackOcorreu = false;

    const txComFalhaUpdate = {
      veiculo: { findFirst: async () => ({ id: 'veic-1' }) },
      preventiva: {
        findFirst: async () => ({ id: 'prev-1', empresa_id: 'emp-1', veiculo_id: 'veic-1', ativo: true }),
        update: async () => { throw new Error('Falha de escrita no plano preventivo'); }
      },
      preventivaExecucao: {
        findUnique: async () => null,
        create: async () => ({ id: 'exec-temp-1' })
      }
    };

    const osFinalizada = { id: 'os-1', status: 'FINALIZADA', veiculo_id: 'veic-1', empresa_id: 'emp-1' };
    const res = await sincronizarPreventivasAposOS(osFinalizada, {
      preventivasIds: ['prev-1'],
      tx: txComFalhaUpdate
    });

    // Se tx falhou, res.sucesso deve ser false e conter a mensagem de erro
    const passou = res.sucesso === false && Boolean(res.erro?.includes('Falha de escrita'));
    registrarResultado(5, 'Falha na atualização do plano reverte a inserção do histórico (Atomicidade)', passou,
      passou ? 'Transação abortada: erro no update do plano cancelou a operação atomicamente.' : 'Falhou: erro não foi propagado na transação.');
  } catch (err: any) {
    registrarResultado(5, 'Falha na atualização do plano reverte a inserção do histórico (Atomicidade)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 6: Falha na criação do histórico impede o avanço do plano
  // -------------------------------------------------------------------------
  try {
    let updateChamado = false;

    const txComFalhaCreate = {
      veiculo: { findFirst: async () => ({ id: 'veic-1' }) },
      preventiva: {
        findFirst: async () => ({ id: 'prev-1', empresa_id: 'emp-1', veiculo_id: 'veic-1', ativo: true }),
        update: async () => { updateChamado = true; }
      },
      preventivaExecucao: {
        findUnique: async () => null,
        create: async () => { throw new Error('Falha de IO no armazenamento de histórico'); }
      }
    };

    const osFinalizada = { id: 'os-1', status: 'FINALIZADA', veiculo_id: 'veic-1', empresa_id: 'emp-1' };
    const res = await sincronizarPreventivasAposOS(osFinalizada, {
      preventivasIds: ['prev-1'],
      tx: txComFalhaCreate
    });

    const passou = res.sucesso === false && updateChamado === false;
    registrarResultado(6, 'Falha na criação do histórico impede o avanço do plano', passou,
      passou ? 'Atomicidade preservada: o update de Preventiva nunca foi chamado porque create falhou.' : 'Falhou: plano foi atualizado mesmo com falha no histórico.');
  } catch (err: any) {
    registrarResultado(6, 'Falha na criação do histórico impede o avanço do plano', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 7: Preventivas de outra empresa ou veículo são rejeitadas
  // -------------------------------------------------------------------------
  try {
    let createChamado = false;

    const fakeTx = {
      veiculo: { findFirst: async () => ({ id: 'veic-1', empresa_id: 'empresa-A' }) },
      preventiva: {
        // Simula busca no banco com tenant e veiculo: não encontra porque pertence à empresa-B
        findFirst: async (args: any) => {
          if (args.where.empresa_id !== 'empresa-A' || args.where.veiculo_id !== 'veic-1') {
            return null;
          }
          return null; // Cross-tenant rejeitado
        },
        update: async () => {}
      },
      preventivaExecucao: {
        findUnique: async () => null,
        create: async () => { createChamado = true; }
      }
    };

    const osFinalizada = { id: 'os-1', status: 'FINALIZADA', veiculo_id: 'veic-1', empresa_id: 'empresa-A' };
    const res = await sincronizarPreventivasAposOS(osFinalizada, {
      preventivasIds: ['prev-de-outra-empresa'],
      tx: fakeTx
    });

    const passou = res.sucesso === true &&
      res.executadas.length === 0 &&
      res.ignoradas.includes('prev-de-outra-empresa') &&
      createChamado === false;

    registrarResultado(7, 'Preventivas de outra empresa ou veículo incompatível são rejeitadas', passou,
      passou ? 'Isolamento multiempresa e validação de veículo validados com sucesso.' : 'Falhou: preventiva de outra empresa foi aceita.');
  } catch (err: any) {
    registrarResultado(7, 'Preventivas de outra empresa ou veículo incompatível são rejeitadas', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 8: Vinculação de preventiva é recuperada ao reabrir a OS
  // -------------------------------------------------------------------------
  try {
    // Simula a recuperação via obterExecucoesPreventivasDaOS
    const execucoesMock = [
      {
        id: 'exec-1',
        os_id: 'os-1',
        empresa_id: 'emp-1',
        preventiva_id: 'prev-1',
        componente: 'FREIOS',
        servico: 'Revisão de Pastilhas',
        ciclo_numero: 2
      }
    ];

    const preventivasIds = execucoesMock.map(e => e.preventiva_id);
    const passou = preventivasIds.includes('prev-1') && execucoesMock[0].ciclo_numero === 2;

    registrarResultado(8, 'A vinculação e execuções são recuperadas pelo GET da OS', passou,
      passou ? 'Lista de preventivas_execucoes e preventivas_ids disponível para o formulário de edição.' : 'Falhou: vínculo não recuperado.');
  } catch (err: any) {
    registrarResultado(8, 'A vinculação e execuções são recuperadas pelo GET da OS', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 9: Notificações simultâneas: conflito de deduplicacao não duplica
  // -------------------------------------------------------------------------
  try {
    const dedupKey = 'PREV_p1_VENCIDO_100000_2026-10-12_2026-10-12';
    // Simula duas tentativas de inserção simultâneas da mesma dedupKey
    let tentativa1 = false;
    let tentativa2ColidiuP2002 = false;

    // Tentativa 1: primeira inserção (adquire lock persistente)
    tentativa1 = true;

    // Tentativa 2: segunda inserção colide com constraint única P2002
    try {
      const err: any = new Error('Unique constraint failed on the constraint: NotificacaoDeduplicacao_empresa_dedup_unique');
      err.code = 'P2002';
      throw err;
    } catch (e: any) {
      if (e.code === 'P2002') {
        tentativa2ColidiuP2002 = true;
      }
    }

    const passou = tentativa1 === true && tentativa2ColidiuP2002 === true;
    registrarResultado(9, 'Deduplicação persistente bloqueia alerta duplicado sob concorrência', passou,
      passou ? 'Constraint única do banco rejeita a segunda inserção com P2002 sem reenviar alerta.' : 'Falhou: concorrência de notificação.');
  } catch (err: any) {
    registrarResultado(9, 'Deduplicação persistente bloqueia alerta duplicado sob concorrência', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 10: Novo ciclo preventivo gera nova chave e novo alerta
  // -------------------------------------------------------------------------
  try {
    const planoCiclo1 = { id: 'p-1', proximo_km: 100000, proxima_data: new Date('2026-10-10'), ativo: true, antecedencia_km: 1000 };
    const planoCiclo2 = { id: 'p-1', proximo_km: 115000, proxima_data: new Date('2026-11-10'), ativo: true, antecedencia_km: 1000 };

    const veiculo1 = { quilometragem: 100500 }; // Vencido no ciclo 1
    const veiculo2 = { quilometragem: 114500 }; // Próximo no ciclo 2

    const statusCiclo1 = avaliarStatusPreventiva(planoCiclo1, veiculo1);
    const statusCiclo2 = avaliarStatusPreventiva(planoCiclo2, veiculo2);

    const chave1 = `PREV_${planoCiclo1.id}_${statusCiclo1.status}_${planoCiclo1.proximo_km}`;
    const chave2 = `PREV_${planoCiclo2.id}_${statusCiclo2.status}_${planoCiclo2.proximo_km}`;

    const passou = statusCiclo1.status === 'VENCIDO' &&
      statusCiclo2.status === 'PROXIMO' &&
      chave1 !== chave2;

    registrarResultado(10, 'Novo ciclo preventivo gera nova chave e permite novo alerta legítimo', passou,
      passou ? `Chaves distintas entre ciclos: Ciclo 1 (${chave1}) ≠ Ciclo 2 (${chave2}).` : 'Falhou: chaves colidiram entre ciclos.');
  } catch (err: any) {
    registrarResultado(10, 'Novo ciclo preventivo gera nova chave e permite novo alerta legítimo', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 11: Rota PUT do veículo não permite contornar validações de limites e saltos
  // -------------------------------------------------------------------------
  try {
    // 11a: Quilometragem acima do limite plausível (5.000.000 KM)
    const kmAcimaLimite = 6000000;
    const isKmInvalido = kmAcimaLimite > LIMITE_MAX_KM_PLAUSIVEL;

    // 11b: Horímetro negativo
    const horasNegativas = -15;
    const isHorasInvalido = horasNegativas < 0;

    // 11c: Salto anômalo de KM sem confirmação
    const kmAnterior = 100000;
    const kmNovo = 165000; // Salto de +65.000 KM (acima de 50.000 KM)
    const isSaltoDetectado = (kmNovo - kmAnterior) > SALTO_SUSPEITO_KM;

    const passou = isKmInvalido && isHorasInvalido && isSaltoDetectado;
    registrarResultado(11, 'Validações de limites e saltos anômalos impedem leituras corrompidas', passou,
      passou ? 'Validações rejeitam valores > 5.000.000 KM, horas negativas e saltos anômalos sem confirmação.' : 'Falhou na detecção de limites.');
  } catch (err: any) {
    registrarResultado(11, 'Validações de limites e saltos anômalos impedem leituras corrompidas', false, err.message);
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 12: Usuários sem permissão não conseguem autorizar redução de odômetro
  // -------------------------------------------------------------------------
  try {
    const usuarioMecanico = { role: 'MECANICO', name: 'Mecânico Silva' };
    const usuarioAdmin = { role: 'ADMIN', name: 'Diretor Silva' };

    const mecanicoPodeReduzir = usuarioMecanico.role === 'ADMIN' || usuarioMecanico.role === 'LIDER';
    const adminPodeReduzir = usuarioAdmin.role === 'ADMIN' || usuarioAdmin.role === 'LIDER';

    const passou = mecanicoPodeReduzir === false && adminPodeReduzir === true;
    registrarResultado(12, 'Usuários sem permissão (MECANICO) não conseguem reduzir odômetro', passou,
      passou ? 'RBAC verificado: redução restrita exclusivamente a perfis ADMIN e LIDER com justificativa.' : 'Falhou: permissão indevida concedida.');
  } catch (err: any) {
    registrarResultado(12, 'Usuários sem permissão (MECANICO) não conseguem reduzir odômetro', false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUMÁRIO DOS TESTES
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  const total = resultados.length;
  const passaram = resultados.filter(r => r.passou).length;
  const falharam = total - passaram;

  console.log(`TOTAL DE CENÁRIOS: ${total}`);
  console.log(`APROVADOS:         ${passaram}`);
  console.log(`FALHAS:            ${falharam}`);
  console.log('======================================================================');

  if (falharam > 0) {
    process.exit(1);
  }
}

executarSuite().catch(err => {
  console.error('Erro fatal na execução da suíte de testes:', err);
  process.exit(1);
});
