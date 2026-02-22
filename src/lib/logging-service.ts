import "@/lib/env-fix"; 
import { Logging } from '@google-cloud/logging';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gmail4-0';

let logging: Logging;

try {
    logging = new Logging({ 
        projectId,
        // @ts-ignore
        useGrpc: false,
    });
} catch (err) {
    console.error("Failed to initialize Google Cloud Logging client:", err);
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

export async function getSystemLogs(limit = 50, pageToken?: string): Promise<{ logs: LogEntry[], nextPageToken?: string }> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const timeString = sevenDaysAgo.toISOString();

        const filter = `
            resource.type="cloud_run_revision"
            AND resource.labels.service_name="nextn-email-sorter"
            AND timestamp >= "${timeString}"
        `.replace(/\s+/g, ' ').trim();
        
        const [entries, nextQuery, response] = await logging.getEntries({
            filter,
            orderBy: 'timestamp desc',
            pageSize: limit,
            pageToken: pageToken,
        });
        
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
    let message = "";
    
    try {
        // 1. Check for standard data payload
        if (entry.data) {
            if (typeof entry.data === 'string') {
                message = entry.data;
            } else if (typeof entry.data === 'object') {
                message = entry.data.message || entry.data.textPayload || entry.data.msg || "";
                
                // If it's still empty, it might be a structured log with other fields
                if (!message && Object.keys(entry.data).length > 0) {
                    // Avoid stringifying large objects if possible, but fallback to it
                    message = JSON.stringify(entry.data);
                }
            }
        } 
        
        // 2. Check for textPayload in metadata
        if (!message && entry.metadata?.textPayload) {
            message = entry.metadata.textPayload;
        }

        // 3. Handle Cloud Run Request Logs (Special Case)
        // These logs have httpRequest metadata but often no data payload
        if (!message && entry.metadata?.httpRequest) {
            const req = entry.metadata.httpRequest;
            message = `${req.requestMethod} ${req.status} ${req.requestUrl} (${req.latency || '0s'})`;
        }

        // 4. Final Fallback
        if (!message) {
            message = "No message content";
        }

    } catch (e) {
        message = "Error parsing log message";
    }

    let timestamp = new Date().toISOString();
    try {
        const rawTs = entry.metadata?.timestamp || entry.timestamp;
        if (rawTs) {
            timestamp = new Date(rawTs).toISOString();
        }
    } catch (e) { }

    const severity = entry.metadata?.severity || entry.severity || 'DEFAULT';
    const resourceType = entry.metadata?.resource?.type || 'unknown';
    const id = entry.metadata?.insertId || entry.id || Math.random().toString(36).substring(7);

    return {
        timestamp,
        severity: String(severity),
        message: String(message),
        resourceType: String(resourceType),
        id: String(id)
    };
}

export async function getRecentErrorLogs(limit = 10): Promise<LogEntry[]> {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const timeString = oneDayAgo.toISOString();

        const filter = `
            resource.type="cloud_run_revision"
            AND resource.labels.service_name="nextn-email-sorter"
            AND severity >= ERROR 
            AND timestamp >= "${timeString}"
        `.replace(/\s+/g, ' ').trim();

        const [entries] = await logging.getEntries({
            filter,
            orderBy: 'timestamp desc',
            pageSize: limit,
        });

        return entries.map(transformEntry);
    } catch (error) {
        return [];
    }
}
