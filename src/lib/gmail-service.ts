"use server";

import { google } from "googleapis";

export const getGmailClient = async () => {
  // Check for OAuth2 credentials for Personal Gmail
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  let authClient: any;

  if (clientId && clientSecret && refreshToken) {
      // console.log("Using OAuth2 Client for Personal Gmail"); // Commented out to reduce noise
      const oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground" 
      );

      oAuth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      authClient = oAuth2Client;
  } else {
      // Fallback to Application Default Credentials (Service Account)
      // This ONLY works for Workspace (G Suite) domains with Domain-Wide Delegation.
      // console.log("Using Default Application Credentials (Service Account)");
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/gmail.modify'],
      });
      authClient = await auth.getClient();
  }

  return google.gmail({ version: 'v1', auth: authClient });
};

export async function listLabels() {
  const gmail = await getGmailClient();
  const res = await gmail.users.labels.list({ userId: 'me' });
  return res.data.labels;
}

export async function moveEmailToCategory(messageId: string, categoryLabelName: string) {
  const gmail = await getGmailClient();
  
  try {
      // 1. Get the Label ID for the category from existing labels only
      const labels = await listLabels();
      // Case-insensitive match to be safer
      let labelId = labels?.find(l => l.name?.toLowerCase() === categoryLabelName.toLowerCase())?.id;

      if (!labelId) {
         console.warn(`Label "${categoryLabelName}" does not exist in Gmail. Skipping move.`);
         // Optionally, we could log this warning to Firestore so the user knows why an email wasn't moved.
         return; 
      }
      
      console.log(`Moving message ${messageId} to label ${categoryLabelName} (${labelId})`);

      // 2. Modify the message: Add the category label, Remove 'INBOX' label.
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
          removeLabelIds: ['INBOX'],
        },
      });
      
      console.log(`Successfully moved message ${messageId}`);
      
  } catch (error: any) {
      console.error(`Failed to move email to ${categoryLabelName}:`, error);
      throw error;
  }
}
