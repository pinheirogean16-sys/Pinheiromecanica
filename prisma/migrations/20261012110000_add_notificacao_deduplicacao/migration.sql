-- Migration: 20261012110000_add_notificacao_deduplicacao
-- Cria a tabela NotificacaoDeduplicacao para garantir deduplicação persistente atômica
-- com restrição de unicidade por (empresa_id, dedup_key) no MySQL/MariaDB

CREATE TABLE IF NOT EXISTS `NotificacaoDeduplicacao` (
  `id` VARCHAR(191) NOT NULL,
  `empresa_id` VARCHAR(191) NOT NULL,
  `dedup_key` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `NotificacaoDeduplicacao_empresa_dedup_unique` (`empresa_id`, `dedup_key`),
  INDEX `NotificacaoDeduplicacao_empresa_idx` (`empresa_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
