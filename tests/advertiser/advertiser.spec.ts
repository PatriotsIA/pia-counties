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
  await page.getByRole("button", { name: "Add county", exact: true }).click();
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
  await page.getByRole("button", { name: "Add county", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Population unavailable");
  await expect(page.getByLabel("Selected counties").locator("li")).toHaveCount(0);
  await expect(submitButton(page)).toBeDisabled();
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
  for (const link of await page.locator('a[href^="mailto:"]').all())
    await expect(link).toHaveAttribute(
      "href",
      "mailto:dan@patriotsinaction.com",
    );
  await expect(page.locator("body")).not.toContainText(
    "erik@patriotsinaction.com",
  );
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
