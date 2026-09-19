import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/browser",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8081",
    viewport: { width: 375, height: 667 },
    trace: "retain-on-failure",
  },
  reporter: [["list"]],
  webServer: {
    command: "node scripts/serve.cjs",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: true,
  },
});
