import { Logging } from '@google-cloud/logging';

// Hardcoded fallback for debugging, or ensure GOOGLE_CLOUD_PROJECT_ID is set in .env
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gmail4-0';

console.log(`Initializing Cloud Logging for project: ${projectId}`);

// Initialize the client
const logging = new Logging({ projectId });

export type LogEntry = {
  timestamp: string;
  severity: string;
  message: string;
  resourceType: string;
  id: string;
};

export async function getRecentErrorLogs(limit = 10): Promise<LogEntry[]> {
  try {
    const filter = `
      severity >= ERROR
      timestamp >= "-86400s"
    `.trim();

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
        const filter = `timestamp >= "-604800s"`; // Last 7 days
        
        console.log(`Fetching logs for ${projectId} with filter: ${filter}`);

        const [entries, nextQuery, response] = await logging.getEntries({
            filter,
            orderBy: 'timestamp desc',
            pageSize: limit,
            pageToken: pageToken,
        });
        
        console.log(`Fetched ${entries.length} log entries.`);

        const logs = entries.map(transformEntry);
        // @ts-ignore
        const nextPageToken = response?.nextPageToken || undefined;

        return { logs, nextPageToken };
    } catch (error: any) {
        console.error("Failed to fetch system logs:", error);
        // Log the full error structure to help debug
        if (error.response) {
             console.error("API Error Response:", JSON.stringify(error.response.data, null, 2));
        }
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
