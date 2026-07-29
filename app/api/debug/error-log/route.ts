import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.error('────────────────────────────────────────────────────────');
    console.error('🚨 CLIENT ERROR REPORTED FROM DEVICE:', body.userAgent || 'Unknown Device');
    console.error('❌ Error Message:', body.message);
    console.error('🔗 URL:', body.url);
    console.error('📍 Location:', `${body.filename || 'Unknown file'}:${body.lineno || '?'}:${body.colno || '?'}`);
    if (body.stack) {
      console.error('🥞 Stack Trace:');
      console.error(body.stack);
    }
    console.error('────────────────────────────────────────────────────────');

    log('ERROR', 'CLIENT', `Client error: ${body.message}`, {
      url: body.url,
      stack: body.stack,
      location: `${body.filename}:${body.lineno}:${body.colno}`,
      userAgent: body.userAgent
    }, 'client-monitor');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to log client error:', err);
    return NextResponse.json({ success: false });
  }
}
