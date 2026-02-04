import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// We need to initialize Firebase Admin.
// In Cloud Run (or GCP environments), it can auto-discover credentials 
// if GOOGLE_APPLICATION_CREDENTIALS is set or via default service account.
// However, for local dev, we might need a service account key.

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;

if (!getApps().length) {
  initializeApp({
    projectId: PROJECT_ID,
  });
}

const db = getFirestore();

export const COLLECTION_STATS = 'email_stats';
export const DOC_DAILY_STATS = 'daily_stats';
export const COLLECTION_LOGS = 'email_logs';

export type EmailLog = {
    id: string; // Message ID
    sender: string;
    subject: string;
    category: string;
    timestamp: Date;
    isUrgent: boolean;
};

export async function logEmailProcessing(data: EmailLog) {
    try {
        const batch = db.batch();

        // 1. Save detailed log
        const logRef = db.collection(COLLECTION_LOGS).doc(data.id);
        batch.set(logRef, {
            ...data,
            timestamp: data.timestamp // Ensure date is stored correctly
        });

        // 2. Update aggregate stats (sharded by day for simplicity)
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const statsRef = db.collection(COLLECTION_STATS).doc(today);

        // Atomic increment
        batch.set(statsRef, {
            totalProcessed: 1, // Will use FieldValue.increment in a real update, but merge works for init
            [`categories.${data.category}`]: 1, // This overwrites if using set without merge logic, see below
            lastUpdated: new Date()
        }, { merge: true });
        
        // Correct way to increment fields atomically
        // Since we can't mix set({merge:true}) with simple increments easily in one go without reading first or using update 
        // (which fails if doc doesn't exist), we often use set with merge for the base and then update.
        // For simplicity in this scaffold, let's just use 'set' with merge but we handle counters manually? 
        // No, we should use FieldValue.increment.
        
        // Let's do a transactional update or just separate writes for stats.
        // Simplified approach: Just write the log first.
        
        await logRef.set(data);
        
        // Now update stats safely
        await db.collection(COLLECTION_STATS).doc(today).set({
             lastUpdated: new Date() 
        }, { merge: true });
        
        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection(COLLECTION_STATS).doc(today).update({
            totalProcessed: FieldValue.increment(1),
            [`categories.${data.category}`]: FieldValue.increment(1),
            [`senders.${data.sender.replace(/\./g, '_')}`]: FieldValue.increment(1) // Sanitize key
        }).catch(async (err) => {
             // If update fails (doc likely doesn't exist yet even though we tried set), 
             // it might be race condition or field structure mismatch.
             // Retry with set if 'NOT_FOUND'
             if (err.code === 5) { // NOT_FOUND
                 await db.collection(COLLECTION_STATS).doc(today).set({
                    totalProcessed: 1,
                    categories: { [data.category]: 1 },
                    senders: { [data.sender.replace(/\./g, '_')]: 1 },
                    lastUpdated: new Date()
                 });
             } else {
                 console.error("Error updating stats:", err);
             }
        });

        console.log("Logged email processing to Firestore");

    } catch (error) {
        console.error("Error writing to Firestore:", error);
    }
}

export async function getStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const doc = await db.collection(COLLECTION_STATS).doc(today).get();
        
        if (!doc.exists) {
            return null;
        }
        
        return doc.data();
    } catch (error) {
        console.error("Error fetching stats:", error);
        return null;
    }
}

export async function getRecentLogs(limit = 10) {
    try {
        const snapshot = await db.collection(COLLECTION_LOGS)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
            
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
         console.error("Error fetching logs:", error);
         return [];
    }
}
