import "../src/lib/env-fix"; // MUST BE FIRST IMPORT
import { logEmailProcessing, getRecentLogs } from "../src/lib/db-service";

async function run() {
    console.log("Logging test email...");
    await logEmailProcessing({
        id: "TEST-" + Date.now(),
        sender: "test@example.com",
        subject: "Test Subject " + Date.now(),
        category: "Work",
        timestamp: new Date(),
        isUrgent: false,
        snippet: "Test snippet for logging verification",
        reasoning: "This is a test reasoning logged by AI assistant."
    });
    console.log("Logged test email.");

    console.log("Fetching recent logs to verify...");
    const logs = await getRecentLogs(5);
    console.log("Recent logs:", JSON.stringify(logs, null, 2));
}

run().catch(console.error);
