-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'LIDER', 'MECANICO', 'ESTOQUISTA', 'FINANCEIRO') NOT NULL DEFAULT 'MECANICO',
    `especialidade` VARCHAR(191) NULL,
    `comissao` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PF', 'PJ') NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf_cnpj` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Cliente_cpf_cnpj_key`(`cpf_cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Veiculo` (
    `id` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `marca` VARCHAR(191) NOT NULL,
    `ano` INTEGER NOT NULL,
    `tipo` ENUM('CAVALO_MECANICO', 'CARRETA', 'ONIBUS', 'UTILITARIO', 'CAMINHAO_LEVE') NOT NULL,
    `quilometragem` INTEGER NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `ultima_revisao` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Veiculo_placa_key`(`placa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrdemServico` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('ABERTA', 'EM_DIAGNOSTICO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'AGUARDANDO_APROVACAO', 'FINALIZADA', 'ENTREGUE', 'CANCELADA') NOT NULL DEFAULT 'ABERTA',
    `diagnostico` VARCHAR(191) NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `veiculo_id` VARCHAR(191) NOT NULL,
    `mecanico_id` VARCHAR(191) NULL,
    `valor_servicos` DOUBLE NOT NULL DEFAULT 0,
    `valor_pecas` DOUBLE NOT NULL DEFAULT 0,
    `valor_total` DOUBLE NOT NULL DEFAULT 0,
    `desconto` DOUBLE NOT NULL DEFAULT 0,
    `data_entrada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_previsao` DATETIME(3) NULL,
    `data_finalizada` DATETIME(3) NULL,
    `observacoes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OrdemServico_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicoOS` (
    `id` VARCHAR(191) NOT NULL,
    `os_id` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `horas` DOUBLE NOT NULL,
    `valor_hora` DOUBLE NOT NULL DEFAULT 0,
    `valor_total` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PecaAplicada` (
    `id` VARCHAR(191) NOT NULL,
    `os_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `quantidade` INTEGER NOT NULL,
    `valor_unit` DOUBLE NOT NULL,
    `valor_total` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Peca` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `fabricante` VARCHAR(191) NULL,
    `categoria` ENUM('MOTOR', 'INJECAO_ELETRONICA', 'TURBO', 'FREIOS', 'SUSPENSAO', 'TRANSMISSAO', 'FILTROS', 'OLEOS_LUBRIFICANTES', 'ARREFECIMENTO', 'ESCAPAMENTO', 'ELETRICA', 'OUTROS') NOT NULL,
    `quantidade` INTEGER NOT NULL DEFAULT 0,
    `estoque_minimo` INTEGER NOT NULL DEFAULT 5,
    `localizacao` VARCHAR(191) NULL,
    `preco_custo` DOUBLE NOT NULL,
    `preco_venda` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Peca_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimentacaoFinanceira` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `os_id` VARCHAR(191) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Veiculo` ADD CONSTRAINT `Veiculo_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServico` ADD CONSTRAINT `OrdemServico_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServico` ADD CONSTRAINT `OrdemServico_veiculo_id_fkey` FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServico` ADD CONSTRAINT `OrdemServico_mecanico_id_fkey` FOREIGN KEY (`mecanico_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicoOS` ADD CONSTRAINT `ServicoOS_os_id_fkey` FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecaAplicada` ADD CONSTRAINT `PecaAplicada_os_id_fkey` FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecaAplicada` ADD CONSTRAINT `PecaAplicada_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `Peca`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoFinanceira` ADD CONSTRAINT `MovimentacaoFinanceira_os_id_fkey` FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
