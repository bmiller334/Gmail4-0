"use server";

import { google } from "googleapis";

// This is a placeholder for the actual OAuth2 client setup.
// In a real application, you would need to handle the OAuth2 flow or service account authentication properly.
// For a personal script, you might use a refresh token to get an access token.

const getGmailClient = async () => {
  // TODO: Implement proper authentication (e.g., loading credentials from env vars or a secrets manager)
  // For now, we assume the environment has GOOGLE_APPLICATION_CREDENTIALS set or similar mechanism for default auth,
  // or we need to manually construct the OAuth2 client.
  
  // CAUTION: This requires a valid token mechanism. 
  // For the purpose of this scaffold, I'll instantiate a client but it needs real credentials to work.
  
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
  });
  
  const authClient = await auth.getClient();

  return google.gmail({ version: 'v1', auth: authClient as any });
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
