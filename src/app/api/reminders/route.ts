import { NextRequest, NextResponse } from "next/server";
import { getPendingReminders, dismissReminder } from "@/lib/db-service";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const reminders = await getPendingReminders();
        return NextResponse.json({ reminders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;
        if (!id) {
            return NextResponse.json({ error: "Missing reminder ID" }, { status: 400 });
        }
        await dismissReminder(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
