// Ensure this is first
import "../src/lib/env-fix";
import { getStats } from "../src/lib/db-service";

async function checkStats() {
    try {
        const stats = await getStats(1);
        console.log("Current Stats for Today:", stats);
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

checkStats();
