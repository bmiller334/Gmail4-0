import { NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getStats } from "@/lib/db-service";

// Increase timeout to (3000 seconds) for batch processing
export const maxDuration = 3000; 
const HARD_LIMIT = 1300;

export async function POST() {
  try {
    // 0. Check Quota First
    const stats = await getStats(1); // Get today's stats
    const currentUsage = stats?.totalProcessed || 0;

    if (currentUsage >= HARD_LIMIT) {
        return NextResponse.json({ 
            message: `Quota exceeded (${currentUsage}/${HARD_LIMIT}). Cleanup aborted to prevent overages.`, 
            error: "Quota Exceeded" 
        }, { status: 429 });
    }

    const gmail = await getGmailClient();
    
    // REDUCED: Fetch only 20 emails to avoid quota explosions
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread',
        maxResults: 20, 
    });

    const messages = response.data.messages;
    
    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: "Inbox is already empty!", count: 0 });
    }

    let processedCount = 0;
    const errors: any[] = [];

    // Helper function to process a single message
    const processMessage = async (msg: any) => {
        if (!msg.id) return;
        try {
            const messageDetails = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From'],
            });

            const headers = messageDetails.data.payload?.headers;
            const subject = headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const sender = headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
            const snippet = messageDetails.data.snippet || '';
            
            // Classify
            const classification = await classifyEmail({
                subject,
                sender,
                snippet,
            });

            // Move
            await moveEmailToCategory(msg.id, classification.category);

            // Log
            await logEmailProcessing({
                id: msg.id,
                sender,
                subject,
                category: classification.category,
                isUrgent: classification.isUrgent,
                timestamp: new Date(),
                snippet,
                reasoning: classification.reasoning
            });

            processedCount++;
        } catch (err: any) {
            console.error(`Failed to process message ${msg.id}`, err);
            errors.push({ id: msg.id, error: err.message });
        }
    };

    // REDUCED: Process SEQUENTIALLY (1 at a time) to save quota
    const CONCURRENCY_LIMIT = 1;
    
    for (const msg of messages) {
        await processMessage(msg);
        // ADDED: 2-second delay between requests to stay under 15 RPM limit
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return NextResponse.json({ 
        message: `Successfully processed ${processedCount} emails.`, 
        count: processedCount,
        errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error("Cleanup API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
