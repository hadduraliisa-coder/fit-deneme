/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages proje sitesi https://<kullanıcı>.github.io/fit-deneme/ altında yayınlanır.
// Repo adı değişirse burayı (veya REPO_NAME ortam değişkenini) güncelleyin.
const repoName = process.env.REPO_NAME ?? 'fit-deneme'
export default defineConfig(() => {
  // dev, preview ve build aynı alt yolu kullanır → PWA kapsamı her yerde tutarlı
  const appBase = `/${repoName}/`
  return {
    base: appBase,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Fit Deneme – Kalp Dostu Antrenman',
          short_name: 'Fit',
          description: 'Kalp sağlığını gözeten, cihazda çalışan fitness takip uygulaması',
          lang: 'tr',
          start_url: appBase,
          scope: appBase,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0b0f14',
          theme_color: '#0b0f14',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: `${appBase}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
