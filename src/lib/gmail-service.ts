"use server";

import { google, gmail_v1 } from "googleapis";

// GLOBAL CACHE: Keeps label IDs in memory while the server is warm.
let labelCache: Record<string, string> = {};

// Helper to get the Auth Client specifically (shared by Gmail and Calendar)
const getAuthClient = async () => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
      const oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground" 
      );
      oAuth2Client.setCredentials({ refresh_token: refreshToken });
      return oAuth2Client;
  } else {
      // Fallback for Cloud Run default service account
      const auth = new google.auth.GoogleAuth({
        scopes: [
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/calendar.readonly'
        ],
      });
      return await auth.getClient();
  }
};

export const getGmailClient = async () => {
  const authClient = await getAuthClient();
  return google.gmail({ version: 'v1', auth: authClient });
};

export const getCalendarClient = async () => {
  const authClient = await getAuthClient();
  return google.calendar({ version: 'v3', auth: authClient });
};

export async function getNextCalendarEvent() {
    try {
        const calendar = await getCalendarClient();
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: endOfDay.toISOString(),
            maxResults: 1,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = res.data.items;
        if (events && events.length > 0) {
            const event = events[0];
            const start = event.start?.dateTime || event.start?.date;
            return {
                summary: event.summary || "Untitled Event",
                start: start,
                location: event.location
            };
        }
        return null;
    } catch (error: any) {
        // Silently fail if scopes are missing, logging it for debug but not crashing app
        console.warn("Failed to fetch calendar events (likely missing scope):", error.message);
        return null;
    }
}

export async function listLabels(gmail?: gmail_v1.Gmail) {
  const client = gmail || await getGmailClient();
  const res = await client.users.labels.list({ userId: 'me' });
  return res.data.labels;
}

export async function moveEmailToCategory(
  messageId: string, 
  categoryLabelName: string,
  existingClient?: gmail_v1.Gmail 
) {
  const gmail = existingClient || await getGmailClient();
  
  try {
      let labelId = labelCache[categoryLabelName.toLowerCase()];

      if (!labelId) {
          console.log("Cache miss for label. Fetching label list...");
          const labels = await listLabels(gmail);
          
          if (labels) {
            labels.forEach(l => {
                if (l.name && l.id) {
                    labelCache[l.name.toLowerCase()] = l.id;
                }
            });
          }
          labelId = labelCache[categoryLabelName.toLowerCase()];
      }

      if (!labelId) {
         console.warn(`Label "${categoryLabelName}" does not exist in Gmail. Skipping move.`);
         return; 
      }
      
      console.log(`Moving message ${messageId} to label ${categoryLabelName} (${labelId})`);

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
