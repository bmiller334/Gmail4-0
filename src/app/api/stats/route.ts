import { NextResponse } from 'next/server';
import { getStats, getRecentLogs, getSenderRules, getWatchStatus, saveWatchStatus, logEmailProcessing } from '@/lib/db-service';
import { getInboxCount, getMessagesReadStatus, getGmailClient, moveEmailToCategory } from '@/lib/gmail-service';
import { classifyEmail } from '@/ai/email-classifier';

export const dynamic = 'force-dynamic';

async function checkAndRenewWatch(currentWatchStatus: any) {
    try {
        let isExpiredOrExpiring = false;
        if (!currentWatchStatus || !currentWatchStatus.expiration) {
            isExpiredOrExpiring = true;
        } else {
            const expDate = new Date(currentWatchStatus.expiration);
            // Expired or expiring within 24 hours
            if (expDate.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
                isExpiredOrExpiring = true;
            }
        }

        if (isExpiredOrExpiring) {
            console.log("[Auto-Watch] Watch is expired or expiring soon. Renewing...");
            const gmail = await getGmailClient();
            const topicName = process.env.GMAIL_TOPIC_NAME || 'projects/gmail4-0/topics/gmail-incoming';
            const res = await gmail.users.watch({
                userId: 'me',
                requestBody: {
                    labelIds: ['INBOX'],
                    topicName: topicName,
                    labelFilterAction: 'include',
                },
            });

            if (res.data.expiration) {
                const newExpiration = new Date(Number(res.data.expiration)).toISOString();
                await saveWatchStatus(res.data.historyId || "unknown", newExpiration);
                console.log(`[Auto-Watch] Watch renewed successfully until ${newExpiration}`);

                // Perform quick catch-up for unread INBOX emails
                try {
                    const unreadRes = await gmail.users.messages.list({
                        userId: 'me',
                        q: 'label:INBOX is:unread',
                        maxResults: 20,
                    });
                    const messages = unreadRes.data.messages || [];
                    for (const msg of messages) {
                        if (!msg.id) continue;
                        try {
                            const details = await gmail.users.messages.get({
                                userId: 'me',
                                id: msg.id,
                                format: 'metadata',
                                metadataHeaders: ['Subject', 'From', 'Date'],
                            });
                            const headers = details.data.payload?.headers;
                            const subject = headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
                            const sender = headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
                            const dateStr = headers?.find((h: any) => h.name === 'Date')?.value;
                            const emailDate = dateStr ? new Date(dateStr) : new Date();
                            const snippet = details.data.snippet || '';

                            const classification = await classifyEmail({ subject, sender, snippet });
                            await moveEmailToCategory(msg.id, classification.category);
                            await logEmailProcessing({
                                id: msg.id,
                                sender,
                                subject,
                                category: classification.category,
                                isUrgent: classification.isUrgent,
                                timestamp: emailDate,
                                snippet,
                                reasoning: classification.reasoning,
                                otpCode: classification.otpCode
                            });
                        } catch (msgErr) {
                            console.error(`[Auto-Watch Catch-up] Error processing ${msg.id}:`, msgErr);
                        }
                    }
                } catch (catchUpErr) {
                    console.error("[Auto-Watch Catch-up] Failed catch-up sync:", catchUpErr);
                }

                return {
                    historyId: res.data.historyId,
                    expiration: newExpiration,
                    updatedAt: new Date().toISOString()
                };
            }
        }
    } catch (err: any) {
        console.error("[Auto-Watch] Watch renewal check failed:", err.message);
    }
    return currentWatchStatus;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    
    try {
        let watchStatus = await getWatchStatus();
        watchStatus = await checkAndRenewWatch(watchStatus);

        const [todayStats, weeklyStats, logs, insights, rules, inboxCount] = await Promise.all([
            getStats(1), // Today
            getStats(7), // Last 7 days
            getRecentLogs(50, { search, category }),
            Promise.resolve([]), // Placeholder for AI insights logic
            getSenderRules(),
            getInboxCount()
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

