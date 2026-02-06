import { NextRequest, NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getSenderRules } from "@/lib/db-service";

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
            format: 'minimal', // CHANGED: 'full' -> 'minimal' to save bandwidth, we only need snippet & headers
        });
        
        // Note: 'minimal' format only includes snippet and core headers usually. 
        // If we need specific headers, we might need 'metadata'.
        // Let's stick to 'full' but ignore body content in logic to be safe, 
        // OR use 'metadata' which is lighter.
        // Reverting to 'full' for safety but explicitly NOT passing body to AI.
    }

    // Retrying with 'metadata' format which is much lighter than 'full'
    // but contains snippet and headers.
    const messageDetailsResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messages[0].id!,
        format: 'metadata', // lighter payload
        metadataHeaders: ['Subject', 'From'], // only fetch what we need
    });
    
    const messageDetails = messageDetailsResponse.data;
    const messageId = messageDetails.id!;

    const headers = messageDetails.payload?.headers;
    const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
    const sender = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender';
    const snippet = messageDetails.snippet || '';
    
    console.log(`Processing email: ${subject} from ${sender}`);

    let category = null;
    let isUrgent = false;

    // 3a. Check Deterministic Rules First
    const rules = await getSenderRules();
    const matchedRule = rules.find(r => sender.toLowerCase().includes(r.sender.toLowerCase()));
    
    if (matchedRule) {
            console.log(`Matched rule: ${matchedRule.sender} -> ${matchedRule.category}`);
            category = matchedRule.category;
            isUrgent = false; // Default for rules unless we add an 'urgent' flag to rules too
    } else {
            // 3b. Fallback to AI Classification
            // OPTIMIZATION: Removed 'body' property entirely to save tokens.
            const classification = await classifyEmail({
            subject,
            sender,
            snippet
        });
        category = classification.category;
        isUrgent = classification.isUrgent;
        console.log(`AI Classified as: ${category}`);
    }

    // 4. Move the email
    await moveEmailToCategory(messageId, category);
    
    // 5. Store stats in Firestore
    await logEmailProcessing({
        id: messageId,
        sender,
        subject,
        category: category,
        isUrgent: isUrgent,
        snippet, // Save snippet so we can correct it later if needed
        timestamp: new Date()
    });

    return NextResponse.json({ status: "success" });

  } catch (error: any) {
    console.error("Error processing Pub/Sub message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
