import { NextRequest, NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getSenderRules, getStats } from "@/lib/db-service";

const HARD_LIMIT = 1300;

export async function POST(req: NextRequest) {
  try {
    // 0. Check Quota First
    const stats = await getStats(1); 
    const currentUsage = stats?.totalProcessed || 0;

    if (currentUsage >= HARD_LIMIT) {
        console.warn(`[Quota] Daily limit reached (${currentUsage}/${HARD_LIMIT}). Skipping processing.`);
        return NextResponse.json({ status: "skipped", reason: "quota_exceeded" });
    }

    // 1. Parse the incoming Pub/Sub message
    const body = await req.json();
    
    if (!body.message) {
        return NextResponse.json({ error: "Invalid Pub/Sub message format" }, { status: 400 });
    }

    const data = body.message.data ? Buffer.from(body.message.data, 'base64').toString().trim() : null;
    
    if (!data) {
       return NextResponse.json({ message: "No data in message" }, { status: 200 });
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
    
    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: "No new unread messages found" });
    }

    // Defensive: Get the first message ID safely
    const messageId = messages[0].id;
    if (!messageId) {
        throw new Error("Message ID is undefined in list response");
    }

    // Use 'full' format to ensure we get headers and snippet reliably.
    const messageDetailsResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', 
    });
    
    const messageDetails = messageDetailsResponse.data;

    // CRITICAL FIX: Ensure messageDetails is defined before accessing properties
    if (!messageDetails) {
        console.error("Failed to fetch message details: Response data is empty or undefined", messageDetailsResponse);
        throw new Error("Failed to fetch message details: Response data is empty");
    }

    // Use optional chaining for EVERYTHING derived from messageDetails
    const headers = messageDetails.payload?.headers;
    const subject = headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
    const sender = headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
    const snippet = messageDetails.snippet || ''; 
    
    console.log(`Processing email: ${subject} from ${sender}`);

    let category = null;
    let isUrgent = false;
    let reasoning = null;

    // 3a. Check Deterministic Rules First
    const rules = await getSenderRules();
    const matchedRule = (rules || []).find(r => sender.toLowerCase().includes(r.sender.toLowerCase()));
    
    if (matchedRule) {
            console.log(`Matched rule: ${matchedRule.sender} -> ${matchedRule.category}`);
            category = matchedRule.category;
            isUrgent = false; 
            reasoning = `Matched custom rule for sender: ${matchedRule.sender}`;
    } else {
            // 3b. Fallback to AI Classification
            try {
                const classification = await classifyEmail({
                    subject,
                    sender,
                    snippet
                });
                category = classification.category;
                isUrgent = classification.isUrgent;
                reasoning = classification.reasoning;
                console.log(`AI Classified as: ${category}`);
            } catch (aiError) {
                console.error("AI Classification failed:", aiError);
                category = "Manual Sort"; // specific fallback
                isUrgent = false;
                reasoning = "AI Classification failed, defaulting to Manual Sort";
            }
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
        snippet, 
        reasoning: reasoning || "No reasoning provided",
        timestamp: new Date()
    });

    return NextResponse.json({ status: "success" });

  } catch (error: any) {
    console.error("Error processing Pub/Sub message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
