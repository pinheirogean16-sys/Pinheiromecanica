-- Migration: 20261011120000_add_preventiva_execucao_historico
-- Cria a tabela PreventivaExecucao para rastreabilidade persistente de cada ciclo de preventiva executado
-- Impede duplo avanço via restrição única composta (empresa_id, os_id, preventiva_id)
-- Preserva histórico de manutenções executadas mesmo se o plano for desativado ou reconfigurado

CREATE TABLE IF NOT EXISTS `PreventivaExecucao` (
  `id` VARCHAR(191) NOT NULL,
  `empresa_id` VARCHAR(191) NOT NULL,
  `preventiva_id` VARCHAR(191) NOT NULL,
  `veiculo_id` VARCHAR(191) NOT NULL,
  `os_id` VARCHAR(191) NOT NULL,
  `data_conclusao` DATETIME(3) NOT NULL,
  `km_conclusao` INT NULL,
  `horimetro_conclusao` DOUBLE NULL,
  `usuario_id` VARCHAR(191) NULL,
  `usuario_nome` VARCHAR(191) NULL,
  `componente` VARCHAR(191) NULL,
  `servico` VARCHAR(191) NULL,
  `ciclo_numero` INT NOT NULL DEFAULT 1,
  `km_proximo_calculado` INT NULL,
  `horimetro_proximo_calculado` DOUBLE NULL,
  `data_proxima_calculada` DATETIME(3) NULL,
  `observacoes` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `PreventivaExecucao_empresa_os_prev_unique` (`empresa_id`, `os_id`, `preventiva_id`),
  INDEX `PreventivaExecucao_empresa_idx` (`empresa_id`),
  INDEX `PreventivaExecucao_preventiva_idx` (`preventiva_id`),
  INDEX `PreventivaExecucao_veiculo_idx` (`veiculo_id`),
  INDEX `PreventivaExecucao_os_idx` (`os_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
