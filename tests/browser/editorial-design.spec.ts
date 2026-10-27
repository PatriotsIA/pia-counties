import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
});

test("public layouts use wide desktops and keep navigation usable on phones", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [2560, 1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/counties", "/tx", "/tx/potter", "/partners", "/issues", "/recover-america", "/rewards", "/contact"]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      const main = await page.locator("main").boundingBox();
      expect(main!.width).toBeGreaterThan(width * (width >= 1024 ? .9 : .85));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const toggle = page.getByRole("button", { name: "Toggle navigation" });
      if (await toggle.isVisible()) await toggle.click();
      await expect(page.locator("#site-navigation").getByRole("link", { name: "Counties", exact: true })).toBeVisible();
      if (await toggle.isVisible()) await toggle.click();
      await expect(page.locator(".footer").getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
    }
  }
});

test("Recover America ads display both formats and lead to tracked partner links", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const format of ["square", "banner"]) {
      const ad = page.locator(`[data-ad-id="recover-america-${format}"]`);
      await expect(ad).toHaveAttribute("href", `/recover-america?pia_ad=recover-america-${format}`);
      await ad.scrollIntoViewIfNeeded();
      const image = ad.locator("img");
      await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      const geometry = await image.evaluate((i: HTMLImageElement) => ({ display: i.clientWidth / i.clientHeight, natural: i.naturalWidth / i.naturalHeight }));
      expect(Math.abs(geometry.display - geometry.natural)).toBeLessThan(.02);
    }
  }
  await page.locator('[data-ad-id="recover-america-square"]').click();
  await expect(page).toHaveURL(/\/recover-america\?pia_ad=recover-america-square/);
  await expect(page.locator("#recover-title")).toBeVisible();
  const outgoing = await page.locator('a[href^="https://recoveramerica.com"]').evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href));
  expect(outgoing.length).toBeGreaterThan(5);
  for (const href of outgoing) {
    const url = new URL(href);
    expect(url.searchParams.get("utm_source")).toBe("patriotsinaction");
    expect(url.searchParams.get("utm_campaign")).toBe("recover_america");
    expect(url.searchParams.get("utm_content")).toBeTruthy();
  }
});
