import { NextResponse } from 'next/server';
import { getRecentLogs } from '@/lib/db-service';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const logs = await getRecentLogs(50);
        // Find the most recent log with an OTP code
        const otpLogs = logs.filter(log => log.otpCode && log.otpCode.trim().length > 0);
        
        if (otpLogs.length === 0) {
            return NextResponse.json({ otp: null });
        }

        const latestOtpLog = otpLogs[0];

        return NextResponse.json({
            otp: {
                id: latestOtpLog.id,
                code: latestOtpLog.otpCode,
                sender: latestOtpLog.sender,
                subject: latestOtpLog.subject,
                timestamp: latestOtpLog.timestamp,
            }
        });
    } catch (error: any) {
        console.error("Error fetching latest OTP:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
