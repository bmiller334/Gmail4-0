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
export const COLLECTION_CORRECTIONS = 'email_corrections';
export const COLLECTION_URGENCY_CORRECTIONS = 'email_urgency_corrections'; // New collection
export const COLLECTION_RULES = 'email_rules';
export const COLLECTION_NOTES = 'store_notes'; // New collection for shift notes

export type EmailLog = {
    id: string; // Message ID
    sender: string;
    subject: string;
    category: string;
    timestamp: Date;
    isUrgent: boolean;
    snippet?: string; // Added snippet to logs so we can use it for training
    reasoning?: string; // New field for AI reasoning
};

export type EmailCorrection = {
    id: string; // usually same as email ID
    sender: string;
    subject: string;
    snippet: string;
    wrongCategory: string;
    correctCategory: string;
    timestamp: Date;
};

// New type for urgency corrections
export type UrgencyCorrection = {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    wasUrgent: boolean; // What the AI thought
    shouldBeUrgent: boolean; // What the user says
    timestamp: Date;
};

export type SenderRule = {
    id?: string;
    sender: string; // can be partial match or exact email
    category: string;
    createdAt: Date;
};

export type StoreNote = {
    id: string;
    content: string;
    createdAt: Date;
    author: string; // Could be 'Manager', 'User', etc.
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
        // We use set with merge for the initial creation if needed, then update for increments
        await logRef.set(data);
        
        // Now update stats safely
        // Ensure doc exists
        await db.collection(COLLECTION_STATS).doc(today).set({
             lastUpdated: new Date() 
        }, { merge: true });
        
        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection(COLLECTION_STATS).doc(today).update({
            totalProcessed: FieldValue.increment(1),
            [`categories.${data.category}`]: FieldValue.increment(1),
            [`senders.${data.sender.replace(/\./g, '_')}`]: FieldValue.increment(1) // Sanitize key
        }).catch(async (err) => {
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

export async function addCorrection(data: EmailCorrection) {
    try {
        // 1. Save the correction
        await db.collection(COLLECTION_CORRECTIONS).doc(data.id).set(data);

        // 2. Update the original log to reflect the new category
        await db.collection(COLLECTION_LOGS).doc(data.id).update({
            category: data.correctCategory
        });

        console.log("Logged email correction to Firestore");
    } catch (error) {
        console.error("Error adding correction:", error);
    }
}

export async function addUrgencyCorrection(data: UrgencyCorrection) {
    try {
        // 1. Save the urgency correction
        await db.collection(COLLECTION_URGENCY_CORRECTIONS).doc(data.id).set(data);

        // 2. Update the original log
        await db.collection(COLLECTION_LOGS).doc(data.id).update({
            isUrgent: data.shouldBeUrgent
        });
        
        console.log("Logged urgency correction to Firestore");
    } catch (error) {
        console.error("Error adding urgency correction:", error);
    }
}

export async function getCorrections(limit = 20) {
    try {
        // Fetch recent corrections to use as examples
        const snapshot = await db.collection(COLLECTION_CORRECTIONS)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        
        return snapshot.docs.map(doc => doc.data() as EmailCorrection);
    } catch (error) {
        console.error("Error fetching corrections:", error);
        return [];
    }
}

export async function getUrgencyCorrections(limit = 20) {
    try {
        const snapshot = await db.collection(COLLECTION_URGENCY_CORRECTIONS)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => doc.data() as UrgencyCorrection);
    } catch (error) {
        console.error("Error fetching urgency corrections:", error);
        return [];
    }
}

// --- Rules ---

export async function addSenderRule(rule: SenderRule) {
    try {
        const docRef = db.collection(COLLECTION_RULES).doc();
        await docRef.set({
            ...rule,
            id: docRef.id
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding rule:", error);
        throw error;
    }
}

export async function getSenderRules() {
    try {
        const snapshot = await db.collection(COLLECTION_RULES).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SenderRule));
    } catch (error) {
        console.error("Error fetching rules:", error);
        return [];
    }
}

export async function deleteSenderRule(id: string) {
    try {
        await db.collection(COLLECTION_RULES).doc(id).delete();
    } catch (error) {
        console.error("Error deleting rule:", error);
        throw error;
    }
}


export async function getStats(days = 1) {
    try {
        if (days === 1) {
             const today = new Date().toISOString().split('T')[0];
             const doc = await db.collection(COLLECTION_STATS).doc(today).get();
             if (!doc.exists) return null;
             return doc.data();
        } else {
            // Get last N days for charts
             const today = new Date();
             const promises = [];
             for(let i=0; i<days; i++) {
                 const d = new Date(today);
                 d.setDate(d.getDate() - i);
                 const dateStr = d.toISOString().split('T')[0];
                 promises.push(db.collection(COLLECTION_STATS).doc(dateStr).get());
             }
             
             const docs = await Promise.all(promises);
             return docs.map((d, i) => {
                 const date = new Date(today);
                 date.setDate(date.getDate() - i);
                 return {
                     date: date.toISOString().split('T')[0],
                     ...(d.exists ? d.data() : { totalProcessed: 0 })
                 };
             }).reverse();
        }

    } catch (error) {
        console.error("Error fetching stats:", error);
        return null;
    }
}

export async function getRecentLogs(limit = 50, filter?: { search?: string, category?: string }) {
    try {
        let query = db.collection(COLLECTION_LOGS).orderBy('timestamp', 'desc');

        if (filter?.category && filter.category !== 'All') {
            query = query.where('category', '==', filter.category);
        }
        
        // Note: Firestore doesn't support full-text search natively. 
        // For simple partial matching on sender/subject, we'd need a third-party service like Algolia or Typesense.
        // Or we can fetch more and filter in memory if the dataset is small (which it is for a personal inbox).
        
        const snapshot = await query.limit(limit).get();
        let logs = snapshot.docs.map(doc => doc.data() as EmailLog);

        if (filter?.search) {
            const searchLower = filter.search.toLowerCase();
            logs = logs.filter(log => 
                log.subject.toLowerCase().includes(searchLower) || 
                log.sender.toLowerCase().includes(searchLower)
            );
        }

        return logs;
    } catch (error) {
         console.error("Error fetching logs:", error);
         return [];
    }
}

// Function to find high confidence patterns
export async function findSenderPatterns(minOccurrences = 5, confidenceThreshold = 1.0) {
    try {
        // Fetch recent logs (last 500 should be enough for patterns)
        const snapshot = await db.collection(COLLECTION_LOGS)
            .orderBy('timestamp', 'desc')
            .limit(500)
            .get();
            
        const logs = snapshot.docs.map(doc => doc.data() as EmailLog);
        
        // Group by sender
        const senderStats: Record<string, { [category: string]: number }> = {};
        
        logs.forEach(log => {
             // Simplify sender (extract email only ideally, but simple string match for now)
             const sender = log.sender.toLowerCase();
             if (!senderStats[sender]) {
                 senderStats[sender] = {};
             }
             if (!senderStats[sender][log.category]) {
                 senderStats[sender][log.category] = 0;
             }
             senderStats[sender][log.category]++;
        });

        const suggestions: { sender: string, category: string, confidence: number, count: number }[] = [];

        Object.entries(senderStats).forEach(([sender, categories]) => {
             const total = Object.values(categories).reduce((a, b) => a + b, 0);
             if (total < minOccurrences) return;

             // Find dominant category
             let dominantCategory = '';
             let dominantCount = 0;
             
             Object.entries(categories).forEach(([cat, count]) => {
                 if (count > dominantCount) {
                     dominantCount = count;
                     dominantCategory = cat;
                 }
             });

             const confidence = dominantCount / total;
             
             if (confidence >= confidenceThreshold) {
                 suggestions.push({
                     sender,
                     category: dominantCategory,
                     confidence,
                     count: total
                 });
             }
        });

        // Filter out existing rules
        const existingRules = await getSenderRules();
        const existingSenders = new Set(existingRules.map(r => r.sender.toLowerCase()));
        
        return suggestions.filter(s => !existingSenders.has(s.sender));

    } catch (error) {
        console.error("Error finding patterns:", error);
        return [];
    }
}

// --- Store Notes ---

export async function addStoreNote(content: string) {
    try {
        const docRef = db.collection(COLLECTION_NOTES).doc();
        await docRef.set({
            id: docRef.id,
            content,
            createdAt: new Date(),
            author: 'Manager' // Placeholder for now
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding note:", error);
        throw error;
    }
}

export async function getStoreNotes() {
    try {
        const snapshot = await db.collection(COLLECTION_NOTES)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        return snapshot.docs.map(doc => doc.data() as StoreNote);
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
}

export async function deleteStoreNote(id: string) {
    try {
        await db.collection(COLLECTION_NOTES).doc(id).delete();
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
}
