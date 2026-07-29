-- DropIndex
DROP INDEX `Peca_codigo_key` ON `Peca`;

-- AlterTable
ALTER TABLE `Cliente` ADD COLUMN `ativo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `bairro` VARCHAR(191) NULL,
    ADD COLUMN `cep` VARCHAR(191) NULL,
    ADD COLUMN `cidade` VARCHAR(191) NULL,
    ADD COLUMN `complemento` VARCHAR(191) NULL,
    ADD COLUMN `contato` VARCHAR(191) NULL,
    ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    ADD COLUMN `estado` VARCHAR(191) NULL,
    ADD COLUMN `inscricao_estadual` VARCHAR(191) NULL,
    ADD COLUMN `nome_fantasia` VARCHAR(191) NULL,
    ADD COLUMN `numero` VARCHAR(191) NULL,
    ADD COLUMN `observacoes` VARCHAR(191) NULL,
    ADD COLUMN `perfil` VARCHAR(191) NOT NULL DEFAULT 'CLIENTE',
    ADD COLUMN `razao_social` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ATIVO',
    ADD COLUMN `telefone_secundario` VARCHAR(191) NULL,
    ADD COLUMN `tipo_pessoa` VARCHAR(191) NULL,
    ADD COLUMN `uf` VARCHAR(191) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `MovimentacaoFinanceira` ADD COLUMN `categoria` VARCHAR(191) NULL,
    ADD COLUMN `centro_custo` VARCHAR(191) NULL,
    ADD COLUMN `cliente_id` VARCHAR(191) NULL,
    ADD COLUMN `comprovante_url` VARCHAR(191) NULL,
    ADD COLUMN `data_pagamento` DATETIME(3) NULL,
    ADD COLUMN `data_vencimento` DATETIME(3) NULL,
    ADD COLUMN `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    ADD COLUMN `forma_pagamento` VARCHAR(191) NULL,
    ADD COLUMN `numero_documento` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    MODIFY `valor` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `OrdemServico` ADD COLUMN `assinatura_cliente` TEXT NULL,
    ADD COLUMN `assinatura_hash` VARCHAR(191) NULL,
    ADD COLUMN `assinatura_mecanico` TEXT NULL,
    ADD COLUMN `assinatura_supervisor` TEXT NULL,
    ADD COLUMN `assinatura_timestamp` DATETIME(3) NULL,
    ADD COLUMN `centro_custo` VARCHAR(191) NULL DEFAULT 'OFICINA',
    ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `custo_deslocamento` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `custo_km` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `custo_mao_obra` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `custo_pecas` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `custo_real` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `data_vencimento_primeira` DATETIME(3) NULL,
    ADD COLUMN `despesa_alimentacao` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesa_combustivel` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesa_diaria_tecnica` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesa_guincho` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesa_hospedagem` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesa_outros` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesa_pedagio` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `despesas_comprovantes` TEXT NULL,
    ADD COLUMN `despesas_extras` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `dias_entre_parcelas` INTEGER NULL DEFAULT 28,
    ADD COLUMN `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    ADD COLUMN `ferramentas_levadas` TEXT NULL,
    ADD COLUMN `forma_pagamento` VARCHAR(191) NULL,
    ADD COLUMN `km_retorno` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `km_saida` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `km_total` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `local_atendimento` VARCHAR(191) NULL,
    ADD COLUMN `local_cidade` VARCHAR(191) NULL,
    ADD COLUMN `local_estado` VARCHAR(191) NULL,
    ADD COLUMN `local_gps` VARCHAR(191) NULL,
    ADD COLUMN `lucro_bruto` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `mao_obra_equipe` TEXT NULL,
    ADD COLUMN `mao_obra_externa_horas` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `mao_obra_externa_total` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `mao_obra_externa_valor` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `margem_lucro` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `numero_parcelas` INTEGER NULL,
    ADD COLUMN `orcamento_id` VARCHAR(191) NULL,
    ADD COLUMN `timeline_viagem` TEXT NULL,
    ADD COLUMN `tipoOS` VARCHAR(191) NULL DEFAULT 'OFICINA',
    ADD COLUMN `tipo_atendimento` VARCHAR(191) NULL DEFAULT 'OFICINA',
    ADD COLUMN `total_deslocamento` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `total_liquido` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    ADD COLUMN `valor_km` DECIMAL(10, 2) NULL DEFAULT 0.00,
    MODIFY `valor_servicos` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY `valor_pecas` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY `desconto` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `Peca` ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    ADD COLUMN `fatorConversao` DOUBLE NOT NULL DEFAULT 1,
    ADD COLUMN `permiteFracionado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `unidadeCompra` VARCHAR(191) NOT NULL DEFAULT 'un',
    ADD COLUMN `unidadeMedida` VARCHAR(191) NOT NULL DEFAULT 'un',
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    MODIFY `quantidade` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `estoque_minimo` DOUBLE NOT NULL DEFAULT 5,
    MODIFY `preco_custo` DECIMAL(10, 2) NOT NULL,
    MODIFY `preco_venda` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `PecaAplicada` ADD COLUMN `origem` VARCHAR(191) NULL DEFAULT 'OFICINA',
    ADD COLUMN `unidade` VARCHAR(191) NULL DEFAULT 'un',
    MODIFY `quantidade` DOUBLE NOT NULL,
    MODIFY `valor_unit` DECIMAL(10, 2) NOT NULL,
    MODIFY `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `ServicoOS` MODIFY `horas` DOUBLE NULL,
    MODIFY `valor_hora` DECIMAL(10, 2) NULL DEFAULT 150.00,
    MODIFY `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    MODIFY `comissao` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `Veiculo` DROP COLUMN `ultima_revisao`,
    ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    ADD COLUMN `horimetro_atual` DOUBLE NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    MODIFY `tipo` ENUM('CAVALO_MECANICO', 'CARRETA', 'ONIBUS', 'UTILITARIO', 'CAMINHAO_LEVE', 'CAMINHAO_PESADO', 'CAMINHONETE', 'VAN', 'RETROESCAVADEIRA', 'ESCAVADEIRA_HIDRAULICA', 'PA_CARREGADEIRA', 'MOTONIVELADORA', 'TRATOR_ESTEIRA', 'ROLO_COMPACTADOR', 'VIBROACABADORA', 'FRESADORA', 'USINA_ASFALTO', 'EMPILHADEIRA', 'GUINDASTE', 'PERFURATRIZ', 'TRATOR_AGRICOLA', 'CAMINHAO_PIPA', 'CAMINHAO_MUNCK', 'EQUIPAMENTO_ASFALTO', 'OUTROS') NOT NULL;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `acao` VARCHAR(191) NOT NULL,
    `entidade` VARCHAR(191) NOT NULL,
    `entidade_id` VARCHAR(191) NOT NULL,
    `usuario` VARCHAR(191) NOT NULL,
    `dados_antes` LONGTEXT NULL,
    `dados_depois` LONGTEXT NULL,
    `ip` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',

    INDEX `AuditLog_empresa_id_idx`(`empresa_id`),
    INDEX `AuditLog_entidade_id_idx`(`entidade_id`),
    INDEX `AuditLog_modulo_idx`(`modulo`),
    INDEX `AuditLog_usuario_idx`(`usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Checklist` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `categoria` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChecklistExecucao` (
    `id` VARCHAR(191) NOT NULL,
    `checklist_id` VARCHAR(191) NOT NULL,
    `os_id` VARCHAR(191) NULL,
    `veiculo_id` VARCHAR(191) NULL,
    `executado_por` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respostas` LONGTEXT NOT NULL,
    `observacoes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',

    INDEX `ChecklistExecucao_checklist_id_fkey`(`checklist_id`),
    INDEX `ChecklistExecucao_os_id_fkey`(`os_id`),
    INDEX `ChecklistExecucao_veiculo_id_fkey`(`veiculo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChecklistFoto` (
    `id` VARCHAR(191) NOT NULL,
    `execucao_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NULL,
    `url` VARCHAR(191) NOT NULL,
    `legenda` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChecklistFoto_execucao_id_fkey`(`execucao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChecklistItem` (
    `id` VARCHAR(191) NOT NULL,
    `checklist_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `obrigatorio` BOOLEAN NOT NULL DEFAULT true,
    `tipo` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChecklistItem_checklist_id_fkey`(`checklist_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfiguracaoEmpresa` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'config_empresa',
    `nome_fantasia` VARCHAR(191) NULL,
    `razao_social` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NULL,
    `inscricao_estadual` VARCHAR(191) NULL,
    `inscricao_municipal` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `uf` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `logo_url` TEXT NULL,
    `rodape_personalizado` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `regime_tributario` VARCHAR(191) NULL,
    `token_nfse` VARCHAR(191) NULL,
    `pix` VARCHAR(191) NULL,
    `banco` VARCHAR(191) NULL,
    `agencia` VARCHAR(191) NULL,
    `conta` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Empresa` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Empresa_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- InsertDefaultEmpresa
INSERT INTO `Empresa` (`id`, `nome`, `cnpj`, `created_at`, `updated_at`) 
VALUES ('default', 'Empresa Padrão', NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `EventoAgenda` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `data_inicio` DATETIME(3) NOT NULL,
    `data_fim` DATETIME(3) NOT NULL,
    `tipo` ENUM('OS', 'REVISAO', 'MANUTENCAO_PREVENTIVA', 'VISTORIA', 'ENTREGA', 'OUTRO') NOT NULL,
    `status` ENUM('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'AGENDADO',
    `cor` VARCHAR(191) NULL,
    `os_id` VARCHAR(191) NULL,
    `cliente_id` VARCHAR(191) NULL,
    `veiculo_id` VARCHAR(191) NULL,
    `mecanico_id` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',

    INDEX `EventoAgenda_cliente_id_fkey`(`cliente_id`),
    INDEX `EventoAgenda_data_inicio_idx`(`data_inicio`),
    INDEX `EventoAgenda_empresa_id_idx`(`empresa_id`),
    INDEX `EventoAgenda_mecanico_id_idx`(`mecanico_id`),
    INDEX `EventoAgenda_os_id_fkey`(`os_id`),
    INDEX `EventoAgenda_usuario_id_idx`(`usuario_id`),
    INDEX `EventoAgenda_veiculo_id_fkey`(`veiculo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimentacaoEstoque` (
    `id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `quantidade` DOUBLE NOT NULL,
    `motivo` VARCHAR(191) NOT NULL DEFAULT 'AJUSTE',
    `observacao` TEXT NULL,
    `os_id` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentacaoEstoque_empresa_id_idx`(`empresa_id`),
    INDEX `MovimentacaoEstoque_os_id_fkey`(`os_id`),
    INDEX `MovimentacaoEstoque_peca_id_idx`(`peca_id`),
    INDEX `MovimentacaoEstoque_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacao` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `usuario_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',

    INDEX `Notificacao_empresa_id_idx`(`empresa_id`),
    INDEX `Notificacao_usuario_id_idx`(`usuario_id`),
    INDEX `Notificacao_usuario_id_lida_created_at_idx`(`usuario_id`, `lida`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Orcamento` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `veiculo_id` VARCHAR(191) NULL,
    `status` ENUM('RASCUNHO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'CONVERTIDO') NOT NULL DEFAULT 'RASCUNHO',
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_validade` DATETIME(3) NULL,
    `desconto` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_servicos` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_pecas` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `observacoes` TEXT NULL,
    `termos_condicoes` TEXT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',

    INDEX `Orcamento_cliente_id_fkey`(`cliente_id`),
    INDEX `Orcamento_veiculo_id_fkey`(`veiculo_id`),
    UNIQUE INDEX `Orcamento_numero_empresa_id_key`(`numero`, `empresa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrcamentoPeca` (
    `id` VARCHAR(191) NOT NULL,
    `orcamento_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `quantidade` DOUBLE NOT NULL DEFAULT 0,
    `valor_unit` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `unidade` VARCHAR(191) NULL DEFAULT 'un',

    INDEX `OrcamentoPeca_orcamento_id_fkey`(`orcamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrcamentoServico` (
    `id` VARCHAR(191) NOT NULL,
    `orcamento_id` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `horas` DOUBLE NOT NULL DEFAULT 0,
    `valor_hora` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    INDEX `OrcamentoServico_orcamento_id_fkey`(`orcamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Preventiva` (
    `id` VARCHAR(191) NOT NULL,
    `empresa_id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `veiculo_id` VARCHAR(191) NOT NULL,
    `componente` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `km_limite` INTEGER NULL,
    `km_atual` INTEGER NULL,
    `data_limite` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SAUDAVEL',
    `observacoes` VARCHAR(191) NULL,
    `notificado` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Preventiva_veiculo_id_idx`(`veiculo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `MovimentacaoFinanceira_cliente_id_fkey` ON `MovimentacaoFinanceira`(`cliente_id`);

-- CreateIndex
CREATE UNIQUE INDEX `OrdemServico_orcamento_id_key` ON `OrdemServico`(`orcamento_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Peca_codigo_empresa_id_key` ON `Peca`(`codigo`, `empresa_id`);

-- CreateIndex
CREATE INDEX `User_empresa_id_fkey` ON `User`(`empresa_id`);

-- AddForeignKey
ALTER TABLE `ChecklistExecucao` ADD CONSTRAINT `ChecklistExecucao_checklist_id_fkey` FOREIGN KEY (`checklist_id`) REFERENCES `Checklist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChecklistExecucao` ADD CONSTRAINT `ChecklistExecucao_os_id_fkey` FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChecklistExecucao` ADD CONSTRAINT `ChecklistExecucao_veiculo_id_fkey` FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChecklistFoto` ADD CONSTRAINT `ChecklistFoto_execucao_id_fkey` FOREIGN KEY (`execucao_id`) REFERENCES `ChecklistExecucao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChecklistItem` ADD CONSTRAINT `ChecklistItem_checklist_id_fkey` FOREIGN KEY (`checklist_id`) REFERENCES `Checklist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoAgenda` ADD CONSTRAINT `EventoAgenda_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoAgenda` ADD CONSTRAINT `EventoAgenda_mecanico_id_fkey` FOREIGN KEY (`mecanico_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoAgenda` ADD CONSTRAINT `EventoAgenda_os_id_fkey` FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoAgenda` ADD CONSTRAINT `EventoAgenda_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoAgenda` ADD CONSTRAINT `EventoAgenda_veiculo_id_fkey` FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoEstoque` ADD CONSTRAINT `MovimentacaoEstoque_os_id_fkey` FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoEstoque` ADD CONSTRAINT `MovimentacaoEstoque_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `Peca`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoFinanceira` ADD CONSTRAINT `MovimentacaoFinanceira_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Orcamento` ADD CONSTRAINT `Orcamento_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Orcamento` ADD CONSTRAINT `Orcamento_veiculo_id_fkey` FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrcamentoPeca` ADD CONSTRAINT `OrcamentoPeca_orcamento_id_fkey` FOREIGN KEY (`orcamento_id`) REFERENCES `Orcamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrcamentoServico` ADD CONSTRAINT `OrcamentoServico_orcamento_id_fkey` FOREIGN KEY (`orcamento_id`) REFERENCES `Orcamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServico` ADD CONSTRAINT `OrdemServico_orcamento_id_fkey` FOREIGN KEY (`orcamento_id`) REFERENCES `Orcamento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Preventiva` ADD CONSTRAINT `Preventiva_veiculo_id_fkey` FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

