import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.route("**/api/rss-feed?**", route => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/mighty/**", route => route.fulfill({ json: { items: [] } }));
});

for (const candidate of [{ id: "greg-abbott", name: "Greg Abbott" }, { id: "ken-paxton", name: "Ken Paxton" }]) {
  test(`${candidate.name} has campaign sources, disclosure, tracked links, and opt-in video`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({ contentType: "text/html", body: "<p>Video provider fixture</p>" }));
    await page.goto(`/${candidate.id}`);
    await expect(page.locator("h1")).toContainText(candidate.name.split(" ")[1]);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", `https://patriotsinaction.com/${candidate.id}`);
    const links = await page.locator('a[href^="https://"]').evaluateAll(anchors => anchors.map(a => ({ href: (a as HTMLAnchorElement).href, target: (a as HTMLAnchorElement).target, rel: (a as HTMLAnchorElement).rel })));
    expect(links.length).toBeGreaterThan(10);
    for (const link of links) {
      const url = new URL(link.href);
      expect(url.searchParams.get("utm_source")).toBe("patriotsinaction");
      expect(url.searchParams.get("utm_medium")).toBe("referral");
      expect(url.searchParams.get("utm_campaign")).toBe(`vote_${candidate.id.replaceAll("-", "_")}_2026`);
      expect(url.searchParams.get("utm_content")).toBeTruthy();
      expect(link.target).toBe("_blank");
      expect(link.rel).toContain("noopener");
    }
    await expect(page.getByRole("link", { name: "View disclosure on the campaign site" })).toHaveAttribute("href", /utm_content=campaign_disclosure#.+/);
    const outbound = page.getByRole("link", { name: "Visit the campaign", exact: false }).first();
    await outbound.evaluate(a => a.addEventListener("click", e => e.preventDefault()));
    await outbound.click();
    expect(await page.evaluate(() => window.dataLayer?.some(x => x.event === "campaign_outbound_click"))).toBe(true);
    await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);
    const play = page.getByRole("button", { name: /^Play / }).first();
    await play.click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(1);
    await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveAttribute("title", /.+/);
    expect(errors).toEqual([]);
  });

  test(`${candidate.name} layout and assets fit desktop, tablet, and mobile`, async ({ page }) => {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${candidate.id}`);
      await expect(page.locator(".site-header .brand")).toContainText("Patriots in Action");
      const menu = page.getByRole("button", { name: "Toggle navigation" });
      if (await menu.isVisible()) {
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
      }
      await expect(page.locator("#site-navigation").getByRole("link", { name: "Candidates", exact: true })).toBeVisible();
      await expect(page.locator("#site-navigation").getByRole("link", { name: "Issues", exact: true })).toHaveAttribute("href", "/issues");
      await expect(page.locator('#site-navigation a[href="/greg-abbott"], #site-navigation a[href="/ken-paxton"]')).toHaveCount(0);
      if (await menu.isVisible()) await menu.click();
      for (const image of await page.locator("img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test("PIA support candidates stay pinned above the directory and honor filters", async ({ page }) => {
  await page.goto("/candidates");
  const pins = page.locator(".campaign-pin");
  await expect(pins).toHaveCount(2);
  await expect(pins.nth(0)).toContainText("Greg Abbott");
  await expect(pins.nth(1)).toContainText("Ken Paxton");
  const pinY = (await pins.first().boundingBox())!.y;
  const filterY = (await page.getByRole("region", { name: "Filter candidates" }).boundingBox())!.y;
  expect(pinY).toBeLessThan(filterY);
  await page.getByRole("combobox", { name: "Office level" }).selectOption("federal");
  await expect(pins).toHaveCount(1);
  await expect(pins.first()).toContainText("Ken Paxton");
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("california");
  await expect(pins).toHaveCount(0);
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("all");
  await page.getByRole("combobox", { name: "Office level" }).selectOption("all");
  await page.getByRole("searchbox", { name: "Search candidates" }).fill("abbott");
  await expect(pins).toHaveCount(1);
  await pins.first().getByRole("link").click();
  await expect(page).toHaveURL(/\/greg-abbott\?pia_source=candidate_directory/);
});

// The supporter and publisher the owner specified on October 28, 2026.
const notAuthorized = "Not authorized by any candidate or candidate’s committee.";
const attribution = {
  "greg-abbott": { supporter: "Patriots for Action", text: `Published by Patriots Connect, LLC, d/b/a Patriots in Action. PatriotsInAction.com. ${notAuthorized}` },
  "ken-paxton": { supporter: "GOP Connect", text: `Published by GOP Connect LLC. ${notAuthorized}` },
};
const adAlt = {
  "greg-abbott": `Vote Greg Abbott for Texas Governor. ${attribution["greg-abbott"].text} View campaign information.`,
  "ken-paxton": `Vote Ken Paxton for U.S. Senate · Texas. ${attribution["ken-paxton"].text} View campaign information.`,
};

test("candidate pages and directory pins name the supporter and publisher", async ({ page }) => {
  const oldWording = page.getByText(/Unpaid support message|Patriots in Action supports|PIA supports/i);
  for (const [path, id] of [["/greg-abbott", "greg-abbott"], ["/ken-paxton", "ken-paxton"], ["/paxton", "ken-paxton"]] as const) {
    await page.goto(path);
    const { supporter, text } = attribution[id];
    await expect(page.locator(".campaign-kicker").first()).toContainText(`${supporter} supports`);
    await expect(page.locator(".campaign-attribution")).toHaveText(text);
    await expect(page.locator(".campaign-footer > p")).toHaveText(text);
    await expect(oldWording).toHaveCount(0);
  }
  await page.goto("/greg-abbott");
  await expect(page).toHaveTitle("Vote Greg Abbott — Patriots for Action Supports | Patriots in Action");
  await page.goto("/candidates");
  const pins = page.locator(".campaign-pin");
  for (const [i, id] of (["greg-abbott", "ken-paxton"] as const).entries()) {
    await expect(pins.nth(i).locator(".eyebrow")).toHaveText(`${attribution[id].supporter} supports · Republican`);
    await expect(pins.nth(i).locator(".campaign-pin-attribution")).toHaveText(attribution[id].text);
  }
  await expect(oldWording).toHaveCount(0);
});

test("square and banner support ads lead to the landing pages without navigation entries", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#site-navigation a[href="/greg-abbott"], #site-navigation a[href="/ken-paxton"]')).toHaveCount(0);
  for (const id of ["greg-abbott", "ken-paxton"] as const) {
    for (const format of ["square", "banner"]) {
      const ad = page.locator(`[data-ad-id="${id}-${format}"]`);
      await expect(ad).toHaveAttribute("href", `/${id}?pia_ad=${id}-${format}`);
      await expect(ad.locator("img")).toHaveAttribute("alt", adAlt[id]);
      await ad.scrollIntoViewIfNeeded();
      await expect.poll(() => ad.locator("img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    }
  }
  const ad = page.locator('[data-ad-id="greg-abbott-square"]');
  await ad.click();
  await expect(page).toHaveURL(/\/greg-abbott\?pia_ad=greg-abbott-square/);
});

test("original banner ads remain ahead of the candidate banners in shared rotations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [path, legacy] of [
    ["/", ["mattress-banner-2026", "pasture-exchange-2026"]],
    ["/tx/potter", ["parallel-builders-banner-2026", "parallel-roofing-banner-2026", "lemc-2026", "mattress-banner-2026", "pasture-exchange-2026"]],
    ["/tx/randall", ["parallel-builders-banner-2026", "parallel-roofing-banner-2026", "lemc-2026", "mattress-banner-2026", "pasture-exchange-2026"]],
  ] as const) {
    await page.goto(path);
    const carousel = page.locator(".sponsor-banner-carousel");
    await expect(carousel).toHaveCount(1);
    const ids = await carousel.locator("[data-ad-id]").evaluateAll(ads => ads.map(ad => ad.getAttribute("data-ad-id")));
    expect(ids).toEqual([...legacy, "greg-abbott-banner", "ken-paxton-banner", "recover-america-banner"]);
    for (const ad of await carousel.locator("[data-ad-id]").all()) {
      await ad.scrollIntoViewIfNeeded();
      await expect.poll(() => ad.locator("img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    }
    await expect(carousel.getByText(/Published by/)).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page.locator(".campaign-support-square").getByText(/Published by/)).toHaveCount(0);
});
