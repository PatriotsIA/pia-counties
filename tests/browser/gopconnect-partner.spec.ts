import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`GOPConnect nationwide ads and partner links render at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
    });
    await page.route("**/api/mighty/**", (route) => route.fulfill({ json: { items: [] } }));
    await page.route("**/api/rss-feed?**", (route) => route.fulfill({ json: { items: [] } }));
    await page.route("**/api/vimeo-showcase?**", (route) => route.fulfill({ json: { videos: [] } }));
    for (const path of ["/", "/tx", "/ar", "/ca", "/tx/randall", "/ar/polk", "/ca/los-angeles"]) {
      await page.goto(path);
      const ad = page.locator('.sponsor-card[href="https://mylocalgop.com/"]').first();
      await expect(ad).toBeAttached();
      await ad.scrollIntoViewIfNeeded();
      await expect(ad.locator("img")).toHaveAttribute("src", /.+/);
      await ad.locator("img").evaluate((image: HTMLImageElement) => image.decode());
      const dimensions = await ad.locator("img").evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]);
      expect(dimensions[0]).toBeGreaterThanOrEqual(300);
      expect(dimensions[0]).toBe(dimensions[1]);
      await ad.scrollIntoViewIfNeeded();
      await expect(ad).toBeVisible();
      if (path === "/tx") {
        expect((await ad.boundingBox())!.width).toBeLessThanOrEqual(300);
        await ad.screenshot({ path: `test-results/gopconnect-state-${width}.png` });
      }
    }
    for (const path of ["/partners", "/tx/randall/partners", "/ar/polk/partners", "/ca/los-angeles/partners"]) {
      await page.goto(path);
      const link = page.locator(".partner-card-title").filter({ hasText: /^GOPConnect$/ });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", "https://mylocalgop.com/");
    }
  });
}
