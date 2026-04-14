import { config } from 'dotenv';
config({ path: '.env.local' });
import { getGmailClient } from '../src/lib/gmail-service';

async function main() {
    const gmail = await getGmailClient();
    
    // Check INBOX label
    const labelRes = await gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
    console.log("INBOX Label UNREAD count:", labelRes.data.messagesUnread);
    
    // Check with query
    const queryRes = await gmail.users.messages.list({
        userId: 'me',
        q: 'label:INBOX category:primary is:unread',
        maxResults: 1 // just need an estimatable count/check
    });
    console.log("INBOX Primary Unread count estimated from list:", queryRes.data.resultSizeEstimate);
    
    // Another query
    const queryRes2 = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox -category:promotions -category:social is:unread',
        maxResults: 1
    });
    console.log("INBOX exclude prom/soc Unread count estimated:", queryRes2.data.resultSizeEstimate);
}

main().catch(console.error);
