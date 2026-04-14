import { getSystemLogs } from './src/lib/logging-service';
import * as dotenv from 'dotenv';

dotenv.config();

// Ensure project ID is set for local run if not in .env
if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GOOGLE_CLOUD_PROJECT_ID) {
    process.env.GOOGLE_CLOUD_PROJECT_ID = 'gmail4-0';
}

async function checkLogs() {
  console.log(`Fetching system logs for project: ${process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID}...`);
  try {
    const { logs } = await getSystemLogs(20);
    if (!logs || logs.length === 0) {
        console.log("No logs found. This might mean the project ID is wrong or you don't have authentication to Cloud Logging.");
        return;
    }
    console.log("Recent Logs:");
    logs.forEach(log => {
      console.log(`[${log.timestamp}] [${log.severity}] ${log.message}`);
    });
  } catch (error: any) {
    console.error("Failed to fetch logs:", error.message);
  }
}

checkLogs();
