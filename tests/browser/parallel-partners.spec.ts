import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`Parallel partners and both carousel formats display in their two counties at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
    });
    await page.route("**/api/mighty/**", (route) => route.fulfill({ json: { items: [] } }));
    await page.route("**/api/rss-feed?**", (route) => route.fulfill({ json: { items: [] } }));
    await page.route("**/api/vimeo-showcase?**", (route) => route.fulfill({ json: { videos: [] } }));
    for (const county of ["randall", "potter"]) {
      await page.goto(`/tx/${county}`);
      await expect(page.locator(".sponsor-carousel-item")).toHaveCount(11);
      for (const slot of [".sponsor-carousel", ".sponsor-banner-carousel"]) {
        for (const [name, size] of [["Roofing", [767, 435]], ["Builders", [569, 267]]] as const) {
          const ad = page.locator(slot).getByRole("link", { name: `Parallel ${name}`, exact: true });
          await expect(ad).toHaveAttribute("href", "https://pb-tx.com/");
          const image = ad.locator("img");
          await ad.scrollIntoViewIfNeeded();
          await expect(image).toHaveAttribute("src", /.+/);
          await image.evaluate((element: HTMLImageElement) => element.decode());
          const dimensions = await image.evaluate((element: HTMLImageElement) => [element.naturalWidth, element.naturalHeight]);
          expect(dimensions[0] / dimensions[1]).toBeCloseTo(size[0] / size[1], 1);
          await ad.scrollIntoViewIfNeeded();
          await expect(ad).toBeVisible();
        }
      }
      await page.goto(`/tx/${county}/partners`);
      for (const name of ["Roofing", "Builders"]) {
        await expect(page.locator(".partner-card-title").filter({ hasText: `Parallel ${name}` })).toHaveAttribute("href", "https://pb-tx.com/");
      }
    }
    await page.goto("/partners");
    for (const name of ["Roofing", "Builders"]) {
      await expect(page.locator(".partner-card-title").filter({ hasText: `Parallel ${name}` })).toHaveCount(1);
    }
    for (const path of ["/tx/harris", "/tx/harris/partners", "/tx"]) {
      await page.goto(path);
      await expect(page.locator('img[src*="parallel-"]')).toHaveCount(0);
    }
  });
}
