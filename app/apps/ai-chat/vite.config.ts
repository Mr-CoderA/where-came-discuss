import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Static SPA. Public API origin is injected at build time as VITE_API_ORIGIN.
 * No server-only env APIs; output is files only.
 */
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_"],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
