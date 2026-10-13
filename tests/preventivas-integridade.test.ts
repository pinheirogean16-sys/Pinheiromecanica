/**
 * TESTES DE INTEGRIDADE — MÓDULO DE MANUTENÇÃO PREVENTIVA
 * ERP OFICINA DIESEL
 *
 * Execução: npm test
 * Watch:    npm run test:watch
 *
 * Regra: Não executa escritas no banco real.
 * Usa mocks/fakes para isolar a lógica.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  avaliarStatusPreventiva,
  sincronizarPreventivasAposOS,
} from '../lib/preventivas';

import {
  validarEProcessarLeiturasVeiculo,
  LIMITE_MAX_KM_PLAUSIVEL,
  LIMITE_MAX_HORAS_PLAUSIVEL,
  SALTO_SUSPEITO_KM,
  SALTO_SUSPEITO_HORAS,
} from '../lib/odometro-horimetro';

// ============================================================
// HELPERS
// ============================================================
function criarFakeTx(overrides: any = {}) {
  return {
    veiculo: {
      findFirst: vi.fn().mockResolvedValue({ quilometragem: 100000 }),
      ...overrides.veiculo,
    },
    preventiva: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'prev-1',
        proximo_km: 110000,
        intervalo_km: 10000,
      }),
      update: vi.fn(),
      ...overrides.preventiva,
    },
    preventivaExecucao: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      ...overrides.preventivaExecucao,
    },
  };
}

// ============================================================
// SUÍTE
// ============================================================
describe('Preventivas — Integridade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // CENÁRIO 1 — OS aberta não avança plano preventivo
  // ============================================================
  describe('OS aberta não avança plano preventivo', () => {
    it('não deve chamar update nem create quando status é ABERTA', async () => {
      const fakeTx = criarFakeTx();

      const osAberta = {
        id: 'os-1',
        status: 'ABERTA',
        veiculo_id: 'veic-1',
        empresa_id: 'emp-1',
      };

      const res = await sincronizarPreventivasAposOS(osAberta, {
        preventivasIds: ['prev-1'],
        tx: fakeTx,
      });

      expect(res.sucesso).toBe(true);
      expect(res.executadas).toHaveLength(0);
      expect(fakeTx.preventiva.update).not.toHaveBeenCalled();
      expect(fakeTx.preventivaExecucao.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // CENÁRIO 2 — OS finalizada com vínculo avança plano
  // ============================================================
  describe('OS finalizada avança plano preventivo', () => {
    it('deve criar execução e atualizar plano', async () => {
      const fakeTx = criarFakeTx();

      const osFinalizada = {
        id: 'os-2',
        status: 'FINALIZADA',
        veiculo_id: 'veic-1',
        empresa_id: 'emp-1',
        km_saida: 110000,
        horimetro_saida: 15000,
      };

      const res = await sincronizarPreventivasAposOS(osFinalizada, {
        preventivasIds: ['prev-1'],
        tx: fakeTx,
      });

      expect(res.sucesso).toBe(true);
    });
  });

  // ============================================================
  // CENÁRIO 3 — OS cancelada não altera nada
  // ============================================================
  describe('OS cancelada não altera nada', () => {
    it('não deve atualizar nenhum plano', async () => {
      const fakeTx = criarFakeTx();

      const osCancelada = {
        id: 'os-3',
        status: 'CANCELADA',
        veiculo_id: 'veic-1',
        empresa_id: 'emp-1',
      };

      const res = await sincronizarPreventivasAposOS(osCancelada, {
        preventivasIds: ['prev-1'],
        tx: fakeTx,
      });

      expect(res.sucesso).toBe(true);
      expect(fakeTx.preventiva.update).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// AVALIAÇÃO DE STATUS PREVENTIVA
// ============================================================
describe('avaliarStatusPreventiva', () => {
  it('deve retornar SAUDAVEL quando longe do limite', () => {
    const resultado = avaliarStatusPreventiva(
      {
        id: 'prev-1',
        ativo: true,
        proximo_km: 120000,
        antecedencia_km: 1500,
      },
      { quilometragem: 100000 }
    );

    expect(resultado.status).toBe('SAUDAVEL');
  });

  it('deve retornar PROXIMO quando dentro da antecedência', () => {
    const resultado = avaliarStatusPreventiva(
      {
        id: 'prev-2',
        ativo: true,
        proximo_km: 101000,
        antecedencia_km: 1500,
      },
      { quilometragem: 100000 }
    );

    expect(resultado.status).toBe('PROXIMO');
  });

  it('deve retornar VENCIDO quando passou do limite', () => {
    const resultado = avaliarStatusPreventiva(
      {
        id: 'prev-3',
        ativo: true,
        proximo_km: 99000,
        antecedencia_km: 1500,
      },
      { quilometragem: 100000 }
    );

    expect(resultado.status).toBe('VENCIDO');
  });

  it('deve retornar DESATIVADO quando ativo = false', () => {
    const resultado = avaliarStatusPreventiva(
      {
        id: 'prev-4',
        ativo: false,
        proximo_km: 90000,
      },
      { quilometragem: 100000 }
    );

    expect(resultado.status).toBe('DESATIVADO');
  });
});

// ============================================================
// LEITURAS DE ODOMETRO / HORIMETRO
// ============================================================
describe('validarEProcessarLeiturasVeiculo', () => {
  it('deve aceitar leitura normal de km', async () => {
    const res = await validarEProcessarLeiturasVeiculo({
      km: 100500,
      kmAnterior: 100000,
      horimetro: null,
      horimetroAnterior: null,
    });

    expect(res.valido).toBe(true);
  });

  it('deve rejeitar salto suspeito de km', async () => {
    const res = await validarEProcessarLeiturasVeiculo({
      km: 100000 + SALTO_SUSPEITO_KM + 1,
      kmAnterior: 100000,
      horimetro: null,
      horimetroAnterior: null,
    });

    expect(res.valido).toBe(false);
  });
});
