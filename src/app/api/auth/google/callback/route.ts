import { google } from "googleapis";
import { NextResponse } from "next/server";
import { saveRefreshToken } from "@/lib/db-service";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `Google Auth Error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  // Construct the redirect URI exactly as it was sent in the initial request
  const host = request.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  
  // Use explicit environment variable for Google's OAuth validation to prevent mismatch
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      console.log("Successfully retrieved new refresh token. Saving to Firestore...");
      await saveRefreshToken(tokens.refresh_token);
      return NextResponse.redirect(`${protocol}://${host}/logs?auth=success`);
    } else {
      console.warn("No refresh token returned. User might have already granted access.");
      // Even if no refresh token, we might have an access token, but for this app we need refresh token.
      // Usually happens if 'prompt: consent' was not used or user already approved.
      return NextResponse.redirect(`${protocol}://${host}/logs?auth=partial`);
    }

  } catch (err: any) {
    console.error("Error exchanging code for token:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
