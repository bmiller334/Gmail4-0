import { NextResponse } from 'next/server';
import { getRecentErrorLogs } from '@/lib/logging-service';

export async function GET() {
  // Revalidate every 60 seconds (or less if you want fresher logs)
  // This prevents hitting the Logging API quota too hard.
  
  try {
      const logs = await getRecentErrorLogs(5); // Get last 5 errors
      return NextResponse.json({ logs });
  } catch (error) {
      return NextResponse.json({ logs: [] }, { status: 500 });
  }
}
