// Instructions: Configure Next.js for production server deployment

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker containers
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Optimize images
  images: {
    domains: ['localhost', 'boomroach.wales', 'api.boomroach.wales'],
    formats: ['image/webp', 'image/avif'],
  },

  // Enable experimental features
  experimental: {
    forceSwcTransforms: true,
    optimizeCss: true,
    legacyBrowsers: false,
  },

  // PWA Configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.boomroach\.com\/.*$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Optimize for mobile performance
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
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
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,

  // Performance optimizations
  swcMinify: true,
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },

  // Mobile-first responsive breakpoints
  env: {
    MOBILE_BREAKPOINT: '768',
    TABLET_BREAKPOINT: '1024',
    DESKTOP_BREAKPOINT: '1280',
  },
};

module.exports = nextConfig
