import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ============================================================
  // CONFIGURAÇÕES GERAIS
  // ============================================================
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // ============================================================
  // ESLINT (temporariamente desligado durante build)
  // O TypeScript continua sendo verificado
  // ============================================================
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ============================================================
  // IMAGENS REMOTAS
  // ============================================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },

  // ============================================================
  // HEADERS DE SEGURANÇA
  // ============================================================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
