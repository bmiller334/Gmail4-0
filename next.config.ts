import fs from 'fs';
import { execSync } from 'child_process';
import type {NextConfig} from 'next';

// FIX: Aggressively remove invalid credential environment variables injected by some environments
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credPath) {
    let shouldDelete = false;
    if (credPath.includes("path/to/")) {
        shouldDelete = true;
    } else if (!fs.existsSync(credPath)) {
        shouldDelete = true;
    }
    
    if (shouldDelete) {
        // console.log(`[NextConfig] Removing invalid GOOGLE_APPLICATION_CREDENTIALS: ${credPath}`);
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
}

let buildTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true });
let commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH || process.env.COMMIT_SHA || '';

try {
  if (!commitHash) {
      commitHash = execSync('git rev-parse --short HEAD', { stdio: 'ignore' }).toString().trim();
  }
  const commitTimestamp = execSync('git log -1 --format=%cd', { stdio: 'ignore' }).toString().trim();
  if (commitTimestamp) {
      buildTime = new Date(commitTimestamp).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true });
  }
} catch (e) {
  // Gracefully fallback to actual build time (new Date() from above) if git context is missing (like in Cloud Build)
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
  },
  /* config options here */
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Fix for 'eval' issues in development mode (usually Webpack related)
  webpack: (config, { dev }) => {
    if (dev) {
        config.devtool = 'cheap-module-source-map';
    } else {
        // Enable source maps in production for better debugging
        config.devtool = 'source-map';
    }
    return config;
  },
};

export default nextConfig;
