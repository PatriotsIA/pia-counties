import { test, expect } from "@playwright/test";

test("retired support pages and directory pins are absent", async ({ page }) => {
  for (const path of ["/greg-abbott", "/ken-paxton", "/paxton?t=115#paxton-video"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
  await page.goto("/candidates");
  await expect(page.getByRole("heading", { name: "Pinned by Patriots in Action" })).toHaveCount(0);
  await expect(page.locator('a[href^="/greg-abbott"], a[href^="/ken-paxton"]')).toHaveCount(0);
});

test("partner and local banners retain their order after campaign retirement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [path, legacy] of [
    ["/", ["pasture-exchange-2026"]],
    ["/tx/potter", ["parallel-builders-banner-2026", "parallel-roofing-banner-2026", "lemc-2026", "pasture-exchange-2026"]],
    ["/tx/randall", ["parallel-builders-banner-2026", "parallel-roofing-banner-2026", "lemc-2026", "pasture-exchange-2026"]],
  ] as const) {
    await page.goto(path);
    const carousel = page.locator(".sponsor-banner-carousel");
    await expect(carousel).toHaveCount(1);
    const ids = await carousel.locator("[data-ad-id]").evaluateAll(ads => ads.map(ad => ad.getAttribute("data-ad-id")));
    expect(ids).toEqual([...legacy, "recover-america-banner"]);
    for (const ad of await carousel.locator("[data-ad-id]").all()) {
      await ad.scrollIntoViewIfNeeded();
      await expect.poll(() => ad.locator("img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    }
    await expect(carousel.getByText(/Published by/)).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page.locator('[data-ad-id="recover-america-square"]')).toBeVisible();
});
