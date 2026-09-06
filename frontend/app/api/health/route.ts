import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        { status: 'unhealthy', database: 'disconnected', error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: 'healthy', database: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { status: 'unhealthy', database: 'error', error: message },
      { status: 500 }
    );
  }
}
