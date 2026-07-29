/**
 * NEXT.JS BOOTSTRAP INSTRUMENTATION & AUDIT HOOK
 * 
 * Este arquivo é executado de forma garantida na primeira inicialização do servidor Next.js,
 * independente de a Hostinger iniciar via `server.js` na raiz, via `.next/standalone/server.js`
 * ou via comando `next start`. Ele realiza a auditoria e as migrações do banco de dados MySQL de forma segura.
 */

export async function register() {
  // Garantir que roda apenas no runtime do servidor Node.js
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('========================================================================');
    console.log('===       ARQUIVO DE ENTRADA EXECUTADO (INSTRUMENTATION HOOK)       ===');
    console.log('========================================================================');
    
    // Evitar execução múltipla no mesmo ciclo se já executado anteriormente
    if (process.env.MIGRATIONS_ALREADY_RUN === 'true') {
      console.log('ℹ️ As migrações já foram validadas/executadas neste processo. Ignorando re-execução.');
      return;
    }

    try {
      // Imports dinâmicos seguros para não causar problemas em compilações Edge
      const { execSync } = await import('child_process');
      const path = await import('path');
      const fs = await import('fs');

      const dbUrl = process.env.DATABASE_URL;

      // 1. Auditoria de DATABASE_URL
      if (!dbUrl) {
        console.error('========================================================================');
        console.error('❌ ERRO CRÍTICO NA INICIALIZAÇÃO: DATABASE_URL NÃO DEFINIDA!');
        console.error('Por favor, defina a variável DATABASE_URL no painel da Hostinger.');
        console.error('========================================================================');
        return;
      }

      // Função segura de máscara de credenciais nos logs
      let maskedUrl = dbUrl;
      let host = 'não identificado';
      let port = '3306';
      let user = 'não identificado';
      let dbName = 'não identificado';
      let password = '';

      try {
        const parsed = new URL(dbUrl);
        maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':******@');
        host = parsed.hostname;
        port = parsed.port || '3306';
        user = parsed.username;
        dbName = parsed.pathname.replace(/^\//, '');
        password = parsed.password;
      } catch (err) {
        const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?#]+)/);
        if (match) {
          maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':******@');
          host = match[3];
          port = match[4] || '3306';
          user = match[1];
          dbName = match[5];
          password = match[2];
        }
      }

      console.log('========================================================================');
      console.log('AUDITORIA DE AMBIENTE E CONEXÃO (HOSTINGER / PRODUÇÃO):');
      console.log(`- URL Mascarada:  ${maskedUrl}`);
      console.log(`- Servidor Host:  ${host}`);
      console.log(`- Porta TCP:      ${port}`);
      console.log(`- Banco de Dados: ${dbName}`);
      console.log(`- Usuário MySQL:  ${user}`);
      console.log('========================================================================');

      // 2. Teste Avançado de Conexão usando o driver mysql2
      try {
        const mysql = await import('mysql2/promise');
        console.log('Iniciando teste de comunicação direta via socket TCP com MySQL...');
        
        const connection = await mysql.createConnection({
          host,
          port: parseInt(port),
          user,
          password,
          database: dbName,
          connectTimeout: 8000,
        });

        console.log('✅ Conexão TCP direta com o MySQL estabelecida com sucesso!');

        // Confirmar privilégios e verificar se as tabelas existem
        const [dbRows] = await connection.query('SELECT DATABASE() as activeDb') as any[];
        console.log(`✅ Banco de dados selecionado ativo: ${dbRows[0]?.activeDb || dbName}`);

        // Verificar tabelas existentes antes de aplicar as migrations
        const [tables] = await connection.query('SHOW TABLES') as any[];
        console.log(`📊 Tabelas atualmente existentes no banco de dados: ${tables.length}`);
        
        if (tables.length > 0) {
          console.log('Tabelas existentes listadas:');
          tables.forEach((t: any) => {
            console.log(`   - ${Object.values(t)[0]}`);
          });
        } else {
          console.log('ℹ️ O banco de dados está vazio. Nenhuma tabela encontrada.');
        }

        await connection.end();
      } catch (dbConnErr: any) {
        console.error('========================================================================');
        console.error('⚠️ ALERTA: FALHA NO TESTE DE CONEXÃO DIRETA COM O MYSQL!');
        console.error('Mensagem de erro:', dbConnErr.message);
        console.error('Código:', dbConnErr.code);
        console.error('Causa comum na Hostinger: DATABASE_URL incorreta ou acesso remoto bloqueado.');
        console.error('A aplicação continuará a inicialização, mas as migrations podem falhar.');
        console.error('========================================================================');
      }

      // 3. Execução das migrations do Prisma de forma segura e tratada
      console.log('\n==========================');
      console.log('INICIANDO PRISMA MIGRATE');
      console.log('==========================');

      try {
        console.log('Executando: "npx prisma migrate deploy"...');
        // Usar stdio: 'pipe' para capturar o log exato de migração
        const migrateOutput = execSync('npx prisma migrate deploy', {
          env: process.env,
          stdio: 'pipe',
        }).toString();

        console.log('------------------------------------------------------------------------');
        console.log(migrateOutput.trim());
        console.log('------------------------------------------------------------------------');

        if (migrateOutput.includes('No pending migrations to apply.')) {
          console.log('==========================');
          console.log('NENHUMA MIGRATION PENDENTE');
          console.log('==========================');
        } else {
          console.log('==========================');
          console.log('MIGRATIONS EXECUTADAS');
          console.log('==========================');
        }

        // Marcar que as migrações já foram tratadas nesta instância de processo
        process.env.MIGRATIONS_ALREADY_RUN = 'true';
      } catch (migError: any) {
        console.error('========================================================================');
        console.error('❌ ERRO CRÍTICO AO EXECUTAR PRISMA MIGRATE DEPLOY:');
        console.error(migError.message);
        if (migError.stdout) {
          console.error('\nStdout do comando:\n', migError.stdout.toString());
        }
        if (migError.stderr) {
          console.error('\nStderr do comando:\n', migError.stderr.toString());
        }
        console.error('Causa provável: Falha de conexão na execução do CLI Prisma, ou migrations corrompidas.');
        console.error('========================================================================');
      }

      console.log('\n==========================');
      console.log('INICIANDO NEXT.JS');
      console.log('==========================');

    } catch (bootstrapErr: any) {
      console.error('========================================================================');
      console.error('❌ ERRO EXCEÇÃO NÃO TRATADA DURANTE O BOOTSTRAP INSTRUMENTATION:');
      console.error(bootstrapErr);
      console.error('========================================================================');
    }
  }
}
