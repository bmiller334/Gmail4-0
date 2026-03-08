import { google } from "googleapis";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  // Calculate dynamic redirect URI based on the request host
  const host = request.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  // The redirect URI must match exactly what is in Google Cloud Console
  // We'll construct it dynamically so it works on localhost and production
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

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

  return NextResponse.json({ url });
}
