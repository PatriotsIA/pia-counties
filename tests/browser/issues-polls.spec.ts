import { test, expect, type Page } from "@playwright/test";
import catalog from "../../src/data/issue-polls.json" with { type: "json" };

async function fixture(page: Page, options: { loseFirstReply?: boolean; unavailable?: boolean } = {}) {
  const polls = catalog.map(p => ({ ...p, total: 0, options: p.options.map(o => ({ ...o, count: 0 })) }));
  const votes = new Map<string, string>();
  const submitted: { voterId: string; option: string; version: string }[] = [];
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.route("**/polls", route => options.unavailable ? route.fulfill({ status: 503, json: { error: "unavailable" } }) : route.fulfill({ json: { polls } }));
  await page.route("**/polls/*/votes", async route => {
    const body = route.request().postDataJSON(); submitted.push(body);
    const id = new URL(route.request().url()).pathname.split("/")[2];
    const poll = polls.find(p => p.id === id)!;
    const key = `${id}:${body.voterId}`;
    const existing = votes.get(key);
    if (!existing) { votes.set(key, body.option); poll.total++; poll.options.find(o => o.id === body.option)!.count++; }
    if (options.loseFirstReply && submitted.length === 1) return route.abort();
    return route.fulfill({ status: existing ? 200 : 201, json: { alreadyRecorded: !!existing, recordedOption: existing || body.option, poll } });
  });
  return { polls, submitted };
}

for (const width of [1280, 390, 320]) {
  test(`issues and independent poll results work at ${width}px`, async ({ page }) => {
    const { submitted } = await fixture(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/issues");
    await expect(page).toHaveTitle(/Issues & Opinion Polls/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://patriotsinaction.com/issues");
    for (let i = 0; i < catalog.length; i++) {
      const section = page.locator(`#${catalog[i].id}`);
      await section.getByRole("button", { name: "View results", exact: true }).click();
      await expect(section).toContainText("No responses yet.");
      await section.getByRole("radio", { name: i === 0 ? "Yes" : i === 1 ? "No" : "Not sure", exact: true }).check();
      await section.getByRole("button", { name: "Submit response" }).click();
      await expect(section).toContainText("Your response has been recorded.");
      await expect(section).toContainText("1 response");
      await expect(section).toContainText("100%");
      await expect(section.getByRole("button", { name: "Submit response" })).toHaveCount(0);
    }
    expect(submitted).toHaveLength(3);
    expect(new Set(submitted.map(s => s.voterId)).size).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(page.locator(".poll-choice small")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Submit response" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Visit Patriots for Paper" })).toHaveAttribute("href", "https://www.patriotsforpaper.com/");
    await page.getByRole("link", { name: "Explore Recover America" }).click();
    await expect(page.locator("h1")).toContainText("Recover America");
  });
}

test("a lost success response retries with the same ID and is counted once", async ({ page }) => {
  const { submitted, polls } = await fixture(page, { loseFirstReply: true });
  await page.goto("/issues");
  const section = page.locator("#paper-voting");
  await section.getByRole("radio", { name: "Yes", exact: true }).check();
  await section.getByRole("button", { name: "Submit response" }).click();
  await expect(section.getByRole("alert")).toContainText("couldn’t confirm");
  await expect(section.getByRole("radio", { name: "Yes", exact: true })).toBeChecked();
  await section.getByRole("button", { name: "Submit response" }).click();
  await expect(section).toContainText("already recorded");
  expect(submitted[0].voterId).toBe(submitted[1].voterId);
  expect(polls[0].total).toBe(1);
});

test("unavailable polls do not display invented zeroes or accept votes", async ({ page }) => {
  await fixture(page, { unavailable: true });
  await page.goto("/issues");
  await expect(page.locator(".poll-error")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "View results", exact: true })).toHaveCount(0);
  for (const button of await page.getByRole("button", { name: "Submit response" }).all()) await expect(button).toBeDisabled();
  await expect(page.getByRole("link", { name: "Visit Texas Sharia Watch" })).toBeVisible();
});

test("a page opened earlier reuses the browser ID saved by another tab", async ({ page }) => {
  const { submitted } = await fixture(page);
  await page.goto("/issues");
  const voterId = "2b034983-3522-4b27-91ee-390a40f9be77";
  await page.evaluate(id => localStorage.setItem("pia-opinion:paper-voting:2026-10-26-v1", JSON.stringify({ voterId: id })), voterId);
  const section = page.locator("#paper-voting");
  await section.getByRole("radio", { name: "Yes", exact: true }).check();
  await section.getByRole("button", { name: "Submit response" }).click();
  await expect(section).toContainText("Your response has been recorded.");
  expect(submitted[0].voterId).toBe(voterId);
});

test("blocked browser storage prevents voting but leaves results available", async ({ page }) => {
  const { submitted } = await fixture(page);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("storage blocked"); }; });
  await page.goto("/issues");
  const section = page.locator("#paper-voting");
  await section.getByRole("radio", { name: "Yes", exact: true }).check();
  await section.getByRole("button", { name: "Submit response" }).click();
  await expect(section.getByRole("alert")).toContainText("Browser storage is unavailable");
  await section.getByRole("button", { name: "View results", exact: true }).click();
  await expect(section).toContainText("No responses yet.");
  expect(submitted).toHaveLength(0);
});
