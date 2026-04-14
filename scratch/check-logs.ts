import { getSystemLogs } from './src/lib/logging-service';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkLogs() {
  console.log("Fetching system logs...");
  try {
    const { logs } = await getSystemLogs(20);
    console.log("Recent Logs:");
    logs.forEach(log => {
      console.log(`[${log.timestamp}] [${log.severity}] ${log.message}`);
    });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
  }
}

checkLogs();
