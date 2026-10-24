import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "4173";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/menu`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
