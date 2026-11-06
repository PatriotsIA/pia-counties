import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  for (const pattern of ["**/api/rss-feed?**", "**/api/vimeo-showcase?**", "**/api/mighty/**"])
    await page.route(pattern, (route) => route.fulfill({ json: { items: [], videos: [] } }));
});

test("a connected empty county shows empty states instead of a setup request", async ({ page }) => {
  await page.goto("/tx/anderson");
  await expect(page.getByText("No upcoming events are listed yet.")).toBeVisible();
  await expect(page.getByText("No community posts yet. Check back soon!")).toBeVisible();
  await expect(page.locator(".county-mighty-setup-callout")).toHaveCount(0);
});

test("a connected county can retry unavailable feeds and calendars without being called unconfigured", async ({ page }) => {
  let fail = true;
  await page.route("**/api/calendar?**", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.route("**/api/mighty/**", (route) => route.fulfill(fail ? { status: 503, json: { error: "Unavailable" } } : { json: { items: [] } }));
  await page.goto("/tx/hale");
  await expect(page.getByRole("button", { name: "Retry calendar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry community feed", exact: true })).toBeVisible();
  await expect(page.locator(".county-mighty-setup-callout")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Retry calendar", exact: true }).click();
  await page.getByRole("button", { name: "Retry community feed", exact: true }).click();
  await expect(page.getByText("No upcoming events are listed yet.")).toBeVisible();
  await expect(page.getByText("No community posts yet. Check back soon!")).toBeVisible();
});

test("an unmapped same-name county keeps the setup callout and never fetches Texas content", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/mighty/spaces/")) requested.push(request.url()); });
  await page.goto("/al/hale");
  await expect(page.locator(".county-mighty-setup-callout").first()).toBeVisible();
  expect(requested).toEqual([]);
});
