import { expect, test, type Page } from "@playwright/test";

const emailEndpoint = "https://api.emailjs.com/api/v1.0/email/send";
const submitButton = (page: Page) =>
  page.getByRole("button", {
    name: /Send request & open Stripe|Request a quote/,
  });
async function fillRequest(page: Page) {
  await page
    .getByLabel("Business or organization")
    .fill("Example Community Shop");
  await page.getByLabel("Your name").fill("Test Advertiser");
  await page.getByLabel("Email address").fill("advertiser+test@example.test");
  await page.getByLabel("State", { exact: true }).selectOption("TX");
  await page.getByLabel("Primary county").selectOption("48375");
  await page.getByLabel("I agree to be contacted").check();
}

test.beforeEach(async ({ page }) => {
  // Never send email or load a real payment service from the automated suite.
  await page.route(emailEndpoint, (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "OK" }),
  );
  await page.route("https://buy.stripe.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<h1>Secure checkout fixture</h1>",
    }),
  );
});

test("rates, tier selection, national quotes, and legacy links", async ({
  page,
}) => {
  await page.goto("/payments");
  await expect(page).toHaveURL(/\/#campaign$/);
  await page.getByRole("button", { name: "Annual Save 2 months" }).click();
  await expect(page.locator(".price-card").nth(1)).toContainText("$2,950");
  await page.getByRole("button", { name: "Choose Platinum" }).click();
  await expect(page.getByLabel("Partnership", { exact: true })).toHaveValue(
    "platinum-business",
  );
  await expect(page.getByLabel("Billing preference")).toHaveValue("annual");
  await expect(submitButton(page)).toContainText("$4,950/year");
  await page.getByRole("button", { name: "Plan a national campaign" }).click();
  await expect(page.locator(".campaign-summary")).toContainText(
    "Custom national proposal",
  );
  await expect(page.getByLabel("Primary county")).toHaveCount(0);
  await expect(page.getByLabel("Billing preference")).toHaveCount(0);
  await expect(submitButton(page)).toHaveText("Request a quote →");
  await page
    .getByLabel("Partnership", { exact: true })
    .selectOption("gold-business");
  await expect(page.getByLabel("Billing preference")).toHaveValue("annual");
  await expect(submitButton(page)).toContainText("$2,950/year");
  await page.goto("/#%invalid-selector");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

const checkoutCases = [
  ["patriot-preferred", "monthly", "$95/month", "cNi8wPdy90605XGgAX6EU0e"],
  ["patriot-preferred", "annual", "$950/year", "6oUeVd1Pr06099SdoL6EU0f"],
  ["gold-business", "monthly", "$295/month", "8x28wP9hTdWQ2Lu98v6EU09"],
  ["gold-business", "annual", "$2,950/year", "5kQbJ1eCdcSMbi02K76EU08"],
  ["platinum-business", "monthly", "$495/month", "3cI6oHdy9cSM1Hq0BZ6EU0c"],
  ["platinum-business", "annual", "$4,950/year", "7sYdR9dy9cSM5XGfwT6EU0d"],
  ["county-gold", "monthly", "$95/month", "aFa28r2Tv5qk99SbgD6EU0a"],
  ["county-gold", "annual", "$950/year", "4gM4gz1Pr3ic0DmckH6EU0b"],
];
for (const [tier, billing, price, linkId] of checkoutCases) {
  test(`${tier} ${billing} emails Erik then automatically opens the matching checkout`, async ({
    page,
  }) => {
    let payload: { template_params: Record<string, string> } | undefined;
    let requests = 0;
    await page.route(emailEndpoint, async (route) => {
      requests++;
      payload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "OK",
      });
    });
    await page.goto("/");
    await submitButton(page).click();
    expect(requests).toBe(0);
    await fillRequest(page);
    await page.getByLabel("Partnership", { exact: true }).selectOption(tier);
    await page.getByLabel("Billing preference").selectOption(billing);
    await page.getByLabel("Referred by").fill("Example referrer");
    await page
      .getByLabel("Additional neighboring counties")
      .fill("Randall County");
    await expect(submitButton(page)).toContainText(price);
    await submitButton(page).click();
    const url = new URL(`https://buy.stripe.com/${linkId}`);
    url.searchParams.set("prefilled_email", "advertiser+test@example.test");
    await expect(page).toHaveURL(url.toString());
    expect(requests).toBe(1);
    expect(payload?.template_params.to_email).toBe("erik@patriotsinaction.com");
    expect(payload?.template_params.reply_to).toBe(
      "advertiser+test@example.test",
    );
    expect(payload?.template_params.message).toContain(
      "Potter County, Texas (FIPS 48375)",
    );
    expect(payload?.template_params.message).toContain(
      `advertisedRate: ${price}`,
    );
    expect(payload?.template_params.message).toContain("Example referrer");
    expect(payload?.template_params.message).toContain("Randall County");
    expect(payload?.template_params.message).toContain("contactConsent: Yes");
  });
}

test("retains details on delivery failure and only opens checkout after a successful retry", async ({
  page,
}) => {
  await page.route(emailEndpoint, (route) =>
    route.fulfill({ status: 429, body: "Rate limited" }),
  );
  await page.goto("/");
  await fillRequest(page);
  await submitButton(page).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t send");
  await expect(page.getByRole("alert").getByRole("link")).toHaveAttribute(
    "href",
    "mailto:dan@patriotsinaction.com",
  );
  await expect(page.getByLabel("Business or organization")).toHaveValue(
    "Example Community Shop",
  );
  await expect(page).toHaveURL("http://127.0.0.1:4186/");
  await page.getByLabel("Billing preference").selectOption("annual");
  await page.route(emailEndpoint, (route) =>
    route.fulfill({ status: 200, body: "OK" }),
  );
  await submitButton(page).click();
  await expect(page).toHaveURL(/buy\.stripe\.com\/5kQbJ1eCdcSMbi02K76EU08\?/);
});

for (const tier of ["national-level", "county-sponsor", "county-platinum"]) {
  test(`${tier} requests a quote without opening an unrelated payment form`, async ({
    page,
  }) => {
    await page.goto("/");
    await fillRequest(page);
    await page.getByLabel("Partnership", { exact: true }).selectOption(tier);
    await expect(submitButton(page)).toHaveText("Request a quote →");
    await submitButton(page).click();
    await expect(page.getByRole("status")).toContainText("has been sent");
    await expect(
      page.getByRole("link", { name: "Continue to Stripe" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL("http://127.0.0.1:4186/");
    await page
      .getByLabel("Partnership", { exact: true })
      .selectOption("patriot-preferred");
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(submitButton(page)).toBeEnabled();
  });
}

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
  await expect(page.getByLabel("Primary county")).toHaveValue("");
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

test("keeps the submitted plan fixed while delivery is pending", async ({
  page,
}) => {
  let finish: () => void = () => {};
  let requests = 0;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(emailEndpoint, async (route) => {
    requests++;
    await pending;
    await route.fulfill({ status: 200, body: "OK" });
  });
  await page.goto("/");
  await fillRequest(page);
  await submitButton(page).click();
  await expect(
    page.getByRole("button", { name: "Sending your request" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Choose Platinum" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Annual Save 2 months" }),
  ).toBeDisabled();
  await expect(page).toHaveURL("http://127.0.0.1:4186/");
  finish();
  await expect(page).toHaveURL(/buy\.stripe\.com\/8x28wP9hTdWQ2Lu98v6EU09\?/);
  expect(requests).toBe(1);
});
