import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@tauri-apps/api/core": path.resolve(__dirname, "src/mocks/tauri-core.ts"),
      "@tauri-apps/plugin-fs": path.resolve(__dirname, "src/mocks/tauri-plugin-fs.ts"),
    },
  },

  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      // Proxy all /api requests to backend service
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist-web",
  },
});
