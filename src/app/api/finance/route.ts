import { getSheetsClient } from "@/lib/gmail-service";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Helper to pull from Firestore settings if available
async function getSpreadsheetConfig() {
    try {
        const { getFirestore } = require('firebase-admin/firestore');
        const db = getFirestore();
        const doc = await db.collection('settings').doc('finance').get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (e) {
        console.warn("Firestore not available or configuration missing:", e);
    }
    return null;
}

export async function GET() {
    let isMock = true;
    let spreadsheetId = process.env.PERSONAL_FINANCE_SPREADSHEET_ID || null;

    // Try fetching from Firestore if not in env
    if (!spreadsheetId) {
        const config = await getSpreadsheetConfig();
        if (config?.spreadsheetId) {
            spreadsheetId = config.spreadsheetId;
        }
    }

    // Default mock data (very detailed and realistic for a premium dashboard feel)
    const mockCategories = [
        { category: "Housing & Rent", amount: 1450, color: "#f59e0b" }, // Amber
        { category: "Groceries", amount: 480, color: "#10b981" }, // Emerald
        { category: "Dining Out", amount: 260, color: "#ef4444" }, // Red
        { category: "Utilities & Gas", amount: 220, color: "#3b82f6" }, // Blue
        { category: "Subscriptions", amount: 85, color: "#8b5cf6" }, // Purple
        { category: "Savings & Investments", amount: 800, color: "#ec4899" }, // Pink
    ];

    const mockTrend = [
        { month: "Jan", Income: 4800, Expenses: 2850, Savings: 1950 },
        { month: "Feb", Income: 4800, Expenses: 3100, Savings: 1700 },
        { month: "Mar", Income: 5000, Expenses: 2790, Savings: 2210 },
        { month: "Apr", Income: 4800, Expenses: 3400, Savings: 1400 },
        { month: "May", Income: 5200, Expenses: 2950, Savings: 2250 },
        { month: "Jun", Income: 5200, Expenses: 2495, Savings: 2705 }
    ];

    if (spreadsheetId) {
        try {
            const sheets = await getSheetsClient();
            
            // Read standard range from Sheet1 (A1 to D100 for categories or transactions)
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: "Sheet1!A1:D100",
            });

            const rows = response.data.values;
            if (rows && rows.length > 1) {
                // If the user has data in their spreadsheet, we parse it.
                // Simple parsing logic: Expects headers: Category, Amount (or Month, Income, Expenses)
                // For demonstration, if we successfully fetch sheets, we can return the parsed sheet values.
                isMock = false;
                
                // Let's assume a basic structure in their Sheet1:
                // Category | Amount
                const categories: any[] = [];
                const colors = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];
                
                rows.slice(1).forEach((row, i) => {
                    const category = row[0];
                    const amount = parseFloat((row[1] || "").replace(/[^0-9.]/g, ''));
                    if (category && !isNaN(amount)) {
                        categories.push({
                            category,
                            amount,
                            color: colors[i % colors.length]
                        });
                    }
                });

                if (categories.length > 0) {
                    return NextResponse.json({
                        isMock: false,
                        spreadsheetId,
                        categories,
                        trend: mockTrend // Keep the trend visual mock unless they also have trend sheet
                    });
                }
            }
        } catch (error: any) {
            console.error("Failed to fetch Google Sheet finance data:", error.message);
            // Graceful fallback to mock so UI doesn't break
        }
    }

    return NextResponse.json({
        isMock,
        spreadsheetId,
        categories: mockCategories,
        trend: mockTrend
    });
}
