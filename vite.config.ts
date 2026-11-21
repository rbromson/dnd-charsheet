/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/dnd-charsheet/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Таверна — аркуш персонажа',
        short_name: 'Таверна',
        description: 'Аркуш персонажа і журнал пригод',
        lang: 'uk',
        display: 'standalone',
        orientation: 'any',
        background_color: '#17110e',
        theme_color: '#17110e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/transformers*', '**/ort*', '**/*.wasm', '**/whisper.worker*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Whisper: код воркера кэшируется при первом использовании (модель и wasm кэширует сама transformers.js)
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(whisper\.worker|transformers)[^/]*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'whisper-js' },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
