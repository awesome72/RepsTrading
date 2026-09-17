import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // e2e/*.spec.ts are Playwright tests (npm run test:e2e), not vitest's
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
