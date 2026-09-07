import { test, expect, type Page } from "@playwright/test";

async function isolateExternalServices(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost", "news.fixture"].includes(url.hostname)) return route.continue();
    if (url.hostname.startsWith("cognito-idp.")) return route.fulfill({ json: { AuthenticationResult: { IdToken: "fixture-reviewer-id-token", AccessToken: "fixture-access-token", ExpiresIn: 3600 } } });
    return route.abort();
  });
  await page.route("**/api/rss-feed?**", (route) => route.fulfill({ json: { items: [] } }));
}

function newsPayload(url: string) {
  const parts = new URL(url).pathname.split("/");
  const county = parts[3] === "counties";
  const topic = parts[county ? 6 : 5];
  const place = county ? parts[5] : parts[4];
  return { scope: { level: county ? "county" : "state", stateSlug: parts[4], ...(county ? { countySlug: parts[5] } : {}) }, topic,
    items: Array.from({ length: 12 }, (_, i) => ({ id: `${place}-${topic}-${i}`, title: `${place} ${topic} story ${i+1}`, link: `https://publisher.example/${place}/${topic}/${i}`, source: "Local Publisher", publishedAt: new Date().toISOString(), mediaType: i === 0 ? "video" : "article" })),
    meta: { fetchedAt: new Date().toISOString(), cacheTtlSeconds: 300, sourcesUsed: ["county:primary"], hasMore: false } };
}

test("candidate submission, private review, approval and public directory use the real API handler", async ({ page, request }) => {
  await isolateExternalServices(page);
  await page.goto("/candidate-form");
  await page.getByLabel("Candidate display name").fill("Alex Integration");
  await page.getByLabel("Office sought").fill("County Commissioner");
  await page.getByLabel("County, if applicable").selectOption("potter");
  await page.getByLabel("Your name", { exact: true }).fill("Private Campaign Staff");
  await page.getByLabel("Your email", { exact: true }).fill("private-campaign@example.com");
  await page.getByLabel("I attest").check();
  await page.getByLabel("I consent").check();
  await page.getByRole("button", { name: "Submit Candidate Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your candidate profile was received");
  const publicBefore = await request.get("http://127.0.0.1:8791/v1/candidates");
  expect((await publicBefore.json()).data).toEqual([]);
  await page.goto("/candidate-review");
  await page.getByLabel("Email or username").fill("reviewer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture Password 123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByLabel("Candidate name", { exact: true })).toHaveValue("Alex Integration");
  await page.getByLabel("Biography", { exact: true }).fill("Reviewed candidate biography.");
  await page.getByLabel("Public email", { exact: true }).fill("public-campaign@example.com");
  await page.getByLabel("Public phone", { exact: true }).fill("806-555-0100");
  await page.getByLabel("Website URL", { exact: true }).fill("https://campaign.example/");
  await page.getByLabel("Portrait URL", { exact: true }).fill("https://campaign.example/alex.png");
  await page.getByLabel("Video embed URL", { exact: true }).fill("https://player.vimeo.com/video/123456789");
  await page.getByLabel("Video title", { exact: true }).fill("Alex candidate interview");
  await page.getByLabel("Facebook URL", { exact: true }).fill("https://facebook.com/alex-campaign");
  await page.getByLabel("X / Twitter URL", { exact: true }).fill("https://x.com/alex-campaign");
  await page.getByLabel("Instagram URL", { exact: true }).fill("https://instagram.com/alex-campaign");
  await page.getByLabel("YouTube URL", { exact: true }).fill("https://youtube.com/@alex-campaign");
  await page.getByLabel("Review notes / denial reason", { exact: true }).fill("Private review note");
  const writes: string[] = [];
  page.on("request", (outgoing) => {
    if (outgoing.url().includes("/v1/") && ["POST", "PATCH"].includes(outgoing.method())) writes.push(outgoing.url());
  });
  const previewButton = page.getByRole("button", { name: "Preview Profile", exact: true }).first();
  await previewButton.click();
  const preview = page.getByRole("dialog", { name: "Profile preview", exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await expect(preview.getByText("Reviewed candidate biography.")).toBeVisible();
  await expect(preview.getByRole("img", { name: "Alex Integration", exact: true })).toHaveAttribute("src", "https://campaign.example/alex.png");
  await expect(preview.locator("iframe")).toHaveAttribute("src", "https://player.vimeo.com/video/123456789");
  await expect(preview.locator("iframe")).toHaveAttribute("title", "Alex candidate interview");
  await expect(preview.getByRole("link", { name: "public-campaign@example.com", exact: true })).toHaveAttribute("href", "mailto:public-campaign@example.com");
  await expect(preview.getByRole("link", { name: "Website", exact: true })).toHaveAttribute("href", "https://campaign.example/");
  for (const link of ["Facebook", "X / Twitter", "Instagram", "YouTube"]) await expect(preview.getByRole("link", { name: link, exact: true })).toBeAttached();
  await expect(preview).not.toContainText("Private Campaign Staff");
  await expect(preview).not.toContainText("private-campaign@example.com");
  await expect(preview).not.toContainText("Private review note");
  await expect(preview.getByRole("button", { name: "Share Candidate Profile", exact: true })).toBeDisabled();
  await expect(preview.getByRole("link", { name: "Direct profile", exact: true })).toHaveAttribute("aria-disabled", "true");
  await preview.getByRole("link", { name: "Direct profile", exact: true }).dispatchEvent("click");
  await expect(page).toHaveURL(/\/candidate-review$/);
  expect(writes).toEqual([]);
  expect((await (await request.get("http://127.0.0.1:8791/v1/candidates")).json()).data).toEqual([]);
  const previewDetails = await preview.locator(".candidate-details").innerText();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(previewButton).toBeFocused();
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Reviewed candidate biography.");
  await page.getByLabel("Candidate name", { exact: true }).fill("Alex Updated Preview");
  await page.setViewportSize({ width: 390, height: 844 });
  await previewButton.click();
  await expect(preview.getByRole("heading", { name: "Alex Updated Preview", exact: true })).toBeVisible();
  expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await preview.getByRole("button", { name: "Close Preview", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await page.getByLabel("Candidate name", { exact: true }).fill("Alex Integration");
  await page.getByRole("button", { name: "Approve & Publish" }).click();
  await expect(page.getByRole("status")).toContainText("Candidate approved");
  const publicAfter = await request.get("http://127.0.0.1:8791/v1/candidates");
  const body = await publicAfter.json();
  expect(body.data).toHaveLength(1);
  expect(JSON.stringify(body)).not.toContain("private-campaign@example.com");
  const id = body.data[0].id;
  await page.goto(`/candidates/${id}`);
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await expect(page.getByText("Reviewed candidate biography.")).toBeVisible();
  expect(await page.locator(".candidate-profile .candidate-details").innerText()).toBe(previewDetails);
  await expect(page.locator(".candidate-profile iframe")).toHaveAttribute("src", "https://player.vimeo.com/video/123456789");
  await page.goto("/tx/potter/candidates");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await page.goto("/tx/candidates");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
});

test("all county widgets share the API, retain headlines during a topic failure, and retry", async ({ page }) => {
  await isolateExternalServices(page);
  const calls: string[] = [];
  let failSports = true;
  await page.route("https://news.fixture/**", (route) => {
    calls.push(route.request().url());
    if (new URL(route.request().url()).pathname.endsWith("/sports") && failSports) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    return route.fulfill({ json: newsPayload(route.request().url()) });
  });
  await page.goto("/tx/potter/news");
  const general = page.getByRole("article", { name: "County & City News", exact: true });
  await expect(general.getByText("potter general story 1", { exact: true })).toBeVisible();
  const sports = page.getByRole("article", { name: "High School & College Sports", exact: true });
  await expect(sports.getByRole("alert")).toBeVisible();
  failSports = false;
  await sports.getByRole("button", { name: "Retry news feed" }).click();
  await expect(sports.getByText("potter sports story 1", { exact: true })).toBeVisible();
  expect(calls.filter((url) => new URL(url).pathname.endsWith("/general"))).toHaveLength(1);
  expect(new Set(calls.map((url) => new URL(url).pathname.split("/").at(-1)))).toEqual(new Set(["general", "obituaries", "politics", "municipal-bonds", "budgets-levies", "property-taxes", "sports"]));
  await general.getByRole("button", { name: "Load more stories" }).click();
  await expect(general.getByText("potter general story 10", { exact: true })).toBeAttached();
});

test("state feeds and county navigation select the correct geography on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await isolateExternalServices(page);
  await page.route("https://news.fixture/**", (route) => route.fulfill({ json: newsPayload(route.request().url()) }));
  await page.goto("/texas");
  await expect(page).toHaveURL(/\/tx$/);
  await expect(page.getByText("texas general story 1", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Randall County Canyon", exact: true }).click();
  await expect(page.getByRole("article", { name: "County & City News", exact: true }).getByText("randall general story 1", { exact: true })).toBeVisible();
  await expect(page.getByText("potter general story 1", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("changing form state clears the county and errors preserve entered information", async ({ page }) => {
  await isolateExternalServices(page);
  await page.goto("/candidate-form");
  await page.getByLabel("County, if applicable").selectOption("potter");
  await page.getByLabel("State", { exact: true }).selectOption("alaska");
  await expect(page.getByLabel("County, if applicable")).toHaveValue("");
  await page.getByLabel("Race scope").selectOption("statewide");
  await page.getByLabel("Candidate display name").fill("Sam Statewide");
  await page.getByLabel("Office sought").fill("Governor");
  await page.getByLabel("Your name", { exact: true }).fill("Sam");
  await page.getByLabel("Your email", { exact: true }).fill("sam@example.com");
  await page.getByLabel("I attest").check(); await page.getByLabel("I consent").check();
  await page.route("**/v1/candidates/submissions", (route) => route.fulfill({ status: 503, json: { error: "Please try again" } }));
  await page.getByRole("button", { name: "Submit Candidate Profile", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Please try again");
  await expect(page.getByLabel("Candidate display name")).toHaveValue("Sam Statewide");
});
