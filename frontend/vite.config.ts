import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa';

const appVersion = process.env.npm_package_version || '1.0.0';
const buildTime = new Date().toISOString();

function trackiyoVersionPlugin(): Plugin {
  return {
    name: 'trackiyo-version-plugin',
    generateBundle(this: any) {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          version: appVersion,
          build: buildTime,
          timestamp: Date.now()
        }, null, 2)
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __TRACKIYO_VERSION__: JSON.stringify(appVersion),
    __TRACKIYO_BUILD__: JSON.stringify(buildTime),
  },
  plugins: [
    tailwindcss(),
    react(),
    trackiyoVersionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'windows-tile-150x150.png',
        'windows-tile-310x310.png'
      ],
      manifest: {
        id: '/',
        name: 'Trackiyo - Habit Tracker & Wellness',
        short_name: 'Trackiyo',
        description: 'Master your daily habits, boost focus, and optimize wellness with zero friction.',
        theme_color: '#09090B',
        background_color: '#09090B',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Today Overview',
            short_name: 'Today',
            description: "View today's habits, tasks, and daily momentum",
            url: '/?tab=today',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Focus Session',
            short_name: 'Focus',
            description: 'Start a Pomodoro or deep work focus timer',
            url: '/?tab=focus',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Habits Tracker',
            short_name: 'Habits',
            description: 'Manage and track your habit streaks',
            url: '/?tab=habits',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'AI Coach',
            short_name: 'Coach',
            description: 'Chat with your personal productivity and habit coach',
            url: '/?tab=coach',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Serve the app shell for navigations so the PWA (and the
        // Capacitor shell loading this same build) works offline.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/version\.json/, /^\/app-update\.json/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/gsap/') || id.includes('node_modules/@gsap/')) {
            return 'vendor-gsap';
          }
          if (id.includes('node_modules/react-icons/')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/emoji-picker-react/')) {
            return 'vendor-emoji';
          }
          if (id.includes('node_modules/date-fns/')) {
            return 'vendor-date';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
