import { google } from "googleapis";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  // Use explicit environment variable for redirect URI (required for stable OAuth)
  // Fall back to localhost if not specified
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  console.log("---------------------------------------------------");
  console.log("Generated Redirect URI:", redirectUri);
  console.log("Please ensure this URI is added to your Google Cloud Console > Credentials > Authorized redirect URIs");
  console.log("---------------------------------------------------");

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing Client ID or Secret" }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force new refresh token
    scope: scopes,
  });

  // Return the redirectUri as well so the client can display it if needed
  return NextResponse.json({ url, redirectUri });
}
