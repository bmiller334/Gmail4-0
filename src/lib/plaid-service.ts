import "./env-fix"; // MUST BE FIRST IMPORT
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { getFirestore } from 'firebase-admin/firestore';

export interface PlaidConfig {
    clientId: string | null;
    secret: string | null;
    env: 'sandbox' | 'development' | 'production';
}

export interface LinkedItem {
    itemId: string;
    accessToken: string;
    institutionId: string;
    institutionName: string;
    linkedAt: string;
}

const COLLECTION_SETTINGS = 'settings';
const DOC_PLAID = 'plaid';

/**
 * Fetch Plaid configuration from Firestore with a fallback to process.env
 */
export async function getPlaidConfig(): Promise<PlaidConfig> {
    try {
        const db = getFirestore();
        const doc = await db.collection(COLLECTION_SETTINGS).doc(DOC_PLAID).get();
        
        if (doc.exists) {
            const data = doc.data();
            return {
                clientId: data?.clientId || process.env.PLAID_CLIENT_ID || null,
                secret: data?.secret || process.env.PLAID_SECRET || null,
                env: (data?.env || process.env.PLAID_ENV || 'sandbox') as 'sandbox' | 'development' | 'production'
            };
        }
    } catch (e) {
        console.warn("Firestore not initialized or accessible in getPlaidConfig, using env:", e);
    }

    return {
        clientId: process.env.PLAID_CLIENT_ID || null,
        secret: process.env.PLAID_SECRET || null,
        env: (process.env.PLAID_ENV || 'sandbox') as 'sandbox' | 'development' | 'production'
    };
}

/**
 * Save Plaid credentials to Firestore
 */
export async function savePlaidConfig(clientId: string, secret: string, env: 'sandbox' | 'development' | 'production'): Promise<void> {
    const db = getFirestore();
    await db.collection(COLLECTION_SETTINGS).doc(DOC_PLAID).set({
        clientId,
        secret,
        env,
        updatedAt: new Date()
    }, { merge: true });
}

/**
 * Initialize and return Plaid API Client
 */
export async function getPlaidClient(): Promise<PlaidApi> {
    const config = await getPlaidConfig();
    if (!config.clientId || !config.secret) {
        throw new Error("Plaid credentials are not configured. Please supply them in dashboard settings or .env");
    }

    const basePath = PlaidEnvironments[config.env] || PlaidEnvironments.sandbox;
    
    const configuration = new Configuration({
        basePath,
        baseOptions: {
            headers: {
                'PLAID-CLIENT-ID': config.clientId,
                'PLAID-SECRET': config.secret,
            },
        },
    });

    return new PlaidApi(configuration);
}

/**
 * Fetch all securely linked financial items (with access tokens)
 */
export async function getLinkedItems(): Promise<LinkedItem[]> {
    try {
        const db = getFirestore();
        const doc = await db.collection(COLLECTION_SETTINGS).doc(DOC_PLAID).get();
        if (doc.exists) {
            return doc.data()?.linkedItems || [];
        }
    } catch (e) {
        console.error("Failed to fetch linked Plaid items from Firestore:", e);
    }
    return [];
}

/**
 * Save a newly linked Plaid item/access token to Firestore
 */
export async function saveLinkedItem(item: Omit<LinkedItem, 'linkedAt'>): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_SETTINGS).doc(DOC_PLAID);
    
    const currentItems = await getLinkedItems();
    
    // Check if item already exists and replace it, otherwise append
    const filteredItems = currentItems.filter(i => i.itemId !== item.itemId);
    const newItem: LinkedItem = {
        ...item,
        linkedAt: new Date().toISOString()
    };
    
    await docRef.set({
        linkedItems: [...filteredItems, newItem],
        updatedAt: new Date()
    }, { merge: true });
}

/**
 * Disconnect a linked Plaid item and revoke its access token
 */
export async function disconnectLinkedItem(itemId: string): Promise<boolean> {
    try {
        const db = getFirestore();
        const docRef = db.collection(COLLECTION_SETTINGS).doc(DOC_PLAID);
        
        const currentItems = await getLinkedItems();
        const targetItem = currentItems.find(i => i.itemId === itemId);
        
        if (!targetItem) {
            return false;
        }

        // Try calling Plaid API to revoke the access token
        try {
            const client = await getPlaidClient();
            await client.itemRemove({
                access_token: targetItem.accessToken
            });
            console.log(`Successfully revoked Plaid access token for item: ${itemId}`);
        } catch (plaidErr: any) {
            // Log error but proceed to delete from Firestore so UI is not stuck
            console.warn(`Plaid API item removal failed for ${itemId}, removing from DB anyway:`, plaidErr?.message || plaidErr);
        }

        // Remove from Firestore
        const filteredItems = currentItems.filter(i => i.itemId !== itemId);
        await docRef.set({
            linkedItems: filteredItems,
            updatedAt: new Date()
        }, { merge: true });
        
        return true;
    } catch (e) {
        console.error("Failed to disconnect Plaid item:", e);
        throw e;
    }
}
