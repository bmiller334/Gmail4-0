"use server";

import { google } from "googleapis";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { getStoredRefreshToken } from "@/lib/db-service";

// GLOBAL CACHE: Keeps label IDs in memory while the server is warm.
let labelCache: Record<string, string> = {};

// Helper to get the Auth Client specifically (shared by Gmail and Calendar)
const getAuthClient = async () => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  // 1. Try to get token from Firestore (Dynamic)
  let refreshToken = await getStoredRefreshToken();

  // 2. If not in Firestore, fall back to Env Var (Static)
  if (!refreshToken) {
      refreshToken = process.env.GMAIL_REFRESH_TOKEN || null;
      if (refreshToken) {
          console.log("[Auth] Using Refresh Token from Environment Variables.");
      }
  } else {
      console.log("[Auth] Using Refresh Token from Firestore.");
  }

  const redirectUri = process.env.GMAIL_REDIRECT_URI || "https://developers.google.com/oauthplayground";

  if (clientId && clientSecret && refreshToken) {
      // console.log("[Auth] Using OAuth2 with provided credentials.");
      const oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
      oAuth2Client.setCredentials({ 
          refresh_token: refreshToken 
      });

      // Force token refresh if expired or about to expire
      try {
          const tokenInfo = await oAuth2Client.getAccessToken();
          if (!tokenInfo.token) {
             console.log("[Auth] Refreshing access token...");
             const { credentials } = await oAuth2Client.refreshAccessToken();
             oAuth2Client.setCredentials(credentials);
          }
      } catch (error: any) {
          console.error("[Auth] FATAL: Failed to refresh access token.", error.message);
          if (error.response) {
              console.error("[Auth] Error details:", error.response.data);
          }
          throw new Error("Invalid Grant: Failed to refresh access token. Please generate a new Refresh Token.");
      }
      
      return oAuth2Client;
  } else {
      console.log("[Auth] Missing OAuth2 credentials (clientId/secret/refreshToken). Falling back to Application Default Credentials.");
      
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
  return google.gmail({ version: 'v1', auth: authClient as any });
};

export const getCalendarClient = async () => {
  const authClient = await getAuthClient();
  return google.calendar({ version: 'v3', auth: authClient as any });
};

export async function getNextCalendarEvent() {
    try {
        const calendar = await getCalendarClient();
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // @ts-ignore
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

export async function listLabels(gmail?: any) {
  const client = gmail || await getGmailClient();
  const res = await client.users.labels.list({ userId: 'me' });
  return res.data.labels;
}

export async function getUserLabels(gmail?: any): Promise<string[]> {
  try {
      const labels = await listLabels(gmail);
      if (!labels) return [];
      
      return labels
          // @ts-ignore
          .filter(l => l.type === 'user') // Only user created labels
          // @ts-ignore
          .map(l => l.name || "")
          .filter((name: string) => name !== "");
  } catch (error) {
      console.error("Failed to fetch user labels:", error);
      return [];
  }
}

export async function moveEmailToCategory(
  messageId: string, 
  categoryLabelName: string,
  existingClient?: any 
) {
  const gmail = existingClient || await getGmailClient();
  
  try {
      let labelId = labelCache[categoryLabelName.toLowerCase()];

      if (!labelId) {
          console.log("Cache miss for label. Fetching label list...");
          const labels = await listLabels(gmail);
          
          if (labels) {
            // @ts-ignore
            labels.forEach(l => {
                if (l.name && l.id) {
                    labelCache[l.name.toLowerCase()] = l.id;
                }
            });
          }
          labelId = labelCache[categoryLabelName.toLowerCase()];
      }

      if (!labelId) {
         console.log(`Label "${categoryLabelName}" does not exist. Creating it...`);
         try {
             const newLabel = await gmail.users.labels.create({
                 userId: 'me',
                 requestBody: {
                     name: categoryLabelName,
                     labelListVisibility: 'labelShow',
                     messageListVisibility: 'show'
                 }
             });
             
             if (newLabel.data && newLabel.data.id) {
                 labelId = newLabel.data.id;
                 labelCache[categoryLabelName.toLowerCase()] = labelId;
             } else {
                 console.warn(`Failed to retrieve ID for newly created label "${categoryLabelName}". Skipping move.`);
                 return;
             }
         } catch (createError) {
             console.error(`Failed to create label ${categoryLabelName}:`, createError);
             return;
         }
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

export async function getInboxCount() {
    try {
        const gmail = await getGmailClient();
        
        // Use the labels API to get the exact unread count for INBOX
        // This is O(1) and exact, unlike messages.list which relies on search indexing
        const label = await gmail.users.labels.get({
            userId: 'me',
            id: 'INBOX'
        });
        
        return label.data.messagesUnread || 0;
    } catch (error) {
        console.error("Failed to fetch inbox count:", error);
        return 0;
    }
}
