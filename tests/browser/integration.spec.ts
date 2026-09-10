import { test, expect, type Page } from "@playwright/test";

async function isolateExternalServices(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost", "news.fixture"].includes(url.hostname)) return route.continue();
    if (url.hostname.startsWith("cognito-idp.") && route.request().headers()["x-amz-target"]?.endsWith("ChangePassword")) {
      const input = route.request().postDataJSON();
      return input.PreviousPassword === "Fixture Password 123!" ? route.fulfill({ json: {} }) : route.fulfill({ status: 400, json: { message: "Incorrect username or password." } });
    }
    if (url.hostname.startsWith("cognito-idp.")) return route.fulfill({ json: { AuthenticationResult: { IdToken: "fixture-reviewer-id-token", AccessToken: "fixture-access-token", ExpiresIn: 3600 } } });
    return route.abort();
  });
  await page.route("**/api/rss-feed?**", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/mighty/**", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/vimeo-showcase?**", (route) => route.fulfill({ json: { videos: [] } }));
}

test("candidate submission, private review, approval and public directory use the real API handler", async ({ page, request }) => {
  await isolateExternalServices(page);
  await page.goto("/candidate-form");
  await page.getByLabel("Candidate display name").fill("Alex Integration");
  await page.getByLabel("Office sought").fill("County Commissioner");
  await page.getByLabel("County, if applicable").selectOption("potter");
  await page.getByLabel("Your name", { exact: true }).fill("Private Campaign Staff");
  await page.getByLabel("Your email", { exact: true }).fill("private-campaign@example.com");
  await expect(page.getByText("Fields marked", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "erik@patriotsinaction.com", exact: true })).toBeVisible();
  const fixturePng = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 40; canvas.height = 60; const context = canvas.getContext("2d")!; context.fillStyle = "navy"; context.fillRect(0, 0, 40, 60); return canvas.toDataURL("image/png").split(",")[1]; });
  await page.getByLabel("Upload profile picture").setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: Buffer.from(fixturePng, "base64") });
  await expect(page.getByLabel("Portrait image URL", { exact: true })).toHaveValue(/^http:\/\/127.0.0.1:8791\/v1\/candidates\/photos\/.+\.jpg$/);
  const uploadedPhoto = await page.getByLabel("Portrait image URL", { exact: true }).inputValue();
  const photoResponse = await request.get(uploadedPhoto);
  expect(photoResponse.status()).toBe(200);
  expect(photoResponse.headers()["content-type"]).toBe("image/jpeg");
  await page.getByLabel("I attest").check();
  await page.getByLabel("I consent").check();
  const receiptResponse = page.waitForResponse((response) => response.url().endsWith("/v1/candidates/submissions") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit Candidate Profile", exact: true }).click();
  const id = (await (await receiptResponse).json()).data.submissionId;
  await expect(page.getByRole("main").getByRole("status")).toContainText("Your candidate profile was received");
  const publicBefore = await request.get("http://127.0.0.1:8791/v1/candidates");
  const baselineDirectory = (await publicBefore.json()).data;
  expect(baselineDirectory.some((candidate: { id: string }) => candidate.id === id)).toBe(false);
  await page.goto("/candidate-review");
  await page.getByLabel("Email or username").fill("reviewer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture Password 123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByLabel("Search candidates").fill(id);
  await expect(page.getByLabel("Candidate name", { exact: true })).toHaveValue("Alex Integration");
  await expect(page.getByLabel("Portrait URL", { exact: true })).toHaveValue(uploadedPhoto);
  await page.getByLabel("Biography", { exact: true }).fill("Reviewed candidate biography.");
  await page.getByRole("button", { name: "Change Password", exact: true }).click();
  await page.getByLabel("Current password", { exact: true }).fill("wrong password");
  await page.getByLabel("New password", { exact: true }).fill("ChangedFixture123!");
  await page.getByLabel("Confirm new password", { exact: true }).fill("DifferentFixture123!");
  await page.getByRole("button", { name: "Update Password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  await page.getByLabel("Confirm new password", { exact: true }).fill("ChangedFixture123!");
  await page.getByRole("button", { name: "Update Password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Incorrect");
  await page.getByLabel("Current password", { exact: true }).fill("Fixture Password 123!");
  await page.getByRole("button", { name: "Update Password", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("You are still signed in");
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Reviewed candidate biography.");
  await page.getByRole("button", { name: "Change Password", exact: true }).click();
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
  expect((await (await request.get("http://127.0.0.1:8791/v1/candidates")).json()).data).toEqual(baselineDirectory);
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
  await expect(page.getByRole("main").getByRole("status")).toContainText("Candidate approved");
  const publicAfter = await request.get("http://127.0.0.1:8791/v1/candidates");
  const body = await publicAfter.json();
  expect(body.data.filter((candidate: { id: string }) => candidate.id === id)).toHaveLength(1);
  expect(body.data.filter((candidate: { id: string }) => candidate.id !== id)).toEqual(baselineDirectory);
  expect(JSON.stringify(body)).not.toContain("private-campaign@example.com");
  await page.goto(`/candidates/${id}`);
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await expect(page.getByText("Reviewed candidate biography.")).toBeVisible();
  expect(await page.locator(".candidate-profile .candidate-details").innerText()).toBe(previewDetails);
  await expect(page.locator(".candidate-profile iframe")).toHaveAttribute("src", "https://player.vimeo.com/video/123456789");
  await page.goto("/tx/potter/candidates");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await page.goto("/tx/candidates");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await page.goto("/candidates");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toBeVisible();
  await page.getByLabel("Office level", { exact: true }).selectOption("federal");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toHaveCount(0);
  await page.goto("/tx/randall/candidates");
  await expect(page.getByRole("heading", { name: "Alex Integration", exact: true })).toHaveCount(0);
});

test("county home and news pages link to County Post and retain the PIA video section", async ({ page }) => {
  await isolateExternalServices(page);
  const calls: string[] = [];
  await page.route("https://news.fixture/**", (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  for (const path of ["/tx/potter", "/tx/potter/news"]) {
    await page.goto(path);
    const section = page.locator(".county-post-news-section");
    await expect(section.getByRole("heading", { name: "The County Post", exact: true })).toBeVisible();
    await expect(section).toContainText("Follow reporting for Potter County");
    const links = section.getByRole("link", { name: "Visit The County Post", exact: true });
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", "https://thecountypost.com");
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noreferrer/);
    }
    await expect(section.getByRole("img", { name: "The County Post" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Patriots in Action video feed" })).toBeVisible();
  }
  expect(calls).toEqual([]);
});

test("state and county news promotions follow the selected geography on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await isolateExternalServices(page);
  await page.goto("/texas");
  await expect(page).toHaveURL(/\/tx$/);
  await expect(page.locator(".county-post-news-section")).toContainText("Follow reporting for Texas");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Randall County Canyon", exact: true }).click();
  await expect(page).toHaveURL(/\/tx\/randall$/);
  await expect(page.locator(".county-post-news-section")).toContainText("Follow reporting for Randall County");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("county calendars load later pages and show future recurring meetings without expired events", async ({ page }) => {
  await isolateExternalServices(page);
  await page.clock.setFixedTime(new Date("2026-09-10T12:00:00Z"));
  const pages = new Set<string>();
  await page.route("**/api/mighty/spaces/*/events?**", (route) => {
    const pageNumber = new URL(route.request().url()).searchParams.get("page") || "1";
    pages.add(pageNumber);
    return route.fulfill({ json: pageNumber === "1" ? {
      items: [{ id: 1, title: "Expired meeting", starts_at: "2026-09-01T09:00:00-05:00" }],
      links: { next: "?page=2" },
    } : {
      items: [
        { id: 2, title: "Community gathering", starts_at: "2026-09-12T11:00:00-05:00", permalink: "https://community.example/events/2" },
        { id: 3, title: "Second Monday meeting", starts_at: "2026-04-13T09:00:00-05:00", time_zone: "America/Chicago", recurrence_rule: "FREQ=MONTHLY;BYDAY=2MO;COUNT=10" },
      ],
      links: {},
    } });
  });
  await page.goto("/tx/potter/events");
  const events = page.locator(".event-list");
  await expect(events.getByText("Community gathering", { exact: true })).toBeVisible();
  await expect(events.getByText("Second Monday meeting", { exact: true })).toHaveCount(5);
  await expect(events.getByText("Expired meeting", { exact: true })).toHaveCount(0);
  await expect(events.getByRole("link", { name: "View event" })).toHaveAttribute("href", "https://community.example/events/2");
  expect(pages).toEqual(new Set(["1", "2"]));
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

test("federal and statewide profiles reach covered counties and the national directory without leaking pending drafts", async ({ page, request }) => {
  await isolateExternalServices(page);
  const fixtures = [
    { id: "fixture-senate", name: "Federal Senate Fixture", office: "U.S. Senator", officeLevel: "federal", scope: "statewide", stateSlug: "texas" },
    { id: "fixture-house", name: "Federal House Fixture", office: "U.S. Representative", officeLevel: "federal", scope: "district", stateSlug: "texas", countySlug: "potter", countySlugs: ["randall"], district: "13" },
    { id: "fixture-governor", name: "State Governor Fixture", office: "Governor", officeLevel: "state", scope: "statewide", stateSlug: "texas" },
    { id: "fixture-pending", name: "Unpublished Research Fixture", office: "Governor", officeLevel: "state", scope: "statewide", stateSlug: "texas" },
  ];
  const headers = { Authorization: "Bearer fixture-reviewer-id-token" };
  for (const candidate of fixtures) {
    expect((await request.post("http://127.0.0.1:8791/v1/admin/candidates", { headers, data: { candidate, reviewReason: "Fixture source" } })).status()).toBe(201);
    if (candidate.id !== "fixture-pending") expect((await request.post(`http://127.0.0.1:8791/v1/admin/candidates/${candidate.id}/approve`, { headers, data: { expectedRevision: 1 } })).status()).toBe(200);
  }
  await page.goto("/tx/randall/candidates");
  for (const name of fixtures.slice(0, 3).map((candidate) => candidate.name)) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText("Unpublished Research Fixture", { exact: true })).toHaveCount(0);
  await page.goto("/tx/travis/candidates");
  await expect(page.getByRole("heading", { name: "Federal Senate Fixture", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Federal House Fixture", exact: true })).toHaveCount(0);
  await page.goto("/tx/candidates");
  const federal = page.locator("section.section").filter({ has: page.getByRole("heading", { name: "Federal candidates in Texas", exact: true }) });
  await expect(federal.getByRole("heading", { name: "Federal House Fixture", exact: true })).toBeVisible();
  await expect(federal.getByRole("heading", { name: "State Governor Fixture", exact: true })).toHaveCount(0);
  await page.goto("/candidates");
  await page.getByLabel("Office level", { exact: true }).selectOption("federal");
  await expect(page.getByRole("heading", { name: "Federal House Fixture", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "State Governor Fixture", exact: true })).toHaveCount(0);
  await page.getByLabel("State", { exact: true }).selectOption("alaska");
  await expect(page.getByRole("heading", { name: "Federal House Fixture", exact: true })).toHaveCount(0);
});
