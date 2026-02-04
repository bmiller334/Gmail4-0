import { NextResponse } from "next/server";
import { getStats, getRecentLogs } from "@/lib/db-service";

export async function GET() {
    try {
        const stats = await getStats();
        const logs = await getRecentLogs();
        
        return NextResponse.json({ stats, logs });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
