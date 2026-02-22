import { NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getStats } from "@/lib/db-service";

export const maxDuration = 3000; 
const HARD_LIMIT = 1300;

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function POST() {
  console.log("Cleanup API: Starting process...");
  try {
    const stats = await getStats(1); 
    const currentUsage = stats?.totalProcessed || 0;
    console.log(`Cleanup API: Current usage is ${currentUsage}/${HARD_LIMIT}`);

    if (currentUsage >= HARD_LIMIT) {
        return NextResponse.json({ 
            message: `Quota exceeded (${currentUsage}/${HARD_LIMIT}).`, 
            error: "Quota Exceeded" 
        }, { status: 429 });
    }

    const gmail = await getGmailClient();
    
    // Fetch 10 emails
    console.log("Cleanup API: Fetching unread emails from INBOX...");
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread',
        maxResults: 10, 
    });

    const messages = response.data.messages;
    console.log(`Cleanup API: Found ${messages?.length || 0} messages.`);
    
    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: "Inbox is already empty!", count: 0 });
    }

    let processedCount = 0;
    const results: any[] = [];

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
            
            console.log(`Processing: ${subject} from ${sender}`);
            
            // Classify
            const classification = await classifyEmail({
                subject,
                sender,
                snippet,
            });

            console.log(`Classified as: ${classification.category}`);

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
            results.push({ id: msg.id, status: 'success', category: classification.category });
        } catch (err: any) {
            console.error(`Failed message ${msg.id}:`, err);
            results.push({ id: msg.id, status: 'error', error: err.message });
        }
    };

    for (const msg of messages) {
        await processMessage(msg);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({ 
        message: `Processed ${processedCount} emails.`, 
        results
    });

  } catch (error: any) {
    console.error("Cleanup API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
