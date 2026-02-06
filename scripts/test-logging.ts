import { Logging } from '@google-cloud/logging';

// Force projectId
const projectId = 'gmail4-0';
const logging = new Logging({ projectId });

async function test() {
  console.log(`Testing connection to Cloud Logging for project: ${projectId}...`);
  
  try {
    // Try to list entries
    const [entries] = await logging.getEntries({
      pageSize: 5,
      orderBy: 'timestamp desc'
    });
    
    console.log("Success!");
    console.log(`Fetched ${entries.length} entries.`);
    
    if (entries.length > 0) {
        console.log("Sample Entry:");
        console.log(JSON.stringify(entries[0].metadata, null, 2));
    } else {
        console.log("No entries found (but connection worked).");
    }

  } catch (error: any) {
    console.error("FATAL ERROR:");
    console.error(error.message);
    if (error.code) console.error(`Code: ${error.code}`);
    if (error.details) console.error(`Details: ${error.details}`);
  }
}

test();
