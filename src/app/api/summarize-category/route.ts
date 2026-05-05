import { NextRequest, NextResponse } from "next/server";
import { getUnreadEmailsByCategory } from "@/lib/gmail-service";
import { summarizeCategoryEmails } from "@/ai/email-classifier";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const category = body.category;

        if (!category) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }

        const emails = await getUnreadEmailsByCategory(category, 15);
        
        if (emails.length === 0) {
            return NextResponse.json({ summary: "No unread emails found in this category." });
        }

        const summary = await summarizeCategoryEmails({ category, emails });

        return NextResponse.json({ summary });
    } catch (error: any) {
        console.error("Error summarizing category:", error);
        return NextResponse.json({ error: error.message || "Failed to summarize" }, { status: 500 });
    }
}
