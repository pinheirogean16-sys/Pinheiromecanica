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
  // ✅ CORREÇÃO: Limita threads para não exceder o limite da Hostinger
  // (evita o erro "OS can't spawn worker thread: Resource temporarily unavailable")
  // ============================================================
  experimental: {
    cpus: 1,              // Usa apenas 1 núcleo de CPU durante o build
    workerThreads: false, // Desabilita worker threads na geração de páginas
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
