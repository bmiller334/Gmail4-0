import { NextResponse } from "next/server";
import { getAiSummaries } from "@/lib/db-service";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const summaries = await getAiSummaries(50);
        return NextResponse.json({ summaries });
    } catch (error: any) {
        console.error("Error fetching AI summaries:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
