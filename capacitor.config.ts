import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gmail40.app',
  appName: 'Gmail4-0',
  webDir: 'out',
  /*
  // IMPORTANT: Since your Next.js app uses API routes and an active backend, 
  // you might need the Android app to connect to the live hosted version rather 
  // than static files. If so, uncomment the server block below and insert your 
  // deployed app URL.
  server: {
    url: 'https://your-production-app-url.com',
    cleartext: true
  }
  */
};

export default config;
