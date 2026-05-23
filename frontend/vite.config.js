import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update strategy: a new service worker takes over as soon as
      // it activates, so users always get the latest UI without a manual
      // "update available" prompt. Trade-off is that long-lived sessions
      // can rare-race between SW activations; acceptable for a private
      // journal app.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'DreamSignal — Dream Dossier',
        short_name: 'DreamSignal',
        description:
          'Record, transcribe, and analyze your dreams. A private dossier of your subconscious.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f2ead8',
        theme_color: '#1a1510',
        lang: 'en',
        categories: ['lifestyle', 'health', 'productivity'],
        icons: [
          { src: '/favicon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Don't try to precache the model-bundle chunks; they're large
        // and not worth the install-time download for offline support.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        // The API + SSE endpoints must always hit the network — never
        // serve a cached response, or the user would see stale dream
        // status / processing stamps.
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'dream-storage-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // keep the SW off in dev to avoid HMR confusion
      },
    }),
  ],
  resolve: {
    alias: {
      // Single source of truth for API contracts — see shared/contracts.js
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    fs: {
      // Allow Vite to read the shared/ folder, which lives outside the
      // frontend workspace root.
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    // Bump the warning threshold since our biggest legitimate chunk (recharts
    // + d3) is ~280 kB gzipped and that's expected. The 500 kB default fires
    // on every CI run otherwise.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        // Pull the heaviest vendor libs into their own chunks so they get
        // long-term cached across deploys and route chunks stay small.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-dom') || id.match(/[\\/]react[\\/]/)) return 'vendor-react';
          if (id.includes('zod')) return 'vendor-zod';
          return undefined; // everything else goes to the default vendor bundle
        },
      },
    },
  },
})
