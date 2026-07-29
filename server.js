/**
 * AUDITED APPLICATION STARTUP & DIAGNOSTIC WRAPPER
 * 
 * Este arquivo funciona como o ponto de entrada principal (Startup File) em ambientes de produção
 * como a Hostinger, garantindo a execução robusta das migrations do Prisma e auditoria completa
 * das credenciais de banco de dados antes da inicialização do Next.js.
 */

const { execSync, fork } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('========================================================================');
console.log('       INICIANDO AUDITORIA DO PIPELINE DE DEPLOY & BANCO DE DADOS       ');
console.log('========================================================================');

// 1. Carregar variáveis de ambiente do .env local (se existir) como fallback/segurança
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const parts = trimmed.split('=');
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Variáveis adicionais carregadas com sucesso a partir de arquivo .env');
  } catch (e) {
    console.error('⚠️ Aviso ao ler o arquivo .env:', e.message);
  }
}

// 2. Auxiliar para mascarar a senha da URL do banco nos logs
function parseAndMaskDatabaseUrl(dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    return {
      maskedUrl: dbUrl.replace(/:([^:@]+)@/, ':******@'),
      host: parsed.hostname,
      port: parsed.port || '3306',
      user: parsed.username,
      database: parsed.pathname.replace(/^\//, ''),
      password: parsed.password
    };
  } catch (err) {
    // Fallback manual se a URL for malformada ou não-padrão (ex: sem protocolo)
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
    if (match) {
      return {
        maskedUrl: dbUrl.replace(/:([^:@]+)@/, ':******@'),
        host: match[3],
        port: match[4] || '3306',
        user: match[1],
        database: match[5],
        password: match[2]
      };
    }
    return null;
  }
}

async function runAuditAndBoot() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('========================================================================');
    console.error('❌ ERRO CRÍTICO: DATABASE_URL NÃO DEFINIDA!');
    console.error('Verifique o painel de variáveis de ambiente na Hostinger / AI Studio.');
    console.error('========================================================================');
  } else {
    const parsed = parseAndMaskDatabaseUrl(dbUrl);
    if (parsed) {
      console.log('========================================================================');
      console.log('AUDITORIA DE DATABASE_URL (SEGURA - SEM SENHA):');
      console.log(`- URL Mascarada:  ${parsed.maskedUrl}`);
      console.log(`- Hostname:      ${parsed.host}`);
      console.log(`- Porta:         ${parsed.port}`);
      console.log(`- Banco de Dados:${parsed.database}`);
      console.log(`- Usuário:       ${parsed.user}`);
      console.log('========================================================================');

      // Testar conexão direta usando o drive mysql2 do projeto
      try {
        const mysql = require('mysql2/promise');
        console.log('Iniciando teste de conexão TCP e validação de privilégios com o MySQL...');
        
        const connection = await mysql.createConnection({
          host: parsed.host,
          port: parseInt(parsed.port),
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          connectTimeout: 6000,
        });

        console.log('✅ Conexão TCP com o banco estabelecida com sucesso!');

        // Confirmar privilégios e existência do banco
        try {
          const [dbRows] = await connection.query('SELECT DATABASE() as activeDb');
          console.log(`✅ Banco de dados ativo confirmado: ${dbRows[0].activeDb || parsed.database}`);

          // Consultar privilégios
          try {
            const [grants] = await connection.query('SHOW GRANTS');
            console.log('✅ Permissões do usuário validadas. Privilégios detectados:');
            grants.forEach(g => {
              const grantText = Object.values(g)[0];
              console.log(`   - ${grantText}`);
            });
          } catch (grantErr) {
            console.log('⚠️ Aviso: Privilégios detalhados não puderam ser listados via SHOW GRANTS (comum em hosts compartilhados).');
          }

          // Verificar tabelas existentes
          const [tables] = await connection.query('SHOW TABLES');
          console.log(`📊 Total de tabelas atualmente existentes no banco de dados: ${tables.length}`);
          if (tables.length > 0) {
            console.log('Tabelas encontradas:');
            tables.forEach(t => {
              console.log(`   - ${Object.values(t)[0]}`);
            });
          } else {
            console.log('ℹ️ O banco de dados está completamente vazio. Preparado para receber migrações.');
          }

        } catch (queryErr) {
          console.error('❌ Erro durante a query de diagnóstico:', queryErr.message);
        } finally {
          await connection.end();
        }
      } catch (connErr) {
        console.error('========================================================================');
        console.error('❌ ERRO AO CONECTAR DIRETAMENTE AO MYSQL:');
        console.error('Mensagem:', connErr.message);
        console.error('Código do erro:', connErr.code);
        console.error('Causa provável: Hostname/Porta errados, senha incorreta ou falta de liberação de IP.');
        console.error('========================================================================');
      }
    } else {
      console.error('⚠️ Aviso: Não foi possível realizar o parse estruturado da DATABASE_URL para diagnósticos avançados.');
    }
  }

  // 3. Execução segura e auditada do Prisma Migrate Deploy
  console.log('\n==========================');
  console.log('INICIANDO PRISMA MIGRATE');
  console.log('==========================');

  let migrationsSuccess = false;
  try {
    console.log('Executando "npx prisma migrate deploy"...');
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
    migrationsSuccess = true;
  } catch (migError) {
    console.error('========================================================================');
    console.error('❌ ERRO CRÍTICO NA EXECUÇÃO DO PRISMA MIGRATE DEPLOY:');
    console.error(migError.message);
    if (migError.stdout) {
      console.error('\nStdout do Prisma:\n', migError.stdout.toString());
    }
    if (migError.stderr) {
      console.error('\nStderr do Prisma:\n', migError.stderr.toString());
    }
    console.error('A aplicação prosseguirá a inicialização, mas pode encontrar instabilidades.');
    console.error('========================================================================');
  }

  // 4. Inicialização do Servidor Next.js
  console.log('\n==========================');
  console.log('INICIANDO NEXT.JS');
  console.log('==========================');

  const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
  
  if (fs.existsSync(standalonePath)) {
    console.log('🚀 Executando no modo STANDALONE de produção...');
    
    // Fork é ideal para herdar stdio perfeitamente e rodar de forma isolada
    const child = fork(standalonePath, [], {
      env: process.env,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      console.log(`[Next.js] Processo finalizado com código de saída: ${code}`);
      process.exit(code);
    });
  } else {
    console.log('⚠️ Modo Standalone não encontrado localmente.');
    console.log('🚀 Iniciando servidor via "next start" padrão...');
    
    const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    
    const child = fork(nextBin, ['start', '-p', process.env.PORT || '3000'], {
      env: process.env,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      console.log(`[Next.js] Processo finalizado com código de saída: ${code}`);
      process.exit(code);
    });
  }
}

runAuditAndBoot().catch(err => {
  console.error('========================================================================');
  console.error('❌ FALHA IMPREVISTA NA INICIALIZAÇÃO DO SERVER WRAPPER:');
  console.error(err);
  console.error('========================================================================');
  process.exit(1);
});
