import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (user.role !== 'ADMIN') {
      log('WARN', 'SISTEMA', 'Tentativa de execução de migração por usuário comum', { userId: user.id }, user.name);
      return NextResponse.json({ error: 'Apenas administradores podem executar migrações' }, { status: 403 });
    }

    log('INFO', 'SISTEMA', 'Iniciando migração manual via API', { userId: user.id }, user.name);

    // SQL for MySQL migration
    const sqlCommands = [
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS data_vencimento DATETIME(3) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS data_pagamento DATETIME(3) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS status VARCHAR(191) NOT NULL DEFAULT 'PENDENTE'`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(191) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS categoria VARCHAR(191) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS centro_custo VARCHAR(191) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(191) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS comprovante_url VARCHAR(191) NULL`,
      `ALTER TABLE MovimentacaoFinanceira ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(191) NULL`
    ];

    const results = [];

    // Execute core column additions
    for (const sql of sqlCommands) {
      try {
        await prisma.$executeRawUnsafe(sql);
        results.push({ sql: sql.substring(0, 50) + '...', status: 'SUCESSO' });
      } catch (err: any) {
        // Ignore "column already exists" errors
        results.push({ sql: sql.substring(0, 50) + '...', status: 'AVISO/ERRO', detail: err.message });
      }
    }

    // Add Foreign Key (wrapped in try-catch to avoid duplicate constraint errors)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE MovimentacaoFinanceira 
        ADD CONSTRAINT fk_movimentacao_cliente 
        FOREIGN KEY (cliente_id) REFERENCES Cliente(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      results.push({ sql: 'ADD CONSTRAINT fk_movimentacao_cliente', status: 'SUCESSO' });
    } catch (err: any) {
      results.push({ sql: 'ADD CONSTRAINT fk_movimentacao_cliente', status: 'JÁ EXISTE OU ERRO', detail: err.message });
    }

    return NextResponse.json({
      message: 'Processo de migração concluído. Verifique os resultados abaixo.',
      results
    });

  } catch (error: any) {
    console.error('Falha crítica na migração:', error);
    return NextResponse.json({ 
      error: 'Falha ao executar migração', 
      detail: error.message 
    }, { status: 500 });
  }
}
