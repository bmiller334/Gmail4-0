import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

async function testAuth() {
  console.log("--- Debugging Auth ---");
  console.log(`Client ID present: ${!!CLIENT_ID} (Length: ${CLIENT_ID?.length})`);
  console.log(`Client Secret present: ${!!CLIENT_SECRET} (Length: ${CLIENT_SECRET?.length})`);
  console.log(`Refresh Token present: ${!!REFRESH_TOKEN} (Length: ${REFRESH_TOKEN?.length})`);

  try {
    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oAuth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    console.log("Attempting to get Access Token...");
    const accessTokenResponse = await oAuth2Client.getAccessToken();
    console.log("Access Token received successfully!");
    console.log("Token:", accessTokenResponse.token?.substring(0, 10) + "...");
    
    // If that works, try a simple Gmail call
    console.log("Attempting to list labels...");
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const labels = await gmail.users.labels.list({ userId: 'me' });
    console.log("Labels listed successfully. Count:", labels.data.labels?.length);

  } catch (error: any) {
    console.error("Auth Failed!");
    console.error("Error Message:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
    }
  }
}

testAuth();
