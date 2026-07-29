import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

// Rate limiting simples (em memória - para produção usar Redis)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Verificar rate limit
    const attempt = loginAttempts.get(ip);
    if (attempt) {
      if (attempt.lockUntil > Date.now()) {
        return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, { status: 429 });
      }
      if (attempt.count >= 5) {
        loginAttempts.set(ip, { count: attempt.count, lockUntil: Date.now() + 5 * 60 * 1000 });
        return NextResponse.json({ error: 'Conta bloqueada por 5 minutos.' }, { status: 429 });
      }
    }

    const body = await request.json();
    const { email, password } = body;
    
    // Verificar se a tabela User e as tabelas básicas existem
    let user;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (dbError: any) {
      const errorMsg = dbError.message || '';
      const code = dbError.code || '';
      
      let errorType = 'UNKNOWN';
      let friendlyMessage = 'Erro interno do banco de dados.';
      let statusCode = 500;

      // 1. Tabela Inexistente (P2021)
      if (code === 'P2021' || (errorMsg.includes('does not exist') && errorMsg.toLowerCase().includes('table'))) {
        errorType = 'TABLE_MISSING';
        friendlyMessage = 'Erro de Inicialização: Uma tabela necessária não existe no banco de dados. As migrations do Prisma podem estar ausentes.';
        statusCode = 503;
      }
      // 2. Coluna Inexistente (P2022)
      else if (code === 'P2022' || (errorMsg.includes('does not exist') && errorMsg.toLowerCase().includes('column'))) {
        errorType = 'COLUMN_MISSING';
        friendlyMessage = 'Erro de Estrutura: Uma coluna esperada pelo código não existe na tabela correspondente do banco de dados. Sincronize as migrations.';
        statusCode = 500;
      }
      // 3. Erro de Permissão (P1010)
      else if (code === 'P1010' || errorMsg.toLowerCase().includes('denied') || errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('privilege')) {
        errorType = 'PERMISSION_DENIED';
        friendlyMessage = 'Erro de Permissão: O usuário do banco de dados não possui as permissões necessárias para realizar esta operação.';
        statusCode = 403;
      }
      // 4. Erro de Conexão (P1001, P1002, etc.)
      else if (code.startsWith('P1') || errorMsg.toLowerCase().includes('connect') || errorMsg.toLowerCase().includes('reach') || errorMsg.toLowerCase().includes('timeout') || errorMsg.toLowerCase().includes('host')) {
        errorType = 'CONNECTION_ERROR';
        friendlyMessage = 'Erro de Conexão: Não foi possível estabelecer conexão com o banco de dados. Verifique a URL de conexão.';
        statusCode = 500;
      }
      // 5. Outros Erros do Prisma
      else if (code) {
        errorType = `PRISMA_${code}`;
        friendlyMessage = `Erro do Prisma (${code}): Houve um problema na interpretação ou execução da query no banco de dados.`;
        statusCode = 500;
      }

      console.error('========================================================================');
      console.error(`[ERRO NO BANCO DE DADOS] Tipo: ${errorType} | Código Prisma: ${code || 'N/A'}`);
      console.error('Mensagem Amigável:', friendlyMessage);
      console.error('Erro original completo:', dbError);
      console.error('========================================================================');

      return NextResponse.json({ 
        error: friendlyMessage,
        details: {
          type: errorType,
          code: code || null,
          message: errorMsg
        }
      }, { status: statusCode });
    }
    
    if (!user) {
      const current = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
      loginAttempts.set(ip, { count: current.count + 1, lockUntil: current.lockUntil });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      const current = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
      loginAttempts.set(ip, { count: current.count + 1, lockUntil: current.lockUntil });
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    
    // Se sucesso, resetar tentativas
    loginAttempts.delete(ip);

    const token = signToken({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      empresa_id: user.empresa_id || 'default'
    });
    
    // Criar resposta E setar cookie
    const response = NextResponse.json({ 
      success: true, 
      redirect: '/dashboard',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, empresa_id: user.empresa_id || 'default' }
    });
    
    // Cookie com opções robustas e seguras
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias (igual ao JWT)
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
