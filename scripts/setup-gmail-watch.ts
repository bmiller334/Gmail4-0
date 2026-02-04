import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config();

const GMAIL_TOPIC_NAME = process.env.GMAIL_TOPIC_NAME;

if (!GMAIL_TOPIC_NAME) {
  console.error("Error: GMAIL_TOPIC_NAME environment variable is not set.");
  console.error("Please set it to the full Pub/Sub topic name, e.g., projects/your-project/topics/gmail-incoming");
  process.exit(1);
}

async function setupGmailWatch() {
  try {
    console.log("Authenticating...");
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    });
    
    const authClient = await auth.getClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient as any });

    console.log(`Setting up watch on topic: ${GMAIL_TOPIC_NAME}`);
    
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'], // Only trigger on changes to INBOX
        topicName: GMAIL_TOPIC_NAME,
        labelFilterAction: 'include',
      },
    });

    console.log("Success! Gmail watch setup.");
    console.log("Response:", res.data);
    console.log("Expiration:", res.data.expiration);
    console.log("Note: You need to renew this watch periodically (at least every 7 days).");

  } catch (error: any) {
    console.error("Error setting up Gmail watch:", error.message);
    if (error.response) {
      console.error("Details:", error.response.data);
    }
  }
}

setupGmailWatch();
