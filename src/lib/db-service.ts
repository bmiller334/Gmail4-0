import "./env-fix"; // MUST BE FIRST IMPORT
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, DocumentData } from 'firebase-admin/firestore'; // Added DocumentData import
import { EMAIL_CATEGORIES } from "@/lib/categories"; 

// The env-fix import above should handle the variable cleanup.
// But we double check here just in case.
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gmail4-0';

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
export const COLLECTION_URGENCY_CORRECTIONS = 'email_urgency_corrections';
export const COLLECTION_RULES = 'email_rules';
export const COLLECTION_NOTES = 'store_notes';
export const COLLECTION_SETTINGS = 'settings'; 
export const DOC_CATEGORIES = 'email_categories'; 

// ... Types ...
export type EmailLog = {
    id: string;
    sender: string;
    subject: string;
    category: string;
    timestamp: Date;
    isUrgent: boolean;
    snippet?: string;
    reasoning?: string;
};

export type EmailCorrection = {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    wrongCategory: string;
    correctCategory: string;
    timestamp: Date;
};

export type UrgencyCorrection = {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    wasUrgent: boolean;
    shouldBeUrgent: boolean;
    timestamp: Date;
};

export type SenderRule = {
    id?: string;
    sender: string;
    category: string;
    createdAt: Date;
};

export type StoreNote = {
    id: string;
    content: string;
    createdAt: Date;
    author: string;
};

// ... Existing Functions ...

export async function logEmailProcessing(data: EmailLog) {
    try {
        const batch = db.batch();
        const logRef = db.collection(COLLECTION_LOGS).doc(data.id);
        batch.set(logRef, { ...data, timestamp: data.timestamp });

        const today = new Date().toISOString().split('T')[0];
        
        // Ensure stat doc exists first
        const statsRef = db.collection(COLLECTION_STATS).doc(today);
        await statsRef.set({ lastUpdated: new Date() }, { merge: true });
        
        const { FieldValue } = require('firebase-admin/firestore');
        await statsRef.update({
            totalProcessed: FieldValue.increment(1),
            [`categories.${data.category}`]: FieldValue.increment(1),
            [`senders.${data.sender.replace(/\./g, '_')}`]: FieldValue.increment(1)
        });
        
        console.log("Logged email processing to Firestore");
    } catch (error) {
        console.error("Error writing to Firestore:", error);
    }
}

export async function addCorrection(data: EmailCorrection) {
    try {
        await db.collection(COLLECTION_CORRECTIONS).doc(data.id).set(data);
        await db.collection(COLLECTION_LOGS).doc(data.id).update({ category: data.correctCategory });
    } catch (error) {
        console.error("Error adding correction:", error);
    }
}

export async function addUrgencyCorrection(data: UrgencyCorrection) {
    try {
        await db.collection(COLLECTION_URGENCY_CORRECTIONS).doc(data.id).set(data);
        await db.collection(COLLECTION_LOGS).doc(data.id).update({ isUrgent: data.shouldBeUrgent });
    } catch (error) {
        console.error("Error adding urgency correction:", error);
    }
}

export async function getCorrections(limit = 20) {
    try {
        const snapshot = await db.collection(COLLECTION_CORRECTIONS).orderBy('timestamp', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => doc.data() as EmailCorrection);
    } catch (error) {
        return [];
    }
}

export async function getUrgencyCorrections(limit = 20) {
    try {
        const snapshot = await db.collection(COLLECTION_URGENCY_CORRECTIONS).orderBy('timestamp', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => doc.data() as UrgencyCorrection);
    } catch (error) {
        return [];
    }
}

export async function addSenderRule(rule: SenderRule) {
    try {
        const docRef = db.collection(COLLECTION_RULES).doc();
        await docRef.set({ ...rule, id: docRef.id });
        return docRef.id;
    } catch (error) { throw error; }
}

export async function getSenderRules() {
    try {
        const snapshot = await db.collection(COLLECTION_RULES).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SenderRule));
    } catch (error) { return []; }
}

export async function deleteSenderRule(id: string) {
    try { await db.collection(COLLECTION_RULES).doc(id).delete(); } catch (error) { throw error; }
}

// ------------------------------------------------------------------
// FIX: Added Overloads so TypeScript knows exactly what is returned
// ------------------------------------------------------------------
export async function getStats(days: 1): Promise<DocumentData | null>;
export async function getStats(days: number): Promise<{ date: string; [key: string]: any }[]>;
export async function getStats(days = 1): Promise<DocumentData | null | { date: string; [key: string]: any }[]> {
    try {
        if (days === 1) {
             const today = new Date().toISOString().split('T')[0];
             const doc = await db.collection(COLLECTION_STATS).doc(today).get();
             if (!doc.exists) return null;
             return doc.data() || null;
        } else {
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

export async function findSenderPatterns(minOccurrences = 5, confidenceThreshold = 1.0) {
    try {
        const snapshot = await db.collection(COLLECTION_LOGS).orderBy('timestamp', 'desc').limit(500).get();
        const logs = snapshot.docs.map(doc => doc.data() as EmailLog);
        const senderStats: Record<string, { [category: string]: number }> = {};
        logs.forEach(log => {
             const sender = log.sender.toLowerCase();
             if (!senderStats[sender]) senderStats[sender] = {};
             if (!senderStats[sender][log.category]) senderStats[sender][log.category] = 0;
             senderStats[sender][log.category]++;
        });
        const suggestions: { sender: string, category: string, confidence: number, count: number }[] = [];
        Object.entries(senderStats).forEach(([sender, categories]) => {
             const total = Object.values(categories).reduce((a, b) => a + b, 0);
             if (total < minOccurrences) return;
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
                 suggestions.push({ sender, category: dominantCategory, confidence, count: total });
             }
        });
        const existingRules = await getSenderRules();
        const existingSenders = new Set(existingRules.map(r => r.sender.toLowerCase()));
        return suggestions.filter(s => !existingSenders.has(s.sender));
    } catch (error) { return []; }
}

export async function addStoreNote(content: string) {
    try {
        const docRef = db.collection(COLLECTION_NOTES).doc();
        await docRef.set({ id: docRef.id, content, createdAt: new Date(), author: 'Manager' });
        return docRef.id;
    } catch (error) { throw error; }
}

export async function getStoreNotes() {
    try {
        const snapshot = await db.collection(COLLECTION_NOTES).orderBy('createdAt', 'desc').limit(20).get();
        return snapshot.docs.map(doc => doc.data() as StoreNote);
    } catch (error) { return []; }
}

export async function deleteStoreNote(id: string) {
    try { await db.collection(COLLECTION_NOTES).doc(id).delete(); } catch (error) { throw error; }
}

// --- Dynamic Categories ---

export async function getStoredCategories(): Promise<string[]> {
    try {
        const doc = await db.collection(COLLECTION_SETTINGS).doc(DOC_CATEGORIES).get();
        if (doc.exists && doc.data()?.categories) {
            return doc.data()?.categories;
        }
        return [...EMAIL_CATEGORIES];
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [...EMAIL_CATEGORIES];
    }
}

export async function saveStoredCategories(categories: string[]) {
    try {
        await db.collection(COLLECTION_SETTINGS).doc(DOC_CATEGORIES).set({
            categories,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error("Error saving categories:", error);
        throw error;
    }
}