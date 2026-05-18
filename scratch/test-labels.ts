import { getGmailClient } from '../src/lib/gmail-service';

async function test() {
    const gmail = await getGmailClient();
    const res = await gmail.users.labels.list({ userId: 'me' });
    console.log(res.data.labels?.slice(0, 5));
}
test();
