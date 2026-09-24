import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`County Post ads retain full artwork, spacing and links at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*", (route) => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    for (const path of ["/", "/tx", "/ca", "/tx/potter", "/tx/harris", "/ca/los-angeles"]) {
      for (const pattern of ["**/api/mighty/**", "**/api/rss-feed?**", "**/api/vimeo-showcase?**"]) await page.route(pattern, (route) => route.fulfill({ json: { items: [], videos: [] } }));
      await page.goto(path);
      const creatives = page.locator('.sponsor-card[data-ad-id^="county-post-"]');
      await expect(creatives).toHaveCount(2);
      const ids = await creatives.first().locator("xpath=ancestor::aside").locator(".sponsor-card").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-ad-id")));
      ids.forEach((id, index) => {
        if (id?.startsWith("county-post-")) expect(ids[index + 1]?.startsWith("county-post-")).not.toBe(true);
      });
      for (const ad of await creatives.all()) {
        await expect(ad).toHaveAttribute("href", "https://thecountypost.com/");
        await expect(ad).toHaveAttribute("target", "_blank");
        await ad.scrollIntoViewIfNeeded();
        const image = ad.locator("img");
        await expect(image).toHaveAttribute("src", /.+/);
        await image.evaluate((img: HTMLImageElement) => img.decode());
        const info = await image.evaluate((img: HTMLImageElement) => ({ width: img.naturalWidth, height: img.naturalHeight, fit: getComputedStyle(img).objectFit, src: img.currentSrc }));
        expect(info.width / info.height).toBeCloseTo(1672 / 941, 1);
        expect(info.fit).toBe("contain");
        expect(info.src).toContain(".webp");
        await ad.screenshot({ path: `test-results/${await ad.getAttribute("data-ad-id")}-${width}-${path.replaceAll("/", "_")}.png` });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const heroMark = page.locator(".hero-patriot-mark");
      if (await heroMark.count()) {
        await heroMark.scrollIntoViewIfNeeded();
        await heroMark.evaluate((img: HTMLImageElement) => img.decode());
        expect((await heroMark.boundingBox())!.height).toBeLessThan(160);
        const hero = (await page.locator(".hero-main-image").boundingBox())!;
        expect(Math.abs(hero.width - hero.height)).toBeLessThan(2);
      }
      const footerLogo = page.locator(".site-footer img");
      if (await footerLogo.count()) {
        await footerLogo.scrollIntoViewIfNeeded();
        await footerLogo.evaluate((img: HTMLImageElement) => img.decode());
        expect((await footerLogo.boundingBox())!.height).toBeLessThan(50);
      }
    }
  });
}

test("offscreen sponsors load on navigation, preserving banner controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tx/potter");
  const row = page.locator(".sponsor-carousel-track");
  const last = row.locator("img").last();
  await expect(last).not.toHaveAttribute("src");
  await row.locator("a").last().scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute("src", /.+/);
  await last.evaluate((img: HTMLImageElement) => img.decode());
  const banner = page.locator(".sponsor-banner-carousel-track");
  await banner.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Next sponsor banner", exact: true }).click();
  await expect.poll(() => banner.evaluate((track) => track.scrollLeft)).toBeGreaterThan(0);
});
