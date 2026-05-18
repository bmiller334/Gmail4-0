import { NextResponse } from 'next/server';
import { getHistoricalStats, getTopSpammers } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30'; // e.g. 7, 30, 90, 365
    const days = parseInt(range, 10);
    
    try {
        const [historicalStats, topSpammers] = await Promise.all([
            getHistoricalStats(days),
            getTopSpammers(30)
        ]);

        return NextResponse.json({ 
            historicalStats,
            topSpammers
        });
    } catch (error) {
        console.error("Error in advanced-stats API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
