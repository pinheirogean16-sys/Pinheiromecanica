import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  experimental: {
    webpackBuildWorker: false, // Prevents high RAM consumption by Webpack workers
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  webpack: (config, { dev, isServer, nextRuntime }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    if (dev) {
      if (nextRuntime === 'edge' || isServer) {
        config.devtool = false; // Disable sourcemaps completely for Edge/Server to prevent eval
      } else {
        config.devtool = 'source-map';
      }
    } else {
      config.parallelism = 1; // Otimização para baixo consumo de memória
      config.devtool = false; // Disable sourcemaps completely to save RAM
    }
    return config;
  },
};

export default nextConfig;
