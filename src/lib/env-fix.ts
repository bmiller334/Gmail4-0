// This file exists solely to strip invalid environment variables before other libraries load.
// It must be imported FIRST in any file that uses Firebase or Google Cloud libraries.

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (credPath) {
    let shouldDelete = false;

    if (credPath.includes("path/to/")) {
        shouldDelete = true;
    } else {
        try {
            // Use require to avoid Edge runtime issues if this is ever accidentally imported there
            const fs = require('fs');
            if (!fs.existsSync(credPath)) {
                shouldDelete = true;
            }
        } catch (e) {
            // Ignore fs errors
        }
    }

    if (shouldDelete) {
        // console.log("[EnvFix] Removing invalid GOOGLE_APPLICATION_CREDENTIALS as the file does not exist.");
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
}
