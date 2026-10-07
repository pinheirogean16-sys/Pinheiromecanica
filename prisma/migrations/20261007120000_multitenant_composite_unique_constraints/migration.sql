-- Drop legacy global unique indexes
ALTER TABLE `Cliente` DROP INDEX `Cliente_cpf_cnpj_key`;
ALTER TABLE `Veiculo` DROP INDEX `Veiculo_placa_key`;
ALTER TABLE `OrdemServico` DROP INDEX `OrdemServico_numero_key`;

-- Create composite multi-tenant unique indexes matching Prisma schema
CREATE UNIQUE INDEX `Cliente_cpf_cnpj_empresa_id_key` ON `Cliente`(`cpf_cnpj`, `empresa_id`);
CREATE UNIQUE INDEX `Veiculo_placa_empresa_id_key` ON `Veiculo`(`placa`, `empresa_id`);
CREATE UNIQUE INDEX `OrdemServico_numero_empresa_id_key` ON `OrdemServico`(`numero`, `empresa_id`);
