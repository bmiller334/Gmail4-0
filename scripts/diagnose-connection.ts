import { PubSub } from '@google-cloud/pubsub';
import { GoogleAuth } from 'google-auth-library';
import { run } from 'googleapis/build/src/apis/run';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();
delete process.env.GOOGLE_APPLICATION_CREDENTIALS; // Use gcloud auth

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

async function diagnose() {
  console.log("=== 1. Checking Cloud Run Services ===");
  try {
      // Using gcloud command is often more reliable for quick list than setting up the API client manually
      const services = execSync('gcloud run services list --platform managed --region us-central1 --format="table(SERVICE,URL,LATEST_REVISION)"').toString();
      console.log(services);
  } catch (e) {
      console.log("Could not list services via gcloud. Ensure gcloud is installed and authenticated.");
  }

  console.log("\n=== 2. Checking Pub/Sub Subscriptions ===");
  if (!projectId) {
      console.log("Skipping Pub/Sub check: GOOGLE_CLOUD_PROJECT_ID missing from .env");
      return;
  }

  try {
      const pubsub = new PubSub({ projectId });
      const [subscriptions] = await pubsub.getSubscriptions();
      
      for (const sub of subscriptions) {
        const metadata = await sub.getMetadata();
        const config = metadata[0];
        console.log(`- Subscription: ${sub.name.split('/').pop()}`);
        console.log(`  Target: ${config.pushConfig?.pushEndpoint || 'NONE (Pull)'}`);
      }
  } catch (e: any) {
      console.log("Error checking Pub/Sub:", e.message);
  }
}

diagnose();
