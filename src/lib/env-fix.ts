// This file exists solely to strip invalid environment variables before other libraries load.
// It must be imported FIRST in any file that uses Firebase or Google Cloud libraries.

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && 
    (process.env.GOOGLE_APPLICATION_CREDENTIALS.includes("path/to/") || 
     process.env.GOOGLE_APPLICATION_CREDENTIALS.includes("service-account-key.json"))) {
    
    // console.log("[EnvFix] Removing invalid GOOGLE_APPLICATION_CREDENTIALS placeholder.");
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}
