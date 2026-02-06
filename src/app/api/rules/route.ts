import { NextResponse } from 'next/server';
import { addSenderRule, deleteSenderRule } from '@/lib/db-service';
import { EMAIL_CATEGORIES } from '@/lib/categories';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        if (!body.sender || !body.category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!EMAIL_CATEGORIES.includes(body.category)) {
             return NextResponse.json({ error: "Invalid category" }, { status: 400 });
        }

        const id = await addSenderRule({
            sender: body.sender,
            category: body.category,
            createdAt: new Date()
        });

        return NextResponse.json({ id, message: "Rule added" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to add rule" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });
        }

        await deleteSenderRule(id);
        return NextResponse.json({ message: "Rule deleted" });
    } catch (error) {
         return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
    }
}
