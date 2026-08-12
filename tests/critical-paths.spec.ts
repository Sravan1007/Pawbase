import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Serial: each test builds on state (the pet, its documents) created by the
// one before it — this is a critical-path smoke suite, not isolated unit
// tests. Run with `npx playwright test`.
test.describe.serial("critical paths", () => {
  const petName = `E2E Test Pet ${Date.now()}`;
  let petUrl = "";
  let qrUrl = "";

  test("login succeeds and reaches the dashboard", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Your pets" })).toBeVisible();
  });

  test("owner can create a pet and gets a Universal Pet ID", async ({ page }) => {
    await login(page);
    await page.goto("/pets/new");
    await page.getByPlaceholder("Biscuit").fill(petName);
    await page.getByRole("combobox").selectOption("Dog");
    await page.getByRole("button", { name: "Create pet" }).click();

    // "**/pets/*" would also match the /pets/new page we start on (it
    // resolves instantly, before the real post-create redirect happens) —
    // exclude "new" explicitly so this actually waits for the redirect.
    await page.waitForURL(/\/pets\/(?!new)[a-f0-9-]+$/);
    petUrl = page.url();

    await expect(page.getByRole("heading", { name: petName })).toBeVisible();
    // Universal Pet ID format: PP-XXXXXX
    await expect(page.getByText(/PP-[A-Z0-9]{6}/)).toBeVisible();
  });

  test("QR emergency page is reachable with no login", async ({ page, browser }) => {
    await login(page);
    await page.goto(petUrl);
    const qrLink = page.getByRole("link", { name: /View public emergency page/ });
    await expect(qrLink).toBeVisible();
    qrUrl = await qrLink.getAttribute("href").then((href) => new URL(href!, page.url()).toString());

    // Fresh, fully unauthenticated browser context — no cookies at all.
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(qrUrl);

    await expect(anonPage.getByRole("heading", { name: petName })).toBeVisible();
    // Must never redirect to /login — this page's whole point is no-auth access.
    expect(anonPage.url()).not.toContain("/login");
    await anonContext.close();
  });

  test("owner can upload a document and see it listed", async ({ page }) => {
    await login(page);
    const petId = petUrl.split("/pets/")[1];
    await page.goto(`/pets/${petId}/documents`);

    await page.setInputFiles('input[type="file"]', {
      name: "e2e-test-vaccination.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("dummy pdf content for e2e test"),
    });
    await page.getByRole("button", { name: "Upload" }).click();

    await expect(page.getByText("Uploaded").first()).toBeVisible({ timeout: 10_000 });
  });

  test("medications page loads without error for a pet with none yet", async ({ page }) => {
    await login(page);
    const petId = petUrl.split("/pets/")[1];
    await page.goto(`/pets/${petId}/medications`);
    await expect(page.getByText("No prescriptions yet.")).toBeVisible();
  });

  test("travel checklist page lists seeded rulesets in the selectors and shows the picked checklist", async ({ page }) => {
    await login(page);
    const petId = petUrl.split("/pets/")[1];
    await page.goto(`/pets/${petId}/travel`);

    // Nothing selected yet — no checklist shown.
    await expect(page.getByText("Select an airline or destination")).toBeVisible();

    const countrySelect = page.getByLabel("Destination country");
    await expect(countrySelect.locator("option")).toContainText(["USA — Pet Import"]);
    await countrySelect.selectOption({ label: "USA — Pet Import" });

    // "USA — Pet Import" also appears as a <select> option, so scope the
    // visible-checklist assertion to something that only exists once rendered.
    await expect(page.getByText("Rabies vaccination certificate")).toBeVisible();
    await expect(page.getByText("Last verified")).toBeVisible();
  });
});
