import { NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing } from "@/lib/db-service";

// Increase timeout to (3000 seconds) for batch processing
export const maxDuration = 3000; 

export async function POST() {
  try {
    const gmail = await getGmailClient(); // ERROR: was missing () in previous version
    
    // Fetch up to 50 unread emails from INBOX (Reasonable batch size for one request)
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread',
        maxResults: 50, 
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
                format: 'metadata', // Use metadata for lighter payload
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

    // Process in chunks to control concurrency (avoid hitting API rate limits)
    const CONCURRENCY_LIMIT = 5;
    const chunks = [];
    for (let i = 0; i < messages.length; i += CONCURRENCY_LIMIT) {
        chunks.push(messages.slice(i, i + CONCURRENCY_LIMIT));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(msg => processMessage(msg)));
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
