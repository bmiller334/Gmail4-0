import type {NextConfig} from 'next';

// FIX: Aggressively remove invalid credential environment variables injected by some environments
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && 
    (process.env.GOOGLE_APPLICATION_CREDENTIALS.includes("path/to/") || 
     process.env.GOOGLE_APPLICATION_CREDENTIALS.includes("service-account-key.json"))) {
    console.log(`[NextConfig] Removing invalid GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const nextConfig: NextConfig = {
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
    }
    return config;
  },
};

export default nextConfig;
