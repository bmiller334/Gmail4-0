import { getGmailClient } from "../src/lib/gmail-service";

async function listGmailLabels() {
  try {
    // We need to delete this env var to force local gcloud auth if running locally
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    console.log("Authenticating with Gmail...");
    const gmail = await getGmailClient();
    
    console.log("Fetching labels...");
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels;

    if (labels && labels.length > 0) {
      console.log("\n--- Your Actual Gmail Labels ---");
      labels.forEach(label => {
        // Filter out system labels (CATEGORY_*, IMPORTANT, etc) if you want, 
        // but showing all is safer for debugging.
        console.log(`- ${label.name} (ID: ${label.id}, Type: ${label.type})`);
      });
      console.log("--------------------------------\n");
      
      console.log("NOTE: The AI is currently using this hardcoded list in src/lib/categories.ts:");
      const { EMAIL_CATEGORIES } = require("../src/lib/categories");
      console.log(EMAIL_CATEGORIES);
      
    } else {
      console.log("No labels found.");
    }
  } catch (error) {
    console.error("Error fetching labels:", error);
  }
}

listGmailLabels();
