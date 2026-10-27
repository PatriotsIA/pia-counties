import { expect, test } from "@playwright/test";

test("Paxton excerpt page is distinct, sourced, responsive, and links to the full event", async ({ page, context }) => {
  await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/paxton");
    await expect(page.locator("h1")).toContainText("A record for Texas.");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://patriotsinaction.com/paxton");
    const video = page.locator("video");
    await expect(video).toHaveAttribute("src", /opening-7m33s-v1\.mp4$/);
    await expect(video).toHaveAttribute("preload", "none");
    expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
    const ad = page.locator('[data-ad-id="ken-paxton-square"]');
    await expect(ad).toHaveAttribute("href", "/ken-paxton?pia_ad=ken-paxton-square");
    await ad.scrollIntoViewIfNeeded();
    await expect.poll(() => ad.locator("img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    await expect(page.locator(".paxton-accomplishments > li")).toHaveCount(6);
    await expect(page.getByRole("link", { name: "Read the official source" })).toHaveCount(6);
    for (const href of await page.locator(".paxton-record-source a").evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href))) {
      expect(new URL(href).hostname).toBe("www.texasattorneygeneral.gov");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("link", { name: "Watch the full event", exact: true }).click();
  await expect(page).toHaveURL(/\/ken-paxton#campaign-videos$/);
  await expect.poll(async () => page.locator("#campaign-videos").evaluate(el => Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)))).toBeLessThan(2);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://patriotsinaction.com/ken-paxton");
  await expect(page.locator("video")).toHaveAttribute("src", /big-texan-full-v1\.mp4$/);
  const full = await page.locator(".campaign-full-event").boundingBox();
  const other = await page.locator(".campaign-video-grid").boundingBox();
  expect(full!.y + full!.height).toBeLessThan(other!.y);
  await expect(page.locator(".campaign-video-grid .campaign-video-card")).toHaveCount(4);
  await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);
});
