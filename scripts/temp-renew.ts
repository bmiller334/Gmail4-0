import { getGmailClient } from "./src/lib/gmail-service";

async function renewLocally() {
    try {
        console.log("Checking credentials & renewing watch...");
        const gmail = await getGmailClient();
        const topicName = process.env.GMAIL_TOPIC_NAME || 'projects/gmail4-0/topics/gmail-incoming';
        
        const res = await gmail.users.watch({
          userId: 'me',
          requestBody: {
            labelIds: ['INBOX'],
            topicName,
            labelFilterAction: 'include',
          },
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.error("Failed to renew local watch:", e.message);
    }
}
renewLocally();
