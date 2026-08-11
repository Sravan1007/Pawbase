import { defineConfig, devices } from "@playwright/test";

// e2e tests run against the real dev server + real Supabase project (no
// mocking) — the point is to catch regressions in the actual auth/RLS/data
// flow, not just component rendering. Single worker: tests share one login
// and mutate real rows, so parallel runs would race each other.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
