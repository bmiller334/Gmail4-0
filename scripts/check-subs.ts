import { PubSub } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';

dotenv.config();

// FIX: Remove the placeholder creds path so the library uses local gcloud auth
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

async function listSubscriptions() {
  if (!projectId) {
      console.error("GOOGLE_CLOUD_PROJECT_ID not found in .env");
      return;
  }
  
  console.log(`Checking subscriptions for project: ${projectId}`);
  
  try {
      const pubsub = new PubSub({ projectId });
      const [subscriptions] = await pubsub.getSubscriptions();
      
      if (subscriptions.length === 0) {
          console.log("No subscriptions found.");
      }
      
      for (const sub of subscriptions) {
        const metadata = await sub.getMetadata();
        const config = metadata[0];
        
        console.log(`\nSubscription: ${sub.name}`);
        console.log(`  Topic: ${config.topic}`);
        console.log(`  Push Endpoint: ${config.pushConfig?.pushEndpoint || 'NONE (Pull Subscription)'}`);
        console.log(`  State: ${config.state}`);
      }
  } catch (error: any) {
      console.error("Error fetching subscriptions:", error.message);
      console.error("Make sure you are authenticated via 'gcloud auth application-default login'");
  }
}

listSubscriptions().catch(console.error);
