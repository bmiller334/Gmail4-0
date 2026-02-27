import { NextResponse } from 'next/server';
import { getSystemLogs } from '@/lib/logging-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const pageToken = searchParams.get('pageToken') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
      const { logs, nextPageToken } = await getSystemLogs(limit, pageToken, search);
      return NextResponse.json({ logs, nextPageToken });
  } catch (error) {
      return NextResponse.json({ logs: [], error: 'Failed' }, { status: 500 });
  }
}
