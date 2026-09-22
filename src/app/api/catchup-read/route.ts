import { NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getStats } from "@/lib/db-service";

export const dynamic = 'force-dynamic'; 

export async function GET(req: Request) {
  console.log("Catchup API: Starting process for the last 10 INBOX emails (read or unread)...");
  try {
    const limit = 10;
    
    const gmail = await getGmailClient();
    
    // Fetch last 10 inbox emails regardless of read status
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX',
        maxResults: limit, 
    });

    const messages = response.data.messages;
    console.log(`Catchup API: Found ${messages?.length || 0} messages.`);
    
    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: "Inbox is completely empty!", count: 0 });
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
                timestamp: new Date(), // using current timestamp so it shows up as new
                snippet,
                reasoning: classification.reasoning,
                otpCode: classification.otpCode
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
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ 
        message: `Processed ${processedCount} recent emails regardless of read status. Check your dashboard now!`, 
        results
    });

  } catch (error: any) {
    console.error("Catchup API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
