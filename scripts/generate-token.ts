import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import * as dotenv from 'dotenv';
import { IncomingMessage, ServerResponse } from 'http';

dotenv.config();

/**
 * CONFIGURATION
 * Ensure these match your Google Cloud Console settings.
 */
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly'
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in your .env file.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        if (req.url && req.url.startsWith('/oauth2callback')) {
          const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
          const code = qs.get('code');
          
          if (code) {
            res.end('Authentication successful! You can close this tab and check your terminal.');
            
            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code);
            resolve(tokens);
            
            // Gracefully shut down
            server.close();
            process.exit(0);
          }
        } else {
             res.end('Not found');
        }
      } catch (e) {
        res.end('Error during authentication.');
        reject(e);
      }
    });

    server.listen(PORT, () => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Essential for getting a refresh_token
        prompt: 'consent',      // Forces a new refresh_token even if previously authorized
        scope: SCOPES,
      });

      console.log('\n🚀 --- OAUTH2 AUTOMATION --- 🚀');
      console.log(`1. Go to Google Cloud Console > APIs & Services > Credentials.`);
      console.log(`2. Edit your OAuth 2.0 Client ID.`);
      console.log(`3. Add this URI to "Authorized redirect URIs": http://localhost:${PORT}/oauth2callback`);
      console.log(`4. Save.`);
      console.log(`\n👉 Open this URL in your browser:\n\n${authUrl}\n`);
      console.log('Waiting for you to click "Allow"...');
    });
  });
}

getAccessToken().then((tokens: any) => {
  console.log('\n✅ --- SUCCESS! ---');
  if (tokens.refresh_token) {
    console.log('Here is your NEW Refresh Token (valid for Production):');
    console.log(`\n${tokens.refresh_token}\n`);
    console.log('⚠️  ACTION: Update your .env file (and Cloud Run environment variables) with this new token.');
  } else {
    console.log('🤔 No refresh token returned. Did you check "prompt: consent"?');
  }
}).catch(console.error);
