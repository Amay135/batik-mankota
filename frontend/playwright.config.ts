import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: "http://127.0.0.1:8010/__reset",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3100",
      url: "http://127.0.0.1:3100/masuk",
      env: { API_INTERNAL_URL: "http://127.0.0.1:8010" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
