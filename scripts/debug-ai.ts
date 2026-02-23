
import { classifyEmail } from '../src/ai/email-classifier';
import * as dotenv from 'dotenv';
dotenv.config();

// FIX: Remove credential placeholder if present
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.includes('placeholder')) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

async function test() {
    console.log("Testing AI Classification...");
    
    if (!process.env.GOOGLE_GENAI_API_KEY) {
        console.error("GOOGLE_GENAI_API_KEY is missing!");
        return;
    }

    const testEmail = {
        subject: process.argv[2] || "Your Weekly Digest: Top Tech News",
        sender: process.argv[3] || "newsletter@techcrunch.com",
        snippet: process.argv[4] || "Here are the top stories from this week. Apple announces new iPhone..."
    };

    console.log(`Input: Subject="${testEmail.subject}", Sender="${testEmail.sender}"`);

    try {
        const result = await classifyEmail(testEmail);
        console.log("\nResult:");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
