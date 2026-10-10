-- Migration: 20261010100000_expand_preventiva_maintenance_plan
-- Expande o modelo Preventiva para controle integral de Planos de Manutenção Preventiva
-- Suporte a Data, Quilometragem (KM) e Horímetro (Horas) para caminhões e máquinas pesadas

ALTER TABLE `Preventiva`
  ADD COLUMN `nome` VARCHAR(191) NULL AFTER `descricao`,
  ADD COLUMN `servico` VARCHAR(191) NULL AFTER `nome`,
  ADD COLUMN `tipo_controle` VARCHAR(50) NOT NULL DEFAULT 'KM' AFTER `servico`,
  ADD COLUMN `intervalo_dias` INT NULL AFTER `tipo_controle`,
  ADD COLUMN `intervalo_km` INT NULL AFTER `intervalo_dias`,
  ADD COLUMN `intervalo_horas` DOUBLE NULL AFTER `intervalo_km`,
  ADD COLUMN `ultima_data` DATETIME(3) NULL AFTER `intervalo_horas`,
  ADD COLUMN `ultimo_km` INT NULL AFTER `ultima_data`,
  ADD COLUMN `ultimo_horimetro` DOUBLE NULL AFTER `ultimo_km`,
  ADD COLUMN `proxima_data` DATETIME(3) NULL AFTER `ultimo_horimetro`,
  ADD COLUMN `proximo_km` INT NULL AFTER `proxima_data`,
  ADD COLUMN `proximo_horimetro` DOUBLE NULL AFTER `proximo_km`,
  ADD COLUMN `horimetro_atual` DOUBLE NULL AFTER `proximo_horimetro`,
  ADD COLUMN `antecedencia_dias` INT NULL DEFAULT 15 AFTER `horimetro_atual`,
  ADD COLUMN `antecedencia_km` INT NULL DEFAULT 1500 AFTER `antecedencia_dias`,
  ADD COLUMN `antecedencia_horas` DOUBLE NULL DEFAULT 50 AFTER `antecedencia_km`,
  ADD COLUMN `ativo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `antecedencia_horas`,
  ADD COLUMN `created_by` VARCHAR(191) NULL AFTER `ativo`,
  ADD COLUMN `updated_by` VARCHAR(191) NULL AFTER `created_by`;
