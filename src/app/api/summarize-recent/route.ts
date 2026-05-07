import { NextResponse } from "next/server";
import { getRecentLogs, getRecentSummaryCache, setRecentSummaryCache } from "@/lib/db-service";
import { summarizeRecentEmails } from "@/ai/email-classifier";
import { getGmailClient } from "@/lib/gmail-service";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch the last 30 processed emails
        const logs = await getRecentLogs(30);
        
        if (logs.length === 0) {
            return NextResponse.json({ summary: "No recent emails have been processed." });
        }

        const latestLogId = logs[0].id;
        
        // Check cache
        const cache = await getRecentSummaryCache();
        if (cache && cache.lastLogId === latestLogId && cache.summary) {
            console.log("Returning cached recent summary");
            return NextResponse.json({ summary: cache.summary });
        }

        const gmail = await getGmailClient();
        
        console.log("Checking read/unread status for recent emails...");
        const checkPromises = logs.map(async (log) => {
            try {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: log.id,
                    format: 'minimal'
                });
                if (msg.data.labelIds && msg.data.labelIds.includes('UNREAD')) {
                    return log;
                }
            } catch (e) {
                return null;
            }
            return null;
        });

        const results = await Promise.all(checkPromises);
        const unreadLogs = results.filter(Boolean) as typeof logs;

        if (unreadLogs.length === 0) {
             const summary = "You are all caught up! There are no unread recent emails that require your attention.";
             await setRecentSummaryCache(summary, latestLogId);
             return NextResponse.json({ summary });
        }

        // Map them to the required format
        const emails = unreadLogs.map(log => ({
            subject: log.subject,
            sender: log.sender,
            category: log.category,
            snippet: log.snippet,
        }));

        console.log("Generating new recent summary with Gemini...");
        const summary = await summarizeRecentEmails({ emails });

        // Update cache
        await setRecentSummaryCache(summary, latestLogId);

        return NextResponse.json({ summary });
    } catch (error: any) {
        console.error("Error summarizing recent emails:", error);
        return NextResponse.json({ error: error.message || "Failed to summarize" }, { status: 500 });
    }
}
