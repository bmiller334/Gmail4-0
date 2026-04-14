import { NextResponse } from 'next/server';
import { getStats, getRecentLogs, getSenderRules, getWatchStatus } from '@/lib/db-service';
import { getInboxCount } from '@/lib/gmail-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    
    try {
        const [todayStats, weeklyStats, logs, insights, rules, inboxCount, watchStatus] = await Promise.all([
            getStats(1), // Today
            getStats(7), // Last 7 days
            getRecentLogs(50, { search, category }),
            Promise.resolve([]), // Placeholder for AI insights logic
            getSenderRules(),
            getInboxCount(),
            getWatchStatus()
        ]);

        return NextResponse.json({ 
            stats: todayStats,
            weeklyStats,
            logs, 
            insights,
            rules,
            inboxCount,
            watchStatus
        });
    } catch (error) {
        console.error("Error in stats API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
