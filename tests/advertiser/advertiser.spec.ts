import { expect, test, type Page } from "@playwright/test";

const emailEndpoint = "https://api.emailjs.com/api/v1.0/email/send";
async function fillRequest(page: Page) {
  await page
    .getByLabel("Business or organization")
    .fill("Example Community Shop");
  await page.getByLabel("Your name").fill("Test Advertiser");
  await page.getByLabel("Email address").fill("advertiser@example.test");
  await page.getByLabel("State", { exact: true }).selectOption("TX");
  await page.getByLabel("Primary county").selectOption("48375");
  await page.getByLabel("I agree to be contacted").check();
}

test.beforeEach(async ({ page }) => {
  // Every test prevents outbound email, even if a test unexpectedly submits.
  await page.route(emailEndpoint, (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "OK" }),
  );
});

test("rates, tier selection, national quotes, and legacy links", async ({
  page,
}) => {
  await page.goto("/payments");
  await expect(page).toHaveURL(/\/#campaign$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Show up where",
  );
  await page.getByRole("button", { name: "Annual Save 2 months" }).click();
  await expect(page.locator(".price-card").nth(1)).toContainText("$2,950");
  await page.getByRole("button", { name: "Choose Platinum" }).click();
  await expect(page.getByLabel("Partnership", { exact: false })).toHaveValue(
    "platinum-business",
  );
  await expect(page.locator(".campaign-summary")).toContainText("$4,950");
  await page.getByRole("button", { name: "Plan a national campaign" }).click();
  await expect(page.locator(".campaign-summary")).toContainText(
    "Custom national proposal",
  );
  await expect(page.getByLabel("Primary county")).toHaveCount(0);
  await page.goto("/#%invalid-selector");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("validates and sends campaign details before showing the matching Stripe checkout", async ({
  page,
}) => {
  let payload: { template_params: Record<string, string> } | undefined;
  let requests = 0;
  await page.route(emailEndpoint, async (route) => {
    requests++;
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "text/plain", body: "OK" });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Send campaign request" }).click();
  expect(requests).toBe(0);
  await fillRequest(page);
  await page.getByLabel("Referred by").fill("Example referrer");
  await page
    .getByLabel("Additional neighboring counties")
    .fill("Randall County");
  await page.getByRole("button", { name: "Send campaign request" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your campaign request has been sent.",
  );
  expect(requests).toBe(1);
  expect(payload?.template_params.to_email).toBe("erik@patriotsinaction.com");
  expect(payload?.template_params.message).toContain(
    "Potter County, Texas (FIPS 48375)",
  );
  expect(payload?.template_params.message).toContain("Example referrer");
  expect(payload?.template_params.message).toContain("Randall County");
  expect(payload?.template_params.message).toContain("contactConsent: Yes");
  await expect(
    page.getByRole("link", { name: "Continue to Stripe" }),
  ).toHaveAttribute("href", "https://buy.stripe.com/8x28wP9hTdWQ2Lu98v6EU09");
  await expect(
    page.getByRole("button", { name: "Request sent" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Annual Save 2 months" }).click();
  await expect(
    page.getByRole("link", { name: "Continue to Stripe" }),
  ).toHaveCount(0);
});

test("retains details on delivery failure and retries without claiming success", async ({
  page,
}) => {
  await page.route(emailEndpoint, (route) =>
    route.fulfill({ status: 429, body: "Rate limited" }),
  );
  await page.goto("/");
  await fillRequest(page);
  await page.getByRole("button", { name: "Send campaign request" }).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t send");
  await expect(page.getByLabel("Business or organization")).toHaveValue(
    "Example Community Shop",
  );
  await expect(
    page.getByRole("link", { name: "Continue to Stripe" }),
  ).toHaveCount(0);
  await page.route(emailEndpoint, (route) =>
    route.fulfill({ status: 200, body: "OK" }),
  );
  await page.getByRole("button", { name: "Send campaign request" }).click();
  await expect(page.getByRole("status")).toContainText("has been sent");
});

test("national form needs no county and never offers an unrelated payment link", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Plan a national campaign" }).click();
  await page
    .getByLabel("Business or organization")
    .fill("Example National Brand");
  await page.getByLabel("Your name").fill("Test Advertiser");
  await page.getByLabel("Email address").fill("advertiser@example.test");
  await page.getByLabel("I agree to be contacted").check();
  await page.getByRole("button", { name: "Send campaign request" }).click();
  await expect(page.getByRole("status")).toContainText("has been sent");
  await expect(
    page.getByRole("link", { name: "Continue to Stripe" }),
  ).toHaveCount(0);
});

test("county resets on state change and artwork stays local with usable carousel controls", async ({
  page,
}) => {
  await page.goto("/");
  await fillRequest(page);
  await page.getByLabel("State", { exact: true }).selectOption("OK");
  await expect(page.getByLabel("Primary county")).toHaveValue("");
  await expect(page.locator(".example-description")).toHaveCount(4);
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
  await page.getByLabel("Choose artwork").setInputFiles({
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
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(emailEndpoint, async (route) => {
    await pending;
    await route.fulfill({ status: 200, body: "OK" });
  });
  await page.goto("/");
  await fillRequest(page);
  await page.getByRole("button", { name: "Send campaign request" }).click();
  await expect(
    page.getByRole("button", { name: "Sending your request" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Choose Platinum" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Annual Save 2 months" }),
  ).toBeDisabled();
  finish();
  await expect(page.getByRole("status")).toContainText("has been sent");
});
