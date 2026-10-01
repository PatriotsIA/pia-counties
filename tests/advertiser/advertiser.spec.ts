import { crc32, deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { monthlyCountyPlacementPrice, countyCampaignMonthly } from "../../src/data/campaign-pricing";

const emailEndpoint = "https://api.emailjs.com/api/v1.0/email/send";
const sessionEndpoint = "https://advertising.fixture/v1/checkout/sessions";
const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_fixture";
const submitButton = (page: Page) => page.locator('button[type="submit"]');
const populations = {
  potter: { population: 114453, fips: "48375", stateSlug: "texas", countySlug: "potter", estimateVintage: 2025 },
  loving: { population: 54, fips: "48301", stateSlug: "texas", countySlug: "loving", estimateVintage: 2025 },
};
async function fillRequest(page: Page) {
  await page.getByLabel("Business or organization").fill("Example Community Shop");
  await page.getByLabel("Your name").fill("Test Advertiser");
  await page.getByLabel("Email address").fill("advertiser+test@example.test");
  await page.getByLabel("I agree to be contacted").check();
}
async function addCounty(page: Page, fips = "48375") {
  await page.getByLabel("State", { exact: true }).selectOption("TX");
  await page.getByLabel("County", { exact: true }).selectOption(fips);
  await expect(page.getByLabel("County", { exact: true })).toHaveValue("");
}
async function addState(page: Page, abbr: string) {
  await page.getByLabel("State", { exact: true }).selectOption(abbr);
  await page.getByRole("button", { name: "Add state", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route(emailEndpoint, (route) => route.fulfill({ status: 200, body: "OK" }));
  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Secure checkout fixture</h1>" }));
  await page.route("https://buy.stripe.com/**", () => { throw new Error("Legacy checkout must not be used"); });
  await page.route("https://advertising.fixture/**", (route) => {
    const url = new URL(route.request().url());
    const county = url.pathname.split("/")[4] as keyof typeof populations;
    if (url.pathname.endsWith("/population")) return route.fulfill({ json: populations[county] });
    if (url.pathname === "/v1/advertising/creatives/upload") {
      const { fileName } = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { assetKey: `ad-creatives/2026-09-29/${fileName}`, upload: { url: "https://uploads.fixture/", fields: { key: "fixture" } } } });
    }
    if (url.pathname !== "/v1/checkout/sessions") throw new Error(`Unexpected advertising request: ${url.pathname}`);
    const body = route.request().postDataJSON();
    // Independent fixture amounts, never the production calculator.
    let monthly: number;
    if (body.scope === "county") {
      const rates = body.counties.map((entry: { countySlug: string }) => entry.countySlug === "potter" ? 25000 : 2500).sort((a: number, b: number) => b - a);
      monthly = rates.reduce((sum: number, rate: number, index: number) => sum + rate * (index ? 0.5 : 1), 0) * (body.placement === "section-sponsorship" ? 2 : 1);
    } else {
      monthly = body.states.reduce((sum: number, state: string) => sum + (state === "texas" ? 254 : 77), 0) * (body.placement === "state-ad" ? 1000 : 2000 * body.feeds.length);
    }
    return route.fulfill({ status: 201, json: { url: checkoutUrl, sessionId: "cs_test_fixture", amountCents: monthly * (body.billing === "annual" ? 10 : 1), billing: body.billing, currency: "usd" } });
  });
});

test("all population boundaries match the County Post rate card", () => {
  const cases = [[0,25],[4999,25],[5000,75],[19999,75],[20000,150],[99999,150],[100000,250],[249999,250],[250000,400],[499999,400],[500000,550],[749999,550],[750000,750],[999999,750],[1000000,1000],[2499999,1000],[2500000,1250]];
  for (const [population, rate] of cases) {
    expect(monthlyCountyPlacementPrice(population, "color-card")).toBe(rate);
    expect(monthlyCountyPlacementPrice(population, "section-sponsorship")).toBe(rate * 2);
  }
  expect(countyCampaignMonthly([54,114453,5000], "color-card")).toBe(300);
  expect(countyCampaignMonthly([5000,114453,54], "color-card")).toBe(300);
});

test("pricing cards, annual billing, legacy paths, and national quotes", async ({ page }) => {
  await page.goto("/payments");
  await expect(page).toHaveURL(/\/#campaign$/);
  await expect(submitButton(page)).toBeDisabled();
  await expect(page.locator(".rate-table tbody tr")).toHaveCount(9);
  await page.getByRole("button", { name: "Annual Save 2 months" }).click();
  await expect(page.locator(".price-card").first()).toContainText("$250");
  await page.getByRole("button", { name: "Choose County section sponsorship" }).click();
  await expect(page.getByLabel("Placement", { exact: true })).toHaveValue("section-sponsorship");
  await expect(page.getByLabel("Billing preference")).toHaveValue("annual");
  await addCounty(page);
  await expect(submitButton(page)).toContainText("$5,000/year");
  await page.getByRole("button", { name: "Plan a national campaign" }).click();
  await expect(page.locator(".campaign-summary")).toContainText("Custom national proposal");
  await expect(page.getByLabel("County", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Billing preference")).toHaveCount(0);
  await fillRequest(page);
  let sessions = 0;
  page.on("request", (request) => { if (request.url() === sessionEndpoint) sessions++; });
  await submitButton(page).click();
  await expect(page.getByRole("status")).toContainText("has been sent");
  expect(sessions).toBe(0);
  await expect(page.getByRole("link", { name: "Continue to Stripe" })).toHaveCount(0);
  await page.getByLabel("Campaign reach").selectOption("county");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(submitButton(page)).toContainText("$5,000/year");
  await page.goto("/#%invalid-selector");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const placement of ["color-card", "section-sponsorship"]) for (const billing of ["monthly", "annual"]) {
  test(`county ${placement} ${billing}: exact discounted total, email, and checkout`, async ({ page }) => {
    let mail: { template_params: Record<string,string> } | undefined;
    let checkout: Record<string, unknown> | undefined;
    page.on("request", (request) => { if (request.url() === sessionEndpoint) checkout = request.postDataJSON(); });
    await page.route(emailEndpoint, async (route) => { mail = route.request().postDataJSON(); await route.fulfill({ body: "OK" }); });
    await page.goto("/");
    await fillRequest(page);
    await addCounty(page, "48301");
    await addCounty(page);
    await page.getByLabel("Placement", { exact: true }).selectOption(placement);
    await page.getByLabel("Billing preference").selectOption(billing);
    await page.getByLabel("Referred by").fill("Example referrer");
    const price = placement === "color-card" ? (billing === "annual" ? "$2,625/year" : "$262.50/month") : billing === "annual" ? "$5,250/year" : "$525/month";
    await expect(submitButton(page)).toContainText(price);
    await submitButton(page).click();
    await expect(page).toHaveURL(checkoutUrl);
    expect(checkout).toMatchObject({ brand: "patriots-in-action", scope: "county", placement, billing, counties: [{ stateSlug: "texas", countySlug: "loving" }, { stateSlug: "texas", countySlug: "potter" }] });
    expect(checkout).not.toHaveProperty("amountCents");
    expect(mail?.template_params.to_email).toBe("erik@patriotsinaction.com");
    expect(mail?.template_params.reply_to).toBe("advertiser+test@example.test");
    for (const detail of ["FIPS 48375", "FIPS 48301", `advertisedRate: ${price}`, "Example referrer", "contactConsent: Yes", "cs_test_fixture"]) expect(mail?.template_params.message).toContain(detail);
  });
}

test("removing the primary county recalculates full rate and duplicate counties are blocked", async ({ page }) => {
  await page.goto("/"); await addCounty(page); await addCounty(page, "48301");
  await expect(page.locator('.coverage-list')).toContainText("$12.50/month");
  await expect(page.locator('select option[value="48375"]')).toHaveAttribute("disabled", "");
  await page.getByRole("button", { name: "Remove Potter County, Texas" }).click();
  await expect(submitButton(page)).toContainText("$25/month");
  await page.getByRole("button", { name: "Remove Loving County, Texas" }).click();
  await expect(submitButton(page)).toBeDisabled();
});

for (const placement of ["state-ad", "state-feed-sponsorship"]) for (const billing of ["monthly", "annual"]) {
  test(`state ${placement} ${billing}: county count and section totals`, async ({ page }) => {
    let checkout: Record<string, unknown> | undefined;
    page.on("request", (request) => { if (request.url() === sessionEndpoint) checkout = request.postDataJSON(); });
    await page.goto("/"); await fillRequest(page);
    await page.getByLabel("Campaign reach").selectOption("state");
    await addState(page, "TX"); await expect(submitButton(page)).toContainText("$2,540/month");
    await addState(page, "OK");
    await page.getByLabel("Placement", { exact: true }).selectOption(placement);
    if (placement === "state-feed-sponsorship") {
      await page.getByLabel("Community updates", { exact: true }).uncheck();
      await expect(submitButton(page)).toBeDisabled();
      await page.getByLabel("PIA TV", { exact: true }).check();
      await page.getByLabel("Community calendar", { exact: true }).check();
    }
    await page.getByLabel("Billing preference").selectOption(billing);
    const price = placement === "state-ad" ? (billing === "annual" ? "$33,100/year" : "$3,310/month") : billing === "annual" ? "$132,400/year" : "$13,240/month";
    await expect(submitButton(page)).toContainText(price);
    await submitButton(page).click(); await expect(page).toHaveURL(checkoutUrl);
    expect(checkout).toMatchObject({ brand: "patriots-in-action", scope: "state", placement, billing, states: ["texas", "oklahoma"] });
    if (placement === "state-feed-sponsorship") expect(checkout?.feeds).toEqual(["pia-tv", "community-calendar"]);
    else expect(checkout).not.toHaveProperty("feeds");
    expect(checkout).not.toHaveProperty("counties");
  });
}

test("email failure preserves details and retries the same unpaid checkout session", async ({ page }) => {
  let sessions = 0;
  page.on("request", (request) => { if (request.url() === sessionEndpoint) sessions++; });
  await page.route(emailEndpoint, (route) => route.fulfill({ status: 429, body: "Rate limited" }));
  await page.goto("/"); await fillRequest(page); await addCounty(page);
  await submitButton(page).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t send");
  await expect(page.getByRole("alert").getByRole("link")).toHaveAttribute("href", "mailto:dan@patriotsinaction.com");
  await expect(page.getByLabel("Business or organization")).toHaveValue("Example Community Shop");
  await page.route(emailEndpoint, (route) => route.fulfill({ body: "OK" }));
  await submitButton(page).click(); await expect(page).toHaveURL(checkoutUrl);
  expect(sessions).toBe(1);
});

for (const failure of ["unavailable", "price mismatch", "invalid destination"]) {
  test(`checkout ${failure} cannot send mail or take payment`, async ({ page }) => {
    let emails = 0;
    page.on("request", (request) => { if (request.url() === emailEndpoint) emails++; });
    await page.route(sessionEndpoint, (route) => route.fulfill(failure === "unavailable" ? { status: 503, json: { error: "Checkout temporarily unavailable" } } : { json: { url: failure === "invalid destination" ? "https://example.com/unsafe" : checkoutUrl, sessionId: "bad", amountCents: 1, currency: "usd", billing: "monthly" } }));
    await page.goto("/"); await fillRequest(page); await addCounty(page); await submitButton(page).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("http://127.0.0.1:4186/");
    expect(emails).toBe(0); await expect(submitButton(page)).toBeEnabled();
  });
}

test("population lookup failure cannot introduce an unpriced county", async ({ page }) => {
  await page.route("**/population", (route) => route.fulfill({ status: 503, json: { error: "Population unavailable" } }));
  await page.goto("/"); await page.getByLabel("State", { exact: true }).selectOption("TX");
  await page.getByLabel("County", { exact: true }).selectOption("48375");
  await expect(page.getByRole("alert")).toContainText("Population unavailable");
  await expect(page.getByLabel("County", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Selected counties").locator("li")).toHaveCount(0);
  await expect(submitButton(page)).toBeDisabled();
});

/** Minimal valid RGB PNG, so artwork dimension checks run against real decodable images. */
function png(width: number, height: number) {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length); body.copy(out, 4); out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 3 + 1) * height, 0xcc);
  for (let y = 0; y < height; y++) rows[y * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

test("County Post-sized artwork uploads privately before checkout and is reused on retry", async ({ page }) => {
  const uploads: string[] = []; let checkout: Record<string, unknown> | undefined; let mail: { template_params: Record<string, string> } | undefined;
  await page.route("https://uploads.fixture/", (route) => { uploads.push(route.request().method()); return route.fulfill({ status: 204 }); });
  page.on("request", (request) => { if (request.url() === sessionEndpoint) checkout = request.postDataJSON(); });
  await page.route(emailEndpoint, (route) => route.fulfill({ status: 429, body: "Rate limited" }));
  await page.goto("/"); await fillRequest(page); await addCounty(page);
  const fields = page.getByRole("group", { name: "Ad artwork" });
  await expect(fields).toContainText("or you can send it after checkout to erik@patriotsinaction.com");
  await expect(fields.getByRole("link", { name: "erik@patriotsinaction.com" })).toHaveAttribute("href", "mailto:erik@patriotsinaction.com");
  await expect(fields).toContainText("Exclusive feed sponsor ad assets should be 250×250 px.");
  const square = page.getByLabel("Square ad — 250×250 or 300×250 px"), banner = page.getByLabel("Wide banner — 980×300 px");
  await square.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not artwork") });
  await expect(page.getByRole("alert")).toContainText("PNG, JPG, WebP or GIF");
  // Off-size artwork is accepted with a note; 300×250 and larger same-ratio files are recommended sizes.
  await square.setInputFiles({ name: "odd.png", mimeType: "", buffer: png(851, 315) });
  await expect(page.locator(".artwork-note")).toContainText("851×315 image will be scaled to fit");
  await square.setInputFiles({ name: "square.png", mimeType: "image/png", buffer: png(300, 250) });
  await expect(page.locator(".artwork-note")).toHaveCount(0);
  await expect(page.getByAltText("Square ad preview")).toBeVisible();
  await banner.setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: png(980, 300) });
  await expect(page.getByAltText("Wide banner preview")).toBeVisible();
  await submitButton(page).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute(emailEndpoint);
  await page.route(emailEndpoint, async (route) => { mail = route.request().postDataJSON(); await route.fulfill({ body: "OK" }); });
  await submitButton(page).click();
  await expect(page).toHaveURL(checkoutUrl);
  expect(uploads).toEqual(["POST", "POST"]);
  expect(checkout).toMatchObject({ creativeAssetKey: "ad-creatives/2026-09-29/square.png", bannerCreativeAssetKey: "ad-creatives/2026-09-29/banner.png" });
  for (const detail of ["squareArtwork: ad-creatives/2026-09-29/square.png (300×250, square.png)", "bannerArtwork: ad-creatives/2026-09-29/banner.png (980×300, banner.png)"]) expect(mail?.template_params.message).toContain(detail);
});

test("consent and honeypot prevent incomplete or automated submissions", async ({ page }) => {
  let sessions = 0; page.on("request", (request) => { if (request.url() === sessionEndpoint) sessions++; });
  await page.goto("/"); await fillRequest(page); await addCounty(page);
  await page.getByLabel("I agree to be contacted").uncheck(); await submitButton(page).click(); expect(sessions).toBe(0);
  await page.getByLabel("I agree to be contacted").check();
  await page.locator('[name="companyFax"]').evaluate((element: HTMLInputElement) => { element.value = "bot"; });
  await submitButton(page).click(); expect(sessions).toBe(0);
});

test("selections stay fixed while submission is pending", async ({ page }) => {
  let finish = () => {}; const pending = new Promise<void>((resolve) => { finish = resolve; });
  await page.route(emailEndpoint, async (route) => { await pending; await route.fulfill({ body: "OK" }); });
  await page.goto("/"); await fillRequest(page); await addCounty(page); await submitButton(page).click();
  await expect(submitButton(page)).toBeDisabled();
  await expect(page.getByLabel("Campaign reach")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Annual Save 2 months" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Choose County section sponsorship" })).toBeDisabled();
  finish(); await expect(page).toHaveURL(checkoutUrl);
});
test("county selection, local artwork, Dan contact, straight preview, and supplied full-page screenshot", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(4);
  // The County Post is only named in its own expand-your-reach section.
  const expand = page.getByRole("region", { name: "Advertise on The County Post" });
  await expect(expand.getByRole("link", { name: "Advertise on The County Post" })).toHaveAttribute("href", "https://www.advertise.thecountypost.com/");
  expect(await page.evaluate(() => { const clone = document.body.cloneNode(true) as HTMLElement; clone.querySelector('[aria-labelledby="expand-reach"]')?.remove(); return /county post/i.test(clone.innerText + clone.innerHTML); })).toBe(false);
  // Sales contact is Dan everywhere; the artwork field alone names Erik, where post-checkout artwork is sent.
  for (const link of await page.locator('a[href^="mailto:"]:not(.artwork-fields a)').all())
    await expect(link).toHaveAttribute(
      "href",
      "mailto:dan@patriotsinaction.com",
    );
  await expect(page.locator(".artwork-fields a[href^='mailto:']")).toHaveAttribute("href", "mailto:erik@patriotsinaction.com");
  await expect(page.getByText("erik@patriotsinaction.com")).toHaveCount(1);
  expect(
    await page
      .locator(".hero-preview")
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  const screenshot = page.getByAltText("Full Potter County Patriots page", {
    exact: false,
  });
  await screenshot.scrollIntoViewIfNeeded();
  await expect(screenshot).toHaveAttribute(
    "src",
    "/examples/potter-county-site.png",
  );
  await expect
    .poll(() =>
      screenshot.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBe(2024);
  expect(
    await screenshot.evaluate(
      (element: HTMLImageElement) => element.naturalHeight,
    ),
  ).toBe(6767);
  await fillRequest(page);
  await page.getByLabel("State", { exact: true }).selectOption("OK");
  await expect(page.getByLabel("County", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Choose artwork")
    .setInputFiles("public/brand/SocialIcon.png");
  await expect(
    page.getByAltText("Example Community Shop artwork preview"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Next banner example" }).click();
  await expect(page.locator(".carousel-controls")).toContainText(
    "Example 2 of 2",
  );
  await page.getByRole("button", { name: "Remove artwork" }).click();
  await expect(
    page.getByAltText("Example Community Shop artwork preview"),
  ).toHaveCount(0);
  await page
    .getByLabel("Choose artwork")
    .setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("alert")).toContainText("could not be opened");
});

for (const width of [360, 390, 768, 1440]) {
  test(`page fits and remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Start a campaign" }).click();
    await expect(page.getByLabel("Business or organization")).toBeInViewport();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `coverage/advertiser-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
