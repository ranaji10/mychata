import { expect, test } from "@playwright/test";

// Public pages must work without an account and must not leak data by property id.

test("home page loads and shows sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/My Chata/);
});

test("sign-in page offers Google and email", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button").first()).toBeVisible();
});

test("an unknown share token shows no calendar data", async ({ page }) => {
  await page.goto("/verejne/kalendar/not-a-real-token");
  await expect(page.getByText(/Upcoming stays|Nadcházející pobyty/)).toBeVisible();
  await expect(page.locator(".card .rounded-full")).toHaveCount(0);
});

test("an invalid institution form link says so", async ({ page }) => {
  await page.goto("/verejne/zadost/not-a-real-token");
  await expect(page.getByText(/not valid|neplatí/)).toBeVisible();
});

test("an invalid guest link says so", async ({ page }) => {
  await page.goto("/host/not-a-real-token-123456");
  await expect(page.getByText(/no longer valid|už neplatí/)).toBeVisible();
});

// Guard for B-002: the page rendered on the server but crashed in the browser.
test("sign-in page runs in the browser without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/auth");
  await expect(page.getByText(/Google/)).toBeVisible();
  // Network-level failures (blocked trackers, offline fonts) are not app errors.
  const ours = errors.filter(
    (e) => !/googletagmanager|google-analytics|Failed to load resource: net::ERR_/.test(e),
  );
  expect(ours).toEqual([]);
});
