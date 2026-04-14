import { NextResponse } from 'next/server';
import { getWatchStatus } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getWatchStatus();
    
    return NextResponse.json({
        success: true,
        status: status || { expired: true, message: "No watch established" }
    });
  } catch (error: any) {
    return NextResponse.json({ 
        success: false, 
        error: error.message 
    }, { status: 500 });
  }
}
