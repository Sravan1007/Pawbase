import type { Page } from "@playwright/test";

// Reuses the project's existing confirmed test account rather than signing
// up fresh each run — avoids the email-confirmation step entirely and keeps
// tests fast. Owns several pets already; tests that need a clean pet create
// their own with a unique, timestamped name.
export const TEST_EMAIL = "sra8977+petpassporttest2@gmail.com";
export const TEST_PASSWORD = "TestPass123!";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
  await page.getByPlaceholder("Your password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}
