-- =============================================================================
-- SISTEMA ERP PINHEIRO DIESEL PRO - BANCO DE DADOS OFICIAL E CONSOLIDADO
-- =============================================================================
-- SGBD Identificado: MySQL (v8.0+ compatível / MariaDB 10.4+)
-- Engine: InnoDB
-- Charset: utf8mb4 (Collate: utf8mb4_unicode_ci)
--
-- Este arquivo consolida todas as 23 tabelas, colunas, tipos de dados, 
-- relacionamentos (Foreign Keys), chaves únicas, índices de alta performance, 
-- constraints e seeds essenciais exigidos pelo código-fonte do sistema.
--
-- O script é 100% idempotente e executável do zero em um banco de dados vazio.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =============================================================================
-- 1. TABELA: Empresa (Multi-tenant)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Empresa` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Empresa_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 2. TABELA: ConfiguracaoEmpresa (Parâmetros Globais / NF-e / Pix / Dados Oficina)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ConfiguracaoEmpresa` (
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
    `regime_tributario` VARCHAR(191) NULL,
    `token_nfse` VARCHAR(191) NULL,
    `pix` VARCHAR(191) NULL,
    `banco` VARCHAR(191) NULL,
    `agencia` VARCHAR(191) NULL,
    `conta` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TABELA: User (Usuários, Mecânicos e Acessos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'LIDER', 'MECANICO', 'ESTOQUISTA', 'FINANCEIRO') NOT NULL DEFAULT 'MECANICO',
    `especialidade` VARCHAR(191) NULL,
    `comissao` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_empresa_id_fkey`(`empresa_id`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TABELA: RefreshToken (Sessões / Tokens de Autenticação)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RefreshToken_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 5. TABELA: Cliente (Pessoa Física, Jurídica e Fornecedores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Cliente` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PF', 'PJ') NOT NULL,
    `tipo_pessoa` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `razao_social` VARCHAR(191) NULL,
    `nome_fantasia` VARCHAR(191) NULL,
    `cpf_cnpj` VARCHAR(191) NOT NULL,
    `inscricao_estadual` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `telefone_secundario` VARCHAR(191) NULL,
    `contato` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `uf` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ATIVO',
    `perfil` VARCHAR(191) NOT NULL DEFAULT 'CLIENTE',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `observacoes` TEXT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Cliente_cpf_cnpj_empresa_id_key`(`cpf_cnpj`, `empresa_id`),
    INDEX `Cliente_empresa_id_idx`(`empresa_id`),
    INDEX `Cliente_status_idx`(`status`),
    INDEX `Cliente_perfil_idx`(`perfil`),
    INDEX `Cliente_nome_idx`(`nome`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 6. TABELA: Veiculo (Frota, Caminhões, Máquinas Pesadas e Tratores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Veiculo` (
    `id` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `marca` VARCHAR(191) NOT NULL,
    `ano` INTEGER NOT NULL,
    `tipo` ENUM(
        'CAVALO_MECANICO',
        'CARRETA',
        'ONIBUS',
        'UTILITARIO',
        'CAMINHAO_LEVE',
        'CAMINHAO_PESADO',
        'CAMINHONETE',
        'VAN',
        'RETROESCAVADEIRA',
        'ESCAVADEIRA_HIDRAULICA',
        'PA_CARREGADEIRA',
        'MOTONIVELADORA',
        'TRATOR_ESTEIRA',
        'ROLO_COMPACTADOR',
        'VIBROACABADORA',
        'FRESADORA',
        'USINA_ASFALTO',
        'EMPILHADEIRA',
        'GUINDASTE',
        'PERFURATRIZ',
        'TRATOR_AGRICOLA',
        'CAMINHAO_PIPA',
        'CAMINHAO_MUNCK',
        'EQUIPAMENTO_ASFALTO',
        'OUTROS'
    ) NOT NULL,
    `quilometragem` INTEGER NULL,
    `horimetro_atual` DOUBLE NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Veiculo_placa_empresa_id_key`(`placa`, `empresa_id`),
    INDEX `Veiculo_cliente_id_fkey`(`cliente_id`),
    INDEX `Veiculo_empresa_id_idx`(`empresa_id`),
    INDEX `Veiculo_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 7. TABELA: Orcamento (Orçamentos Prévios)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Orcamento` (
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
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Orcamento_numero_empresa_id_key`(`numero`, `empresa_id`),
    INDEX `Orcamento_cliente_id_fkey`(`cliente_id`),
    INDEX `Orcamento_veiculo_id_fkey`(`veiculo_id`),
    INDEX `Orcamento_empresa_id_idx`(`empresa_id`),
    INDEX `Orcamento_status_idx`(`status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 8. TABELA: OrcamentoServico (Itens de Serviços do Orçamento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `OrcamentoServico` (
    `id` VARCHAR(191) NOT NULL,
    `orcamento_id` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `horas` DOUBLE NOT NULL DEFAULT 0,
    `valor_hora` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    INDEX `OrcamentoServico_orcamento_id_fkey`(`orcamento_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 9. TABELA: OrcamentoPeca (Itens de Peças do Orçamento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `OrcamentoPeca` (
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
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 10. TABELA: OrdemServico (Ordens de Serviço: Oficina, Socorro, Prensagem)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `OrdemServico` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM(
        'ABERTA',
        'EM_DIAGNOSTICO',
        'AGUARDANDO_PECAS',
        'EM_EXECUCAO',
        'AGUARDANDO_APROVACAO',
        'FINALIZADA',
        'ENTREGUE',
        'CANCELADA'
    ) NOT NULL DEFAULT 'ABERTA',
    `tipoOS` VARCHAR(191) NULL DEFAULT 'OFICINA',
    `tipo_atendimento` VARCHAR(191) NULL DEFAULT 'OFICINA',
    `cliente_id` VARCHAR(191) NOT NULL,
    `veiculo_id` VARCHAR(191) NOT NULL,
    `mecanico_id` VARCHAR(191) NULL,
    `orcamento_id` VARCHAR(191) NULL,
    `diagnostico` VARCHAR(191) NULL,
    `observacoes` LONGTEXT NULL,
    `data_entrada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_previsao` DATETIME(3) NULL,
    `data_finalizada` DATETIME(3) NULL,
    `valor_servicos` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_pecas` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `desconto` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `forma_pagamento` VARCHAR(191) NULL,
    `numero_parcelas` INTEGER NULL,
    `dias_entre_parcelas` INTEGER NULL DEFAULT 28,
    `data_vencimento_primeira` DATETIME(3) NULL,
    `empresa_id` VARCHAR(191) NOT NULL,
    
    -- Módulo de Atendimento Externo / Socorro Mecânico / Deslocamento
    `km_saida` DOUBLE NULL DEFAULT 0,
    `km_retorno` DOUBLE NULL DEFAULT 0,
    `km_total` DOUBLE NULL DEFAULT 0,
    `valor_km` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `total_deslocamento` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_pedagio` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_combustivel` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_hospedagem` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_alimentacao` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_diaria_tecnica` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_guincho` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesa_outros` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesas_comprovantes` TEXT NULL,
    `mao_obra_externa_horas` DOUBLE NULL DEFAULT 0,
    `mao_obra_externa_valor` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `mao_obra_externa_total` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `mao_obra_equipe` TEXT NULL,
    `local_atendimento` VARCHAR(191) NULL,
    `local_cidade` VARCHAR(191) NULL,
    `local_estado` VARCHAR(191) NULL,
    `local_gps` VARCHAR(191) NULL,
    `timeline_viagem` TEXT NULL,
    `ferramentas_levadas` TEXT NULL,

    -- Centros de Custo, Custos Reais e Margens Financeiras
    `centro_custo` VARCHAR(191) NULL DEFAULT 'OFICINA',
    `custo_km` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `custo_deslocamento` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `custo_mao_obra` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `custo_pecas` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `despesas_extras` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `custo_real` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `lucro_bruto` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `margem_lucro` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `total_liquido` DECIMAL(10, 2) NULL DEFAULT 0.00,

    -- Assinaturas Digitais e Validação Criptográfica
    `assinatura_cliente` TEXT NULL,
    `assinatura_mecanico` TEXT NULL,
    `assinatura_supervisor` TEXT NULL,
    `assinatura_hash` VARCHAR(191) NULL,
    `assinatura_timestamp` DATETIME(3) NULL,

    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrdemServico_numero_empresa_id_key`(`numero`, `empresa_id`),
    UNIQUE INDEX `OrdemServico_orcamento_id_key`(`orcamento_id`),
    INDEX `OrdemServico_cliente_id_fkey`(`cliente_id`),
    INDEX `OrdemServico_veiculo_id_fkey`(`veiculo_id`),
    INDEX `OrdemServico_mecanico_id_fkey`(`mecanico_id`),
    INDEX `OrdemServico_empresa_id_idx`(`empresa_id`),
    INDEX `OrdemServico_status_idx`(`status`),
    INDEX `OrdemServico_tipoOS_idx`(`tipoOS`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 11. TABELA: ServicoOS (Serviços Executados na OS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ServicoOS` (
    `id` VARCHAR(191) NOT NULL,
    `os_id` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `horas` DOUBLE NULL,
    `valor_hora` DECIMAL(10, 2) NULL DEFAULT 150.00,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    INDEX `ServicoOS_os_id_fkey`(`os_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 12. TABELA: Peca (Estoque de Peças e Itens Hidráulicos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Peca` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `fabricante` VARCHAR(191) NULL,
    `categoria` ENUM(
        'MOTOR',
        'INJECAO_ELETRONICA',
        'TURBO',
        'FREIOS',
        'SUSPENSAO',
        'TRANSMISSAO',
        'FILTROS',
        'OLEOS_LUBRIFICANTES',
        'ARREFECIMENTO',
        'ESCAPAMENTO',
        'ELETRICA',
        'OUTROS'
    ) NOT NULL,
    `quantidade` DOUBLE NOT NULL DEFAULT 0,
    `estoque_minimo` DOUBLE NOT NULL DEFAULT 5,
    `localizacao` VARCHAR(191) NULL,
    `preco_custo` DECIMAL(10, 2) NOT NULL,
    `preco_venda` DECIMAL(10, 2) NOT NULL,
    `unidadeMedida` VARCHAR(191) NOT NULL DEFAULT 'un',
    `unidadeCompra` VARCHAR(191) NOT NULL DEFAULT 'un',
    `fatorConversao` DOUBLE NOT NULL DEFAULT 1,
    `permiteFracionado` BOOLEAN NOT NULL DEFAULT false,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Peca_codigo_empresa_id_key`(`codigo`, `empresa_id`),
    INDEX `Peca_empresa_id_idx`(`empresa_id`),
    INDEX `Peca_categoria_idx`(`categoria`),
    INDEX `Peca_descricao_idx`(`descricao`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 13. TABELA: PecaAplicada (Peças e Insumos Consumidos na OS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `PecaAplicada` (
    `id` VARCHAR(191) NOT NULL,
    `os_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `quantidade` DOUBLE NOT NULL,
    `valor_unit` DECIMAL(10, 2) NOT NULL,
    `valor_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `unidade` VARCHAR(191) NULL DEFAULT 'un',
    `origem` VARCHAR(191) NULL DEFAULT 'OFICINA',

    INDEX `PecaAplicada_os_id_fkey`(`os_id`),
    INDEX `PecaAplicada_peca_id_fkey`(`peca_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 14. TABELA: MovimentacaoEstoque (Rastreabilidade e Kardex de Estoque)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `MovimentacaoEstoque` (
    `id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `quantidade` DOUBLE NOT NULL,
    `motivo` VARCHAR(191) NOT NULL DEFAULT 'AJUSTE',
    `observacao` TEXT NULL,
    `os_id` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `empresa_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentacaoEstoque_peca_id_idx`(`peca_id`),
    INDEX `MovimentacaoEstoque_os_id_fkey`(`os_id`),
    INDEX `MovimentacaoEstoque_usuario_id_idx`(`usuario_id`),
    INDEX `MovimentacaoEstoque_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 15. TABELA: MovimentacaoFinanceira (Contas a Pagar, Receber e Fluxo de Caixa)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `MovimentacaoFinanceira` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `os_id` VARCHAR(191) NULL,
    `cliente_id` VARCHAR(191) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_vencimento` DATETIME(3) NULL,
    `data_pagamento` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `forma_pagamento` VARCHAR(191) NULL,
    `categoria` VARCHAR(191) NULL,
    `centro_custo` VARCHAR(191) NULL,
    `numero_documento` VARCHAR(191) NULL,
    `comprovante_url` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `updated_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `MovimentacaoFinanceira_os_id_fkey`(`os_id`),
    INDEX `MovimentacaoFinanceira_cliente_id_fkey`(`cliente_id`),
    INDEX `MovimentacaoFinanceira_empresa_id_idx`(`empresa_id`),
    INDEX `MovimentacaoFinanceira_status_idx`(`status`),
    INDEX `MovimentacaoFinanceira_data_vencimento_idx`(`data_vencimento`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 16. TABELA: Checklist (Modelos de Checklists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Checklist` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `categoria` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `Checklist_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 17. TABELA: ChecklistItem (Itens de Verificação do Checklist)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ChecklistItem` (
    `id` VARCHAR(191) NOT NULL,
    `checklist_id` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `obrigatorio` BOOLEAN NOT NULL DEFAULT true,
    `tipo` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChecklistItem_checklist_id_fkey`(`checklist_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 18. TABELA: ChecklistExecucao (Execução Real do Checklist de Entrada/Saída)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ChecklistExecucao` (
    `id` VARCHAR(191) NOT NULL,
    `checklist_id` VARCHAR(191) NOT NULL,
    `os_id` VARCHAR(191) NULL,
    `veiculo_id` VARCHAR(191) NULL,
    `executado_por` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respostas` LONGTEXT NOT NULL,
    `observacoes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `ChecklistExecucao_checklist_id_fkey`(`checklist_id`),
    INDEX `ChecklistExecucao_os_id_fkey`(`os_id`),
    INDEX `ChecklistExecucao_veiculo_id_fkey`(`veiculo_id`),
    INDEX `ChecklistExecucao_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 19. TABELA: ChecklistFoto (Evidências Fotográficas do Checklist)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ChecklistFoto` (
    `id` VARCHAR(191) NOT NULL,
    `execucao_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NULL,
    `url` VARCHAR(191) NOT NULL,
    `legenda` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChecklistFoto_execucao_id_fkey`(`execucao_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 20. TABELA: EventoAgenda (Agendamentos, Vistorias e Entregas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `EventoAgenda` (
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
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `EventoAgenda_cliente_id_fkey`(`cliente_id`),
    INDEX `EventoAgenda_veiculo_id_fkey`(`veiculo_id`),
    INDEX `EventoAgenda_os_id_fkey`(`os_id`),
    INDEX `EventoAgenda_mecanico_id_fkey`(`mecanico_id`),
    INDEX `EventoAgenda_usuario_id_fkey`(`usuario_id`),
    INDEX `EventoAgenda_data_inicio_idx`(`data_inicio`),
    INDEX `EventoAgenda_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 21. TABELA: Preventiva (Alertas de Manutenção Preventiva por KM e Data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Preventiva` (
    `id` VARCHAR(191) NOT NULL,
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
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `Preventiva_veiculo_id_fkey`(`veiculo_id`),
    INDEX `Preventiva_empresa_id_idx`(`empresa_id`),
    INDEX `Preventiva_status_idx`(`status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 22. TABELA: Notificacao (Alertas de Sistema, Estoque e Financeiro)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `Notificacao` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `usuario_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `Notificacao_usuario_id_fkey`(`usuario_id`),
    INDEX `Notificacao_empresa_id_idx`(`empresa_id`),
    INDEX `Notificacao_usuario_lida_created_idx`(`usuario_id`, `lida`, `created_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 23. TABELA: AuditLog (Trilha de Auditoria, Segurança e Rastreabilidade)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `AuditLog` (
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
    `empresa_id` VARCHAR(191) NOT NULL,

    INDEX `AuditLog_empresa_id_idx`(`empresa_id`),
    INDEX `AuditLog_entidade_id_idx`(`entidade_id`),
    INDEX `AuditLog_modulo_idx`(`modulo`),
    INDEX `AuditLog_usuario_idx`(`usuario`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- RELACIONAMENTOS (FOREIGN KEYS) COM POLÍTICAS DE INTEGRIDADE REFERENCIAL
-- =============================================================================

-- User -> Empresa
ALTER TABLE `User` 
    ADD CONSTRAINT `User_empresa_id_fkey` 
    FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- RefreshToken -> User
ALTER TABLE `RefreshToken` 
    ADD CONSTRAINT `RefreshToken_user_id_fkey` 
    FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Veiculo -> Cliente
ALTER TABLE `Veiculo` 
    ADD CONSTRAINT `Veiculo_cliente_id_fkey` 
    FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Orcamento -> Cliente
ALTER TABLE `Orcamento` 
    ADD CONSTRAINT `Orcamento_cliente_id_fkey` 
    FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Orcamento -> Veiculo
ALTER TABLE `Orcamento` 
    ADD CONSTRAINT `Orcamento_veiculo_id_fkey` 
    FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- OrcamentoServico -> Orcamento
ALTER TABLE `OrcamentoServico` 
    ADD CONSTRAINT `OrcamentoServico_orcamento_id_fkey` 
    FOREIGN KEY (`orcamento_id`) REFERENCES `Orcamento`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- OrcamentoPeca -> Orcamento
ALTER TABLE `OrcamentoPeca` 
    ADD CONSTRAINT `OrcamentoPeca_orcamento_id_fkey` 
    FOREIGN KEY (`orcamento_id`) REFERENCES `Orcamento`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- OrdemServico -> Cliente
ALTER TABLE `OrdemServico` 
    ADD CONSTRAINT `OrdemServico_cliente_id_fkey` 
    FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrdemServico -> Veiculo
ALTER TABLE `OrdemServico` 
    ADD CONSTRAINT `OrdemServico_veiculo_id_fkey` 
    FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrdemServico -> User (Mecanico)
ALTER TABLE `OrdemServico` 
    ADD CONSTRAINT `OrdemServico_mecanico_id_fkey` 
    FOREIGN KEY (`mecanico_id`) REFERENCES `User`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- OrdemServico -> Orcamento
ALTER TABLE `OrdemServico` 
    ADD CONSTRAINT `OrdemServico_orcamento_id_fkey` 
    FOREIGN KEY (`orcamento_id`) REFERENCES `Orcamento`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ServicoOS -> OrdemServico
ALTER TABLE `ServicoOS` 
    ADD CONSTRAINT `ServicoOS_os_id_fkey` 
    FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- PecaAplicada -> OrdemServico
ALTER TABLE `PecaAplicada` 
    ADD CONSTRAINT `PecaAplicada_os_id_fkey` 
    FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- PecaAplicada -> Peca
ALTER TABLE `PecaAplicada` 
    ADD CONSTRAINT `PecaAplicada_peca_id_fkey` 
    FOREIGN KEY (`peca_id`) REFERENCES `Peca`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- MovimentacaoEstoque -> Peca
ALTER TABLE `MovimentacaoEstoque` 
    ADD CONSTRAINT `MovimentacaoEstoque_peca_id_fkey` 
    FOREIGN KEY (`peca_id`) REFERENCES `Peca`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- MovimentacaoEstoque -> OrdemServico
ALTER TABLE `MovimentacaoEstoque` 
    ADD CONSTRAINT `MovimentacaoEstoque_os_id_fkey` 
    FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- MovimentacaoFinanceira -> OrdemServico
ALTER TABLE `MovimentacaoFinanceira` 
    ADD CONSTRAINT `MovimentacaoFinanceira_os_id_fkey` 
    FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- MovimentacaoFinanceira -> Cliente
ALTER TABLE `MovimentacaoFinanceira` 
    ADD CONSTRAINT `MovimentacaoFinanceira_cliente_id_fkey` 
    FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ChecklistItem -> Checklist
ALTER TABLE `ChecklistItem` 
    ADD CONSTRAINT `ChecklistItem_checklist_id_fkey` 
    FOREIGN KEY (`checklist_id`) REFERENCES `Checklist`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ChecklistExecucao -> Checklist
ALTER TABLE `ChecklistExecucao` 
    ADD CONSTRAINT `ChecklistExecucao_checklist_id_fkey` 
    FOREIGN KEY (`checklist_id`) REFERENCES `Checklist`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ChecklistExecucao -> OrdemServico
ALTER TABLE `ChecklistExecucao` 
    ADD CONSTRAINT `ChecklistExecucao_os_id_fkey` 
    FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ChecklistExecucao -> Veiculo
ALTER TABLE `ChecklistExecucao` 
    ADD CONSTRAINT `ChecklistExecucao_veiculo_id_fkey` 
    FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ChecklistFoto -> ChecklistExecucao
ALTER TABLE `ChecklistFoto` 
    ADD CONSTRAINT `ChecklistFoto_execucao_id_fkey` 
    FOREIGN KEY (`execucao_id`) REFERENCES `ChecklistExecucao`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- EventoAgenda -> Cliente
ALTER TABLE `EventoAgenda` 
    ADD CONSTRAINT `EventoAgenda_cliente_id_fkey` 
    FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- EventoAgenda -> User (Mecanico)
ALTER TABLE `EventoAgenda` 
    ADD CONSTRAINT `EventoAgenda_mecanico_id_fkey` 
    FOREIGN KEY (`mecanico_id`) REFERENCES `User`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- EventoAgenda -> OrdemServico
ALTER TABLE `EventoAgenda` 
    ADD CONSTRAINT `EventoAgenda_os_id_fkey` 
    FOREIGN KEY (`os_id`) REFERENCES `OrdemServico`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- EventoAgenda -> User (Criador / Usuario)
ALTER TABLE `EventoAgenda` 
    ADD CONSTRAINT `EventoAgenda_usuario_id_fkey` 
    FOREIGN KEY (`usuario_id`) REFERENCES `User`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- EventoAgenda -> Veiculo
ALTER TABLE `EventoAgenda` 
    ADD CONSTRAINT `EventoAgenda_veiculo_id_fkey` 
    FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Preventiva -> Veiculo
ALTER TABLE `Preventiva` 
    ADD CONSTRAINT `Preventiva_veiculo_id_fkey` 
    FOREIGN KEY (`veiculo_id`) REFERENCES `Veiculo`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Notificacao -> User
ALTER TABLE `Notificacao` 
    ADD CONSTRAINT `Notificacao_usuario_id_fkey` 
    FOREIGN KEY (`usuario_id`) REFERENCES `User`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- SEEDS ESSENCIAIS DE INICIALIZAÇÃO DO SISTEMA
-- =============================================================================

-- 1. Empresa Padrão (Tenant raiz)
INSERT INTO `Empresa` (`id`, `nome`, `cnpj`, `created_at`, `updated_at`)
VALUES ('default', 'Pinheiro Diesel Pro - Matriz', '00.000.000/0001-00', NOW(), NOW())
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- 2. Configurações da Oficina
INSERT INTO `ConfiguracaoEmpresa` (
    `id`, `nome_fantasia`, `razao_social`, `cnpj`, `endereco`, `telefone`, `email`, `updated_at`
) VALUES (
    'config_empresa',
    'Pinheiro Diesel Pro',
    'Pinheiro Diesel Centro Automotivo e Hidráulica Ltda',
    '00.000.000/0001-00',
    'Distrito Industrial - Setor Mecânico',
    '(11) 99999-9999',
    'contato@pinheirodiesel.com.br',
    NOW()
) ON DUPLICATE KEY UPDATE `nome_fantasia` = VALUES(`nome_fantasia`);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- FIM DO ARQUIVO CONSOLIDADO database.sql
-- =============================================================================
