import { NextRequest, NextResponse } from "next/server";
import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getSenderRules, getStats, getLastHistoryId, updateLastHistoryId } from "@/lib/db-service";

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
    const newHistoryId = notification.historyId;
    const emailAddress = notification.emailAddress;
    
    console.log(`[Push] Notification for ${emailAddress}, historyId: ${newHistoryId}`);

    // 2. Get Gmail client
    const gmail = await getGmailClient();

    // 3. Discover new messages using history.list() — the correct approach.
    //    The old code ignored historyId and just fetched maxResults:1 unread email,
    //    which meant burst arrivals and non-inbox notifications caused silent misses.
    let messageIds: string[] = [];
    const lastHistoryId = await getLastHistoryId();

    if (lastHistoryId) {
      try {
        console.log(`[Push] Fetching history changes since historyId: ${lastHistoryId}`);
        const historyResponse = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: lastHistoryId,
          historyTypes: ['messageAdded'],
          labelId: 'INBOX',
        });

        const histories = historyResponse.data.history || [];
        for (const history of histories) {
          for (const added of (history.messagesAdded || [])) {
            if (added.message?.id) {
              messageIds.push(added.message.id);
            }
          }
        }

        console.log(`[Push] history.list found ${messageIds.length} new INBOX message(s)`);
      } catch (historyError: any) {
        // historyId too old (404/410) or other error — fall back to listing
        console.warn(`[Push] history.list failed (code: ${historyError.code || 'unknown'}, msg: ${historyError.message}), falling back to INBOX query`);
        messageIds = [];
      }
    } else {
      console.log('[Push] No stored historyId found, falling back to INBOX query');
    }

    // 4. Fallback: if history.list found nothing or failed, list unread inbox messages directly
    if (messageIds.length === 0) {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX is:unread', 
        maxResults: 5, // Process up to 5 to catch burst arrivals
      });

      if (response.data.messages) {
        messageIds = response.data.messages
          .map(m => m.id)
          .filter((id): id is string => !!id);
      }
    }

    // 5. Always update stored historyId to the latest from notification
    if (newHistoryId) {
      await updateLastHistoryId(newHistoryId);
    }

    if (messageIds.length === 0) {
      return NextResponse.json({ message: "No new messages to process" });
    }

    // Deduplicate
    messageIds = [...new Set(messageIds)];

    console.log(`[Push] Processing ${messageIds.length} message(s)`);

    // 6. Pre-fetch sender rules once (not per-message)
    const rules = await getSenderRules();

    let processedCount = 0;

    for (const messageId of messageIds) {
      try {
        const messageDetailsResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const messageDetails = messageDetailsResponse.data;
        if (!messageDetails) {
          console.warn(`[Push] Empty response for message ${messageId}, skipping`);
          continue;
        }

        if (!messageDetails.labelIds?.includes('INBOX')) {
          console.log(`[Push] Message ${messageId} is no longer in INBOX, skipping.`);
          continue;
        }

        const headers = messageDetails.payload?.headers;
        const subject = headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const snippet = messageDetails.snippet || '';

        console.log(`[Push] Processing: "${subject}" from ${sender}`);

        let category = null;
        let isUrgent = false;
        let reasoning = null;

        // Check deterministic rules first
        const matchedRule = (rules || []).find(r => sender.toLowerCase().includes(r.sender.toLowerCase()));

        if (matchedRule) {
          console.log(`[Push] Matched rule: ${matchedRule.sender} -> ${matchedRule.category}`);
          category = matchedRule.category;
          isUrgent = false;
          reasoning = `Matched custom rule for sender: ${matchedRule.sender}`;
        } else {
          // Fallback to AI Classification
          try {
            const classification = await classifyEmail({ subject, sender, snippet });
            category = classification.category;
            isUrgent = classification.isUrgent;
            reasoning = classification.reasoning;
            console.log(`[Push] AI Classified as: ${category}`);
          } catch (aiError) {
            console.error("[Push] AI Classification failed:", aiError);
            category = "Manual Sort";
            isUrgent = false;
            reasoning = "AI Classification failed, defaulting to Manual Sort";
          }
        }

        // Move the email
        await moveEmailToCategory(messageId, category);

        // Store stats in Firestore
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

        processedCount++;
        console.log(`[Push] ✓ ${messageId} → ${category}`);
      } catch (msgError: any) {
        console.error(`[Push] Failed to process message ${messageId}:`, msgError.message);
      }
    }

    return NextResponse.json({ status: "success", processed: processedCount, total: messageIds.length });

  } catch (error: any) {
    console.error("[Push] Fatal error processing notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
