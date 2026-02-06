import { NextResponse } from 'next/server';
import { getSystemLogs } from '@/lib/logging-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const pageToken = searchParams.get('pageToken') || undefined;

  try {
      const { logs, nextPageToken } = await getSystemLogs(limit, pageToken);
      return NextResponse.json({ logs, nextPageToken });
  } catch (error) {
      return NextResponse.json({ logs: [], error: 'Failed to fetch logs' }, { status: 500 });
  }
}
