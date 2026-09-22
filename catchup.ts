import { classifyEmail } from "@/ai/email-classifier";
import { moveEmailToCategory, getGmailClient } from "@/lib/gmail-service";
import { logEmailProcessing, getStats } from "@/lib/db-service";

async function catchUp() {
  console.log("Catchup: Starting process for the last 10 INBOX emails (read or unread)...");
  try {
    const gmail = await getGmailClient();
    
    // Fetch last 10 inbox emails regardless of read status
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX',
        maxResults: 10, 
    });

    const messages = response.data.messages;
    console.log(`Catchup: Found ${messages?.length || 0} messages.`);
    
    if (!messages || messages.length === 0) {
        return;
    }

    // Process them
    for (const msg of messages) {
        if (!msg.id) continue;
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
                reasoning: classification.reasoning,
                otpCode: classification.otpCode
            });
            console.log("Logged", msg.id);

        } catch (err: any) {
            console.error(`Failed message ${msg.id}:`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // be gentle
    }
  } catch (error: any) {
    console.error("Catchup Error:", error);
  }
}

catchUp().then(() => process.exit(0));
