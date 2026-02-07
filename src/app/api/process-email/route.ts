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
        console.warn(`[Quota] Daily limit reached (${currentUsage}/${HARD_LIMIT}). Skipping.`);
        return NextResponse.json({ status: "skipped", reason: "quota_exceeded" });
    }

    // 1. Parse Pub/Sub
    const body = await req.json();
    if (!body.message) return NextResponse.json({ error: "Invalid Pub/Sub" }, { status: 400 });

    const data = body.message.data ? Buffer.from(body.message.data, 'base64').toString().trim() : null;
    if (!data) return NextResponse.json({ message: "No data" }, { status: 200 });
    
    const notification = JSON.parse(data);
    const historyId = notification.historyId; // Unused for now, but good for debugging
    const emailAddress = notification.emailAddress;

    // 2. Reuse ONE Gmail Client
    const gmail = await getGmailClient();

    // Fetch the latest UNREAD email in INBOX
    // Optimization Note: This is still subject to race conditions if multiple emails 
    // arrive instantly, but it is the fastest implementation.
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread', 
        maxResults: 1, 
    });

    const messages = response.data.messages;
    
    if (!messages || messages.length === 0) {
        return NextResponse.json({ message: "No new unread messages found" });
    }

    // Get message details
    const messageId = messages[0].id!;
    const messageDetailsResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
    });
    
    const messageDetails = messageDetailsResponse.data;
    const headers = messageDetails.payload?.headers;
    const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
    const sender = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender';
    const snippet = messageDetails.snippet || ''; // Access snippet directly from top level
    
    console.log(`Processing: ${subject}`);

    let category = null;
    let isUrgent = false;
    let reasoning = null;

    // 3a. Deterministic Rules (Fastest)
    const rules = await getSenderRules();
    const matchedRule = rules.find(r => sender.toLowerCase().includes(r.sender.toLowerCase()));
    
    if (matchedRule) {
            console.log(`Rule Match: ${matchedRule.category}`);
            category = matchedRule.category;
            isUrgent = false;
            reasoning = `Matched custom rule: ${matchedRule.sender}`;
    } else {
            // 3b. AI Classification (Slower)
            const classification = await classifyEmail({
                subject,
                sender,
                snippet
            });
            category = classification.category;
            isUrgent = classification.isUrgent;
            reasoning = classification.reasoning;
            console.log(`AI Match: ${category}`);
    }

    // 4. Move Email (Pass 'gmail' client to avoid re-auth & use Cache)
    await moveEmailToCategory(messageId, category, gmail);
    
    // 5. Store stats
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
    console.error("Error processing:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}