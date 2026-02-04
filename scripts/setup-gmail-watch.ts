import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config();

const GMAIL_TOPIC_NAME = process.env.GMAIL_TOPIC_NAME;
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

if (!GMAIL_TOPIC_NAME) {
  console.error("Error: GMAIL_TOPIC_NAME is missing from .env");
  process.exit(1);
}

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("Error: OAuth credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are missing from .env");
  process.exit(1);
}

async function setupGmailWatch() {
  try {
    console.log("Authenticating with OAuth2...");
    
    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oAuth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

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
    console.log("History ID:", res.data.historyId);
    console.log("Expiration:", new Date(Number(res.data.expiration)).toLocaleString());
    console.log("Note: This watch expires in ~7 days. You need to re-run this script periodically.");

  } catch (error: any) {
    console.error("Error setting up Gmail watch:", error.message);
    if (error.response) {
      console.error("Details:", error.response.data);
    }
  }
}

setupGmailWatch();
