import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gmail4-0' });
}
const db = getFirestore();
db.collection('settings').doc('recent_summary_cache').delete().then(() => {
    console.log('Cache cleared successfully!');
    process.exit(0);
});
