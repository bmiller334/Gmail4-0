import { NextResponse } from "next/server";
import { getStats, getRecentLogs } from "@/lib/db-service";

export async function GET() {
    try {
        const stats = await getStats();
        const logs = await getRecentLogs(20); // Fetch last 20 logs for deeper analysis
        
        const insights: string[] = [];

        if (stats) {
            // 1. Spike Detection: Check for high volume from single sender
            const SENDER_THRESHOLD = 5;
            Object.entries(stats.senders || {}).forEach(([sender, count]: [string, any]) => {
                if (count > SENDER_THRESHOLD) {
                    insights.push(`High volume detected: ${sender.replace(/_/g, '.')} sent ${count} emails today.`);
                }
            });

            // 2. Category Alerts
            const total = stats.totalProcessed || 0;
            const marketingCount = stats.categories?.['Marketing'] || 0;
            if (total > 0 && (marketingCount / total) > 0.5) {
                insights.push("Marketing emails make up over 50% of today's traffic.");
            }

            const importantCount = stats.categories?.['Important'] || 0;
            if (importantCount > 3) {
                 insights.push(`You have ${importantCount} new Important emails to review.`);
            }
        }

        // 3. Urgency Check
        const urgentEmails = logs.filter((log: any) => log.isUrgent);
        if (urgentEmails.length > 0) {
            insights.push(`${urgentEmails.length} email(s) marked as URGENT in the last batch.`);
        }

        // 4. Missed Email Heuristic (Simple: If unread "Personal" email is older than 4 hours - strictly this requires querying live inbox, 
        // but we can approximate by checking logs if we had a status field. For now, we'll just flag Personal emails.)
        const recentPersonal = logs.filter((log: any) => log.category === 'Personal');
        if (recentPersonal.length > 0) {
            insights.push(`Recent Personal email from ${recentPersonal[0].sender}. Ensure you didn't miss it.`);
        }
        
        return NextResponse.json({ stats, logs, insights });
    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
