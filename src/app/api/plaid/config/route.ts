import { NextRequest, NextResponse } from "next/server";
import { getPlaidConfig, savePlaidConfig, getLinkedItems } from "@/lib/plaid-service";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const config = await getPlaidConfig();
        const linkedItems = await getLinkedItems();
        
        // Expose settings safely without leaking the Plaid Secret key
        return NextResponse.json({
            isConfigured: !!(config.clientId && config.secret),
            env: config.env,
            clientId: config.clientId ? `${config.clientId.substring(0, 6)}...` : null,
            linkedItems: linkedItems.map(item => ({
                itemId: item.itemId,
                institutionId: item.institutionId,
                institutionName: item.institutionName,
                linkedAt: item.linkedAt
            }))
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to retrieve configuration" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { clientId, secret, env } = await req.json();
        
        if (!clientId || !secret || !env) {
            return NextResponse.json({ error: "Missing required fields: clientId, secret, env" }, { status: 400 });
        }

        if (env !== 'sandbox' && env !== 'development' && env !== 'production') {
            return NextResponse.json({ error: "Invalid env field. Must be 'sandbox', 'development', or 'production'" }, { status: 400 });
        }

        await savePlaidConfig(clientId, secret, env);
        
        return NextResponse.json({ success: true, message: "Plaid configuration saved successfully." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to save configuration" }, { status: 500 });
    }
}
