import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Forward AI requests to the optional local proxy (server/ai-proxy.mjs).
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
  // `--mode artifact` builds one self-contained bundle (no service worker) for sandboxed hosting.
  build: mode === 'artifact' ? { outDir: 'dist-artifact', assetsInlineLimit: 100_000_000, rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  plugins: [
    react(),
    mode !== 'artifact' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'VYBE — Your Life. Your Universe.',
        short_name: 'VYBE',
        description: 'Gamified life operating system: missions, habits, money and progression.',
        theme_color: '#08080D',
        background_color: '#08080D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'de',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallbackDenylist: [/^\/api/] },
    }),
  ],
  test: { environment: 'node', setupFiles: ['./src/test-setup.ts'] },
}) as any);
