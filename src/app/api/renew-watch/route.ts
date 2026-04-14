import { getGmailClient } from '@/lib/gmail-service';
import { saveWatchStatus } from '@/lib/db-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(req: Request) {
    try {
        const topicName = process.env.GMAIL_TOPIC_NAME || 'projects/gmail4-0/topics/gmail-incoming';

        const authHeader = req.headers.get('authorization');
        // Simple security layer: requiring a cron secret to prevent unauthorized renewals.
        // Google Cloud Scheduler can pass an HTTP Header (e.g. Authorization: Bearer <CRON_SECRET>)
        const CRON_SECRET = process.env.CRON_SECRET;
        
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
           return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const gmail = await getGmailClient();
        
        console.log(`Setting up watch on topic: ${topicName}`);
        
        const res = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                labelIds: ['INBOX'], // Trigger on changes to INBOX
                topicName: topicName,
                labelFilterAction: 'include',
            },
        });

        console.log("Successfully renewed Gmail watch:", res.data);

        // Save status to Firestore for dashboard visibility
        await saveWatchStatus(
            res.data.historyId || "unknown",
            new Date(Number(res.data.expiration)).toISOString()
        );

        return NextResponse.json({
            status: "success",
            historyId: res.data.historyId,
            expiration: new Date(Number(res.data.expiration)).toISOString(),
        });
    } catch (error: any) {
        console.error("Failed to renew Gmail watch:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
