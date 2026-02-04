import { NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing } from "@/lib/db-service";

export const maxDuration = 60; // Allow up to 60 seconds for execution (Cloud Run default is usually higher, but Next.js limits serverless functions)

export async function POST() {
  try {
    const gmail = await getGmailClient();
    
    // Fetch up to 10 unread emails from INBOX
    // q: 'label:INBOX is:unread'
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread',
        maxResults: 10, 
    });

    const messages = response.data.messages;
    
    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: "Inbox is already empty!", count: 0 });
    }

    let processedCount = 0;

    // Process them in parallel or sequence? Sequence is safer for rate limits, Parallel is faster.
    // Let's do a limited concurrency.
    
    for (const msg of messages) {
        if (!msg.id) continue;

        try {
            const messageDetails = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full',
            });

            const headers = messageDetails.data.payload?.headers;
            const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
            const sender = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const snippet = messageDetails.data.snippet || '';
            const bodyContent = snippet; // Simplified

            // Classify
            const classification = await classifyEmail({
                subject,
                sender,
                snippet,
                body: bodyContent
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
                timestamp: new Date()
            });

            processedCount++;
        } catch (err) {
            console.error(`Failed to process message ${msg.id}`, err);
            // Continue to next message even if one fails
        }
    }

    return NextResponse.json({ 
        message: `Successfully processed ${processedCount} emails.`, 
        count: processedCount 
    });

  } catch (error: any) {
    console.error("Cleanup API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
