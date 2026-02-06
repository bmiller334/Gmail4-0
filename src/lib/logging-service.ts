import "@/lib/env-fix"; // Ensure env vars are cleaned first
import { Logging } from '@google-cloud/logging';

// Hardcoded fallback for debugging, or ensure GOOGLE_CLOUD_PROJECT_ID is set in .env
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gmail4-0';

// Initialize the client
// IMPORTANT: Force REST (useGrpc: false) to avoid connection issues in Next.js dev mode & Cloud Run environments
let logging: Logging;

try {
    logging = new Logging({ 
        projectId,
        // @ts-ignore
        useGrpc: false,
    });
} catch (err) {
    console.error("Failed to initialize Google Cloud Logging client:", err);
    // Fallback to a dummy object so the app doesn't crash on boot
    // @ts-ignore
    logging = {
        getEntries: async () => [[], null, null]
    };
}

export type LogEntry = {
  timestamp: string;
  severity: string;
  message: string;
  resourceType: string;
  id: string;
};

export async function getRecentErrorLogs(limit = 10): Promise<LogEntry[]> {
  try {
    // Calculate 24h ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const timeString = oneDayAgo.toISOString();

    const filter = `severity >= ERROR AND timestamp >= "${timeString}"`;

    const [entries] = await logging.getEntries({
      filter,
      orderBy: 'timestamp desc',
      pageSize: limit,
    });

    return entries.map(transformEntry);
  } catch (error) {
    console.error("Failed to fetch logs from Google Cloud Logging:", error);
    return [];
  }
}

export async function getSystemLogs(limit = 50, pageToken?: string): Promise<{ logs: LogEntry[], nextPageToken?: string }> {
    try {
        // Calculate 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const timeString = sevenDaysAgo.toISOString();

        // Use absolute timestamp
        const filter = `timestamp >= "${timeString}"`;
        
        console.log(`[Server] Fetching logs for ${projectId} with filter: ${filter}`);

        const [entries, nextQuery, response] = await logging.getEntries({
            filter,
            orderBy: 'timestamp desc',
            pageSize: limit,
            pageToken: pageToken,
        });
        
        console.log(`[Server] Fetched ${entries.length} log entries.`);

        const logs = entries.map(transformEntry);
        // @ts-ignore
        const nextPageToken = response?.nextPageToken || undefined;

        return { logs, nextPageToken };
    } catch (error: any) {
        console.error("Failed to fetch system logs:", error);
        return { logs: [] };
    }
}

function transformEntry(entry: any): LogEntry {
      let message = "Unknown message";
      
      // Payloads can be string, JSON, or proto
      if (typeof entry.data === 'string') {
        message = entry.data;
      } else if (entry.data && typeof entry.data === 'object') {
        // @ts-ignore
        message = entry.data.message || entry.data.textPayload || JSON.stringify(entry.data);
      } else if (entry.message) {
          message = entry.message;
      }

      return {
        timestamp: entry.metadata.timestamp?.toString() || new Date().toISOString(),
        severity: entry.metadata.severity?.toString() || 'DEFAULT',
        message: message,
        resourceType: entry.metadata.resource?.type || 'unknown',
        id: entry.metadata.insertId || Math.random().toString()
      };
}
