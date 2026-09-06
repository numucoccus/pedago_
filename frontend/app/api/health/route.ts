import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          service: '@pedago/frontend',
          database: 'disconnected',
          error: error.message,
          timestamp: new Date().toISOString(),
          version: '0.1.0',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        service: '@pedago/frontend',
        database: 'connected',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: '@pedago/frontend',
        database: 'error',
        error: message,
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      },
      { status: 500 }
    );
  }
}
