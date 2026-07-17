import { NextResponse } from 'next/server';
import { getStats, getRecentLogs, getSenderRules, getWatchStatus } from '@/lib/db-service';
import { getInboxCount, getMessagesReadStatus } from '@/lib/gmail-service';

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

        // Filter and get unread status only for important emails to display in ImportantEmailsWidget
        const EXCLUDED_CATEGORIES = ["Marketing", "Newsletter", "Promotions", "Social"];
        const importantLogs = logs.filter(log => !EXCLUDED_CATEGORIES.includes(log.category));
        
        // Grab IDs of the top 20 important logs to check if they are unread
        const logsToCheck = importantLogs.slice(0, 20).map(l => l.id);
        const unreadStatusMap = await getMessagesReadStatus(logsToCheck);
        
        // Enrich logs with isUnread status
        const enrichedLogs = logs.map(log => {
            if (unreadStatusMap[log.id] !== undefined) {
                return { ...log, isUnread: unreadStatusMap[log.id] };
            }
            return log;
        });

        return NextResponse.json({ 
            stats: todayStats,
            weeklyStats,
            logs: enrichedLogs, 
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
