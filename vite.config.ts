import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate", // Actualiza el Service Worker automáticamente sin recargar
      includeAssets: ["*"],
      manifest: {
        name: "Mi Aplicación Increíble",
        short_name: "MiPWA",
        description: "Una app ultra rápida hecha con Vite, PWA y pnpm",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable", // Clave para que el icono se adapte bien en Android
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  test: {
    environment: "happy-dom",
  },
});
