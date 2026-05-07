import { NextResponse } from "next/server";
import { getRecentLogs, getRecentSummaryCache, setRecentSummaryCache } from "@/lib/db-service";
import { summarizeRecentEmails } from "@/ai/email-classifier";

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

        // Map them to the required format
        const emails = logs.map(log => ({
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
