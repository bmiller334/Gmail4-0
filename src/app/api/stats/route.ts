import { NextResponse } from 'next/server';
import { getStats, getRecentLogs, getSenderRules } from '@/lib/db-service';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    
    try {
        const [todayStats, weeklyStats, logs, insights, rules] = await Promise.all([
            getStats(1), // Today
            getStats(7), // Last 7 days
            getRecentLogs(50, { search, category }),
            Promise.resolve([]), // Placeholder for AI insights logic
            getSenderRules()
        ]);

        return NextResponse.json({ 
            stats: todayStats,
            weeklyStats,
            logs, 
            insights,
            rules
        });
    } catch (error) {
        console.error("Error in stats API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
