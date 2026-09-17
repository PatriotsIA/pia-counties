import { test, expect, type Page } from "@playwright/test";

const api = "http://127.0.0.1:8791";
const headers = { Authorization: "Bearer fixture-reviewer-id-token" };
const answerLabel = "1. Background and Qualifications: Answer";

async function isolate(page: Page) {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    if (url.hostname.startsWith("cognito-idp.")) return route.fulfill({ json: { AuthenticationResult: { IdToken: "fixture-reviewer-id-token", AccessToken: "fixture-access-token", ExpiresIn: 3600 } } });
    return route.abort();
  });
  for (const path of ["**/api/rss-feed?**", "**/api/mighty/**", "**/api/vimeo-showcase?**"]) await page.route(path, (route) => route.fulfill({ json: { items: [], videos: [] } }));
}
async function submitter(page: Page) {
  await page.getByLabel("Your name", { exact: true }).fill("Private Questionnaire Submitter");
  await page.getByLabel("Your email", { exact: true }).fill("questionnaire-private@example.com");
  await page.locator('[name="submitterRole"]').selectOption("candidate");
  await page.getByLabel("I attest").check(); await page.getByLabel("I consent").check();
}
async function signIn(page: Page, id: string) {
  await page.goto("/candidate-review");
  await page.getByLabel("Email or username").fill("reviewer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture Password 123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByLabel("Search candidates").fill(id);
}

test("optional answers work for any state/party through intake, preview, publication, and a reviewed correction", async ({ page, request }) => {
  await isolate(page);
  await page.goto("/candidate-form");
  await page.getByLabel("Candidate display name").fill("Questionnaire Workflow Candidate");
  await page.getByLabel("Office sought").selectOption("governor");
  await page.getByLabel("State", { exact: true }).selectOption("alaska");
  await page.getByLabel("Race scope", { exact: true }).selectOption("statewide");
  await page.getByLabel("Office level", { exact: true }).selectOption("state");
  await page.getByLabel("Political party", { exact: true }).fill("Independent");
  await page.getByLabel("Office sought", { exact: true }).selectOption("governor");
  await expect(page.locator(".questionnaire-question")).toHaveCount(20);
  await expect(page.locator(".candidate-questionnaire")).toContainText("Governor of Alaska");
  await expect(page.locator(".candidate-questionnaire")).not.toContainText("Texas");
  await page.getByLabel("Would you like to schedule an interview with Patriots In Action?", { exact: true }).check();
  await page.getByLabel("Would you like to advertise your candidacy on Patriots In Action?", { exact: true }).check();
  await expect(page.getByRole("link", { name: "View advertising options" })).toHaveAttribute("href", "https://advertise.patriotsinaction.com");
  await page.getByLabel(answerLabel, { exact: true }).fill("Candidate's original background response.");
  await page.getByLabel("11. Hand-Marked Ballots (Yes or No): Yes or No", { exact: true }).selectOption("No");
  await page.getByLabel("2018 primary", { exact: true }).selectOption("Did not vote");
  await page.getByLabel("None of the above", { exact: true }).check();
  await page.getByLabel("19. Local party, last four years ($)", { exact: true }).fill("0");
  await page.getByLabel("19. State party, last four years ($)", { exact: true }).fill("50.25");
  await page.getByLabel("Source of funds", { exact: true }).selectOption("Personal funds");
  await submitter(page);
  const receiptResponse = page.waitForResponse((response) => response.url().endsWith("/v1/candidates/submissions") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit Candidate Profile", exact: true }).click();
  const receipt = (await (await receiptResponse).json()).data;
  await expect(page.getByRole("main").getByRole("status")).toContainText("Your candidate profile was received");
  await expect(page.getByLabel("Office sought", { exact: true })).toHaveValue("");
  expect((await request.get(`${api}/v1/candidates/${receipt.submissionId}`)).status()).toBe(404);
  const record = (await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data;
  expect(record.candidate.voterGuide.answers[2]).toBeUndefined();
  expect(record.candidate.voterGuide.answers[19].amounts["Local party, last four years ($)"]).toBe("0");
  expect(record.submitter.interviewRequested).toBe(true);
  expect(record.submitter.advertisingRequested).toBe(true);
  expect(record.candidate).not.toHaveProperty("interviewRequested");
  expect(record.candidate).not.toHaveProperty("advertisingRequested");

  await signIn(page, receipt.submissionId);
  await expect(page.getByLabel("Interview requested", { exact: true })).toHaveValue("Yes");
  await expect(page.getByLabel("Advertising requested", { exact: true })).toHaveValue("Yes");
  await expect(page.getByLabel(answerLabel, { exact: true })).toHaveValue("Candidate's original background response.");
  await page.getByLabel(answerLabel, { exact: true }).fill("Reviewed background response, still unsaved.");
  await page.getByRole("button", { name: "Preview Profile", exact: true }).first().click();
  const preview = page.getByRole("dialog", { name: "Profile preview", exact: true });
  await expect(preview.getByText("Reviewed background response, still unsaved.", { exact: true })).toBeVisible();
  await expect(preview.getByText("No response provided.", { exact: true }).first()).toBeVisible();
  await expect(preview).not.toContainText("questionnaire-private@example.com");
  expect((await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data.candidate.voterGuide.answers[1].text).toBe("Candidate's original background response.");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Approve & Publish", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Candidate approved");
  await page.goto(`/candidates/${receipt.submissionId}`);
  const publicAnswers = page.getByRole("region", { name: "Candidate questionnaire responses", exact: true });
  await expect(publicAnswers).toContainText("Reviewed background response, still unsaved.");
  await expect(publicAnswers).toContainText("Governor of Alaska");
  await expect(publicAnswers).toContainText("Local party, last four years ($): $0");
  await expect(publicAnswers.locator(".questionnaire-public-answer")).toHaveCount(20);
  await page.setViewportSize({ width: 1280, height: 900 });
  await publicAnswers.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "coverage/questionnaire/profile-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await publicAnswers.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "coverage/questionnaire/profile-mobile.png" });

  await page.getByRole("link", { name: "Request Changes", exact: true }).click();
  await expect(page.getByLabel(answerLabel, { exact: true })).toHaveValue("Reviewed background response, still unsaved.");
  await page.getByLabel(answerLabel, { exact: true }).fill("Corrected questionnaire answer.");
  await page.getByLabel("Requested changes", { exact: true }).fill("Please correct the first answer.");
  await submitter(page);
  const changeResponse = page.waitForResponse((response) => response.url().endsWith("/v1/candidates/change-requests") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  const change = (await (await changeResponse).json()).data;
  expect((await (await request.get(`${api}/v1/candidates/${receipt.submissionId}`)).json()).data.voterGuide.answers[1].text).toBe("Reviewed background response, still unsaved.");
  await signIn(page, change.submissionId);
  const comparison = page.getByRole("table", { name: "Proposed profile changes" });
  await expect(comparison).toContainText("Corrected questionnaire answer.");
  await expect(comparison).not.toContainText("[object Object]");
  await page.getByRole("button", { name: "Apply to Published Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("applied");
  const final = (await (await request.get(`${api}/v1/candidates/${receipt.submissionId}`)).json()).data;
  expect(final.voterGuide.answers[1].text).toBe("Corrected questionnaire answer.");
  expect(final.voterGuide.answers[19]).toEqual(record.candidate.voterGuide.answers[19]);
  expect(final).not.toHaveProperty("interviewRequested");
  expect(final).not.toHaveProperty("advertisingRequested");
});

test("the top office selector drives live location wording and preserves answers when geography changes", async ({ page }) => {
  await isolate(page); await page.goto("/candidate-form");
  const office = page.getByLabel("Office sought", { exact: true });
  await expect(office).toHaveJSProperty("tagName", "SELECT");
  await expect(page.locator('.candidate-questionnaire select[name="voterGuideOffice"]')).toHaveCount(0);
  await office.selectOption("sheriff");
  await page.getByLabel("County, if applicable", { exact: true }).selectOption("potter");
  await expect(page.locator(".candidate-questionnaire")).toContainText("public safety issue in Potter County");
  await page.getByLabel(answerLabel, { exact: true }).fill("My experience remains in the form.");
  await page.getByLabel("State", { exact: true }).selectOption("louisiana");
  await expect(page.getByLabel("County, if applicable", { exact: true })).toHaveValue("");
  await expect(page.locator(".candidate-questionnaire")).not.toContainText("Potter");
  await page.getByLabel("County, if applicable", { exact: true }).selectOption("west-carroll");
  await expect(page.locator(".candidate-questionnaire")).toContainText("public safety issue in West Carroll Parish");
  await expect(page.locator(".candidate-questionnaire")).not.toContainText("Texas");
  await expect(page.getByLabel(answerLabel, { exact: true })).toHaveValue("My experience remains in the form.");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await office.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "coverage/questionnaire/office-mobile.png" });
});

test("office changes confirm answer loss, judicial notes remain visible, and word limits are enforced", async ({ page }) => {
  await isolate(page); await page.goto("/candidate-form");
  await page.getByLabel("Office sought", { exact: true }).selectOption("justice_of_the_peace");
  await expect(page.getByText("Note to judicial candidates:", { exact: false })).toBeVisible();
  await expect(page.getByText("Judicial candidates: Answer as permitted", { exact: false })).toHaveCount(2);
  const answer = page.getByLabel(answerLabel, { exact: true });
  await answer.fill(Array(151).fill("word").join(" "));
  expect(await answer.evaluate((element: HTMLTextAreaElement) => element.checkValidity())).toBe(false);
  await expect(page.getByText("151 / 150 words", { exact: true })).toBeVisible();
  await answer.fill("Preserved answer.");
  const short = page.getByLabel("19. Supporting the Party Financially (Yes or No): Explanation", { exact: true });
  await short.fill(Array(51).fill("word").join(" "));
  expect(await short.evaluate((element: HTMLTextAreaElement) => element.checkValidity())).toBe(false);
  await short.fill("");
  await page.getByLabel("Precinct chair", { exact: true }).check();
  await page.getByLabel("None of the above", { exact: true }).check();
  await expect(page.getByLabel("Precinct chair", { exact: true })).not.toBeChecked();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Office sought", { exact: true }).selectOption("sheriff");
  await expect(page.getByLabel("Office sought", { exact: true })).toHaveValue("justice_of_the_peace");
  await expect(answer).toHaveValue("Preserved answer.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Office sought", { exact: true }).selectOption("sheriff");
  await expect(answer).toHaveValue("");
  await expect(page.getByText("Note to judicial candidates:", { exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator(".candidate-questionnaire").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "coverage/questionnaire/form-mobile.png" });
});
