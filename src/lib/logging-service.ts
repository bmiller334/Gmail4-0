import "@/lib/env-fix"; 
import { Logging } from '@google-cloud/logging';

// Ensure we have a project ID to avoid initialization errors
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gmail4-0';

let logging: Logging;

try {
    logging = new Logging({ 
        projectId,
        // @ts-ignore
        useGrpc: false, // Fallback to REST for broader compatibility
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

// Filter out noisy logs that don't add value
const EXCLUDED_USER_AGENTS = [
    'Google-HC', // Health checks
    'kube-probe', // Kubernetes probes
];

export async function getSystemLogs(limit = 20, pageToken?: string, search?: string): Promise<{ logs: LogEntry[], nextPageToken?: string }> {
    try {
        // Fetch logs from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const timeString = sevenDaysAgo.toISOString();

        // 1. Base Filter: Cloud Run service logs
        // 2. Exclude health checks (Google-HC) to reduce noise
        // 3. Exclude static asset requests (/_next/)
        // 4. Prioritize application logs over system infrastructure logs
        // 5. Exclude OPTIONS requests (often CORS preflight)
        // 6. Exclude favicon.ico requests
        let filter = `
            resource.type = "cloud_run_revision"
            AND resource.labels.service_name = "nextn-email-sorter"
            AND timestamp >= "${timeString}"
            AND NOT httpRequest.userAgent : "Google-HC"
            AND NOT textPayload : "GET /_next/"
            AND NOT textPayload : "GET /favicon.ico"
            AND NOT httpRequest.requestMethod = "OPTIONS"
        `.replace(/\s+/g, ' ').trim();

        if (search) {
            // Escape double quotes in search term to avoid breaking the filter string
            const safeSearch = search.replace(/"/g, '\\"');
            filter += ` AND "${safeSearch}"`;
        }
        
        const [entries, nextQuery, response] = await logging.getEntries({
            filter,
            orderBy: 'timestamp desc',
            pageSize: limit,
            pageToken: pageToken,
        });
        
        // Transform entries to a cleaner format
        const logs = entries.map(transformEntry).filter(log => {
             // Second layer of filtering in memory for complex patterns or partial matches
             if (log.message.includes("GET /_next/")) return false;
             if (log.message.includes("GET /favicon.ico")) return false;
             if (log.message.startsWith("OPTIONS ")) return false;
             return true;
        });

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
    
    // Attempt to extract the most meaningful message
    try {
        // 1. Check for standard data payload (jsonPayload)
        if (entry.data) {
            if (typeof entry.data === 'string') {
                message = entry.data;
            } else if (typeof entry.data === 'object') {
                // Prioritize 'message' field, then 'textPayload', then 'msg'
                message = entry.data.message || entry.data.textPayload || entry.data.msg || "";
                
                // If message is still empty, try to stringify the object responsibly
                if (!message && Object.keys(entry.data).length > 0) {
                     // If it has httpRequest, it might be a structured log that just has metadata
                     if (entry.data.httpRequest) {
                         const req = entry.data.httpRequest;
                         // Construct a readable request log line
                         message = `${req.requestMethod || 'REQ'} ${req.status || 0} ${req.requestUrl || '/'} (${req.latency || '0s'})`;
                     } else {
                        try {
                             message = JSON.stringify(entry.data);
                        } catch (e) {
                             message = "[Complex Object]";
                        }
                     }
                }
            }
        } 
        
        // 2. Check for textPayload (usually stdout/stderr)
        if (!message && entry.metadata?.textPayload) {
            message = entry.metadata.textPayload;
        }

        // 3. Handle Cloud Run Request Logs (Special Case)
        // These logs have httpRequest metadata but often no data payload in the main object
        if (!message && entry.metadata?.httpRequest) {
            const req = entry.metadata.httpRequest;
            message = `${req.requestMethod || 'REQ'} ${req.status || 0} ${req.requestUrl || '/'} (${req.latency || '0s'})`;
        }

        // 4. Final Fallback
        if (!message) {
            message = "No message content";
        }

    } catch (e) {
        message = "Error parsing log message";
    }

    // Timestamp Handling
    let timestamp = new Date().toISOString();
    try {
        const rawTs = entry.metadata?.timestamp || entry.timestamp;
        if (rawTs) {
            timestamp = new Date(rawTs).toISOString();
        }
    } catch (e) { }

    // Severity & Resource Type
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
