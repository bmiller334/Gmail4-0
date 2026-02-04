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

export async function createLabel(labelName: string) {
  const gmail = await getGmailClient();
  try {
    const res = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });
    return res.data;
  } catch (error: any) {
    if (error.code === 409) {
      // Label already exists, that's fine.
      console.log(`Label ${labelName} already exists.`);
      // We might want to fetch the existing ID here if needed, but for now just return.
      return null; 
    }
    throw error;
  }
}


export async function moveEmailToCategory(messageId: string, categoryLabelName: string) {
  const gmail = await getGmailClient();
  
  // 1. Get the Label ID for the category (or create it if it doesn't exist)
  // Optimization: In a real app, cache these mappings.
  const labels = await listLabels();
  let labelId = labels?.find(l => l.name === categoryLabelName)?.id;

  if (!labelId) {
    const newLabel = await createLabel(categoryLabelName);
    labelId = newLabel?.id;
  }

  if (!labelId) {
     throw new Error(`Could not find or create label for category: ${categoryLabelName}`);
  }

  // 2. Modify the message: Add the category label, Remove 'INBOX' label.
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
      removeLabelIds: ['INBOX'],
    },
  });
}
