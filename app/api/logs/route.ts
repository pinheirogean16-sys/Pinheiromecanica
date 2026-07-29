import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hasPermission = checkPermission(session, 'sistema', 'visualizar');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const modulo = searchParams.get('modulo');
    const skip_pagination = searchParams.get('skip_pagination') === 'true';

    const where: any = {};
    if (modulo && modulo !== 'TODOS') {
      where.modulo = modulo;
    }

    if (skip_pagination) {
       const items = await prisma.auditLog.findMany({
         where,
         orderBy: { created_at: 'desc' }
       });
       return NextResponse.json({ items });
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.auditLog.count({ where })
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
