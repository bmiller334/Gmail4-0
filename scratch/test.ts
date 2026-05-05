import * as dotenv from "dotenv";
dotenv.config();

import { getGmailClient } from "../src/lib/gmail-service";
import { getLastHistoryId } from "../src/lib/db-service";

async function test() {
  const gmail = await getGmailClient();
  const lastHistoryId = await getLastHistoryId();
  
  console.log("Last History ID:", lastHistoryId);
  
  if (lastHistoryId) {
    try {
      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX',
      });
      console.log("History Response:", JSON.stringify(historyResponse.data, null, 2));
    } catch (e: any) {
      console.error("Error history:", e.message);
    }
  }

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'label:INBOX is:unread', 
    maxResults: 5,
  });

  console.log("Messages Fallback Response:", JSON.stringify(response.data, null, 2));
  process.exit(0);
}

test();
