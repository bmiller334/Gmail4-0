import { NextRequest, NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory } from "@/lib/gmail-service";
import { google } from "googleapis";

// Helper to decode Pub/Sub message
function decodeBase64Json(data: string) {
  const buff = Buffer.from(data, 'base64');
  const text = buff.toString('utf-8');
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the incoming Pub/Sub message
    // Documentation: https://cloud.google.com/pubsub/docs/push
    const body = await req.json();
    
    if (!body.message) {
        return NextResponse.json({ error: "Invalid Pub/Sub message format" }, { status: 400 });
    }

    const data = body.message.data ? Buffer.from(body.message.data, 'base64').toString().trim() : null;
    
    // The data sent by Gmail push notification is usually a JSON object containing { emailAddress, historyId }
    // However, the actual payload structure depends on how the topic is configured. 
    // Gmail API push notifications send a minimal JSON payload.
    // Example: {"emailAddress": "user@example.com", "historyId": "1234567890"}
    
    if (!data) {
       return NextResponse.json({ message: "No data in message" }, { status: 200 }); // Return 200 to ack Pub/Sub
    }
    
    const notification = JSON.parse(data);
    const historyId = notification.historyId;
    const emailAddress = notification.emailAddress;
    
    console.log(`Received notification for ${emailAddress}, historyId: ${historyId}`);

    // 2. Fetch the actual email(s) that changed. 
    // This is complex because historyId gives a list of changes. 
    // For simplicity in this scaffold, we might just fetch the latest message or specific message if provided.
    // However, Gmail Push doesn't give the Message ID directly, just the History ID.
    // We would need to call history.list with startHistoryId to see what changed.
    
    // For this MVP scaffold, let's assume we fetch the very latest message in INBOX to see if it needs sorting.
    // In a production app, use history.list(startHistoryId=...) to get the specific message IDs.
    
    // AUTHENTICATION NOTE: This route needs to authenticate as the user or service account.
    // Using a service account with domain-wide delegation or a stored refresh token is required here.
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    });
    const authClient = await auth.getClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient as any });

    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread', // Filter for unread in inbox
        maxResults: 1, // Just grab the latest one for this demo trigger
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
        
        // Simple body extraction (can be complex with multipart)
        // This is a naive implementation.
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
        
        // TODO: Store stats in a DB
    }

    return NextResponse.json({ status: "success" });

  } catch (error: any) {
    console.error("Error processing Pub/Sub message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
