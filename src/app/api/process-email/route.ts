import { NextRequest, NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing } from "@/lib/db-service";

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the incoming Pub/Sub message
    const body = await req.json();
    
    if (!body.message) {
        return NextResponse.json({ error: "Invalid Pub/Sub message format" }, { status: 400 });
    }

    const data = body.message.data ? Buffer.from(body.message.data, 'base64').toString().trim() : null;
    
    if (!data) {
       return NextResponse.json({ message: "No data in message" }, { status: 200 }); // Return 200 to ack Pub/Sub
    }
    
    const notification = JSON.parse(data);
    const historyId = notification.historyId;
    const emailAddress = notification.emailAddress;
    
    console.log(`Received notification for ${emailAddress}, historyId: ${historyId}`);

    // 2. Fetch the actual email(s) that changed
    const gmail = await getGmailClient();

    // Fetch the latest UNREAD email in INBOX
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread', 
        maxResults: 1, 
    });

    const messages = response.data.messages;
    
    if (messages && messages.length > 0) {
        const messageId = messages[0].id;
        if (!messageId) return NextResponse.json({ message: "No message ID found" });

        const messageDetails = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });

        const headers = messageDetails.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const snippet = messageDetails.data.snippet || '';
        
        let bodyContent = snippet; 
        
        console.log(`Processing email: ${subject} from ${sender}`);

        // 3. Classify the email
        const classification = await classifyEmail({
            subject,
            sender,
            snippet,
            body: bodyContent
        });

        console.log(`Classified as: ${classification.category}`);

        // 4. Move the email
        await moveEmailToCategory(messageId, classification.category);
        
        // 5. Store stats in Firestore
        await logEmailProcessing({
            id: messageId,
            sender,
            subject,
            category: classification.category,
            isUrgent: classification.isUrgent,
            timestamp: new Date()
        });
    }

    return NextResponse.json({ status: "success" });

  } catch (error: any) {
    console.error("Error processing Pub/Sub message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
