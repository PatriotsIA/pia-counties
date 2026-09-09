import { test, expect, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import process from "node:process";

async function isolateExternalServices(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost", "news.fixture"].includes(url.hostname)) return route.continue();
    if (url.hostname.startsWith("cognito-idp.")) return route.fulfill({ json: { AuthenticationResult: { IdToken: "fixture-reviewer-id-token", AccessToken: "fixture-access-token", ExpiresIn: 3600 } } });
    return route.abort();
  });
  await page.route("**/api/rss-feed?**", (route) => route.fulfill({ json: { items: [] } }));
}

async function fillSubmitter(page: Page) {
  await page.getByLabel("Your name", { exact: true }).fill("Current Requester");
  await page.getByLabel("Your email", { exact: true }).fill("current-requester@example.com");
  await page.getByLabel("Your relationship to the campaign").selectOption("campaign");
  await page.getByLabel("I attest").check();
  await page.getByLabel("I consent").check();
}

const publishedCandidate = { id: "request-published-fixture", name: "Published Request Fixture", office: "U.S. Representative", stateSlug: "texas", scope: "district", officeLevel: "federal", countySlug: "potter", countyName: "Potter County", countySlugs: ["randall"], district: "13", party: "Independent", electionYear: 2026, incumbent: true, phone: "806-555-0100", email: "public@example.com", image: "/candidates/existing.jpg", videoEmbedUrl: "https://www.youtube.com/embed/abcdefghijk", videoTitle: "Original interview", bio: "Original biography", facebookUrl: "https://facebook.com/fixture", xUrl: "https://x.com/fixture", instagramUrl: "https://instagram.com/fixture", youtubeUrl: "https://youtube.com/@fixture", websiteUrl: "https://campaign.example.com", profileUrl: "https://campaign.example.com/profile", ballotpediaUrl: "https://ballotpedia.org/Fixture" };

test("published direct links prefill the complete public form and submit only corrections (mock contract)", async ({ page }) => {
  await isolateExternalServices(page);
  await page.route("**/v1/candidates/*/change-target", (route) => route.fulfill({ json: { data: { candidate: publishedCandidate, submissionId: "published-source-reference", revision: 7, status: "approved" } } }));
  let body: Record<string, unknown> | undefined;
  await page.route("**/v1/candidates/change-requests", (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { data: { submissionId: "change-published-receipt", status: "pending", revision: 1, createdAt: "2026-09-09T12:00:00.000Z" } } });
  });
  await page.goto(`/candidate-form?mode=published&candidate=${publishedCandidate.id}`);
  await expect(page.getByLabel("Submission type", { exact: true })).toHaveValue("published");
  await expect(page.getByLabel("Candidate display name")).toHaveValue(publishedCandidate.name);
  for (const [label, value] of Object.entries({ "State": "texas", "Race scope": "district", "Office level": "federal", "County, if applicable": "potter", "Portrait image URL": publishedCandidate.image, "Video title": publishedCandidate.videoTitle, "Interview/video embed URL": publishedCandidate.videoEmbedUrl, "Facebook URL": publishedCandidate.facebookUrl, "X / Twitter URL": publishedCandidate.xUrl, "Instagram URL": publishedCandidate.instagramUrl, "YouTube URL": publishedCandidate.youtubeUrl, "Election year": "2026" })) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(page.locator('input[name="countySlugs"][value="randall"]')).toBeChecked();
  await expect(page.getByLabel("This candidate is the incumbent.")).toBeChecked();
  await expect(page.getByLabel("Your email", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("I consent")).not.toBeChecked();
  await page.getByLabel("Requested changes", { exact: true }).fill("Please remove the outdated phone and correct the biography.");
  await fillSubmitter(page);
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Change at least one profile field");
  expect(body).toBeUndefined();
  await page.getByLabel("Public campaign phone", { exact: true }).fill("");
  await page.getByLabel("Candidate biography or campaign statement", { exact: true }).fill("Corrected biography");
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("change-published-receipt");
  expect(body).toMatchObject({ targetStatus: "approved", targetSubmissionId: "published-source-reference", expectedTargetRevision: 7, candidate: { phone: null, bio: "Corrected biography" } });
  expect(body?.candidate).toEqual({ phone: null, bio: "Corrected biography" });
});

test("direct form users search the approved catalog and cannot submit an invalid target (mock contract)", async ({ page }) => {
  await isolateExternalServices(page);
  await page.route("**/v1/candidates?**", (route) => route.fulfill({ json: new URL(route.request().url()).searchParams.has("cursor") ? { data: [publishedCandidate] } : { data: [{ ...publishedCandidate, id: "another-catalog-candidate", name: "Another Candidate" }], nextCursor: "page-two" } }));
  await page.route("**/v1/candidates/*/change-target", (route) => route.request().url().includes(publishedCandidate.id) ? route.fulfill({ json: { data: { candidate: publishedCandidate, submissionId: "published-source-reference", revision: 7, status: "approved" } } }) : route.fulfill({ status: 404, json: { error: "Published profile not found" } }));
  await page.goto("/candidate-form");
  await page.getByLabel("Submission type", { exact: true }).selectOption("published");
  await page.getByLabel("Search published profiles", { exact: true }).fill("published request");
  await expect(page.getByLabel("Published profile", { exact: true }).getByRole("option")).toHaveCount(2);
  await page.getByLabel("Published profile", { exact: true }).selectOption(publishedCandidate.id);
  await expect(page.getByLabel("Candidate display name")).toHaveValue(publishedCandidate.name);
  await page.getByLabel("Published profile ID", { exact: true }).fill("private-draft-id");
  await page.getByRole("button", { name: "Load Profile", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Published profile not found");
  await expect(page.getByRole("button", { name: "Submit Change Request", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Candidate display name")).toHaveCount(0);
});

test("failed change requests preserve edits and reuse IDs only for identical retries (mock contract)", async ({ page }) => {
  await isolateExternalServices(page);
  const bodies: Array<{ requestId: string; reason: string }> = [];
  let releaseFirst!: () => void;
  const firstPending = new Promise<void>((resolve) => { releaseFirst = resolve; });
  await page.route("**/v1/candidates/change-requests", async (route) => {
    bodies.push(route.request().postDataJSON());
    if (bodies.length === 1) await firstPending;
    return route.fulfill({ status: 503, json: { error: "Try the request again" } });
  });
  await page.goto("/candidate-form?mode=pending&reference=retry-private-reference");
  await page.getByLabel("Requested changes", { exact: true }).fill("Correct the original biography");
  await fillSubmitter(page);
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByLabel("Submission type", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Requested changes", { exact: true })).toBeDisabled();
  releaseFirst();
  await expect(page.getByRole("alert")).toContainText("Try the request again");
  await expect(page.getByLabel("Requested changes", { exact: true })).toHaveValue("Correct the original biography");
  await expect(page.getByLabel("Your email", { exact: true })).toHaveValue("current-requester@example.com");
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Try the request again");
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  await page.getByLabel("Requested changes", { exact: true }).fill("Different corrected biography instructions");
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Try the request again");
  expect(bodies[2].requestId).not.toBe(bodies[0].requestId);
});

const apiUrl = process.env.CANDIDATE_REQUEST_API_BASE || "http://127.0.0.1:8791";
const reviewerHeaders = { Authorization: "Bearer fixture-reviewer-id-token" };

test("new receipts lead to a private pending followup persisted separately by the real handler", async ({ page, request }) => {
  await isolateExternalServices(page);
  await page.goto("/candidate-form");
  await page.getByLabel("Candidate display name").fill("Request Receipt Original");
  await page.getByLabel("Office sought").fill("County Commissioner");
  await page.getByLabel("County, if applicable").selectOption("potter");
  await fillSubmitter(page);
  const receiptResponse = page.waitForResponse((response) => response.url().endsWith("/v1/candidates/submissions") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit Candidate Profile", exact: true }).click();
  const originalReceipt = (await (await receiptResponse).json()).data;
  await expect(page.getByRole("status")).toContainText("Your candidate profile was received");
  const followup = page.getByRole("link", { name: "Request changes to this pending submission", exact: true });
  await expect(followup).toHaveAttribute("href", `/candidate-form?mode=pending&reference=${originalReceipt.submissionId}`);
  const originalBefore = (await (await request.get(`${apiUrl}/v1/admin/candidates/${originalReceipt.submissionId}`, { headers: reviewerHeaders })).json()).data;
  await followup.click();
  await expect(page.getByLabel("Pending submission reference", { exact: true })).toHaveValue(originalReceipt.submissionId);
  await expect(page.getByLabel("Candidate display name")).toHaveCount(0);
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("");
  await page.getByLabel("Requested changes", { exact: true }).fill("Please add my current campaign phone: 806-555-0112.");
  await fillSubmitter(page);
  const requestResponse = page.waitForResponse((response) => response.url().endsWith("/v1/candidates/change-requests") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  const changeResponse = await requestResponse;
  expect(changeResponse.status()).toBe(201);
  const receipt = (await changeResponse.json()).data;
  await expect(page.getByRole("status")).toContainText(receipt.submissionId);
  const saved = (await (await request.get(`${apiUrl}/v1/admin/candidates/${receipt.submissionId}`, { headers: reviewerHeaders })).json()).data;
  expect(saved).toMatchObject({ source: "change-request", status: "pending", candidate: originalBefore.candidate, changeRequest: { targetSubmissionId: originalReceipt.submissionId, targetStatus: "pending", reason: "Please add my current campaign phone: 806-555-0112." } });
  expect((await (await request.get(`${apiUrl}/v1/admin/candidates/${originalReceipt.submissionId}`, { headers: reviewerHeaders })).json()).data).toEqual(originalBefore);
  expect((await request.get(`${apiUrl}/v1/candidates/${originalReceipt.submissionId}/change-target`)).status()).toBe(404);
  const directory = await (await request.get(`${apiUrl}/v1/candidates`)).json();
  expect(directory.data.some((candidate: { id: string }) => candidate.id === originalReceipt.submissionId)).toBe(false);
  expect(JSON.stringify(directory)).not.toContain("current-requester@example.com");
});

test("published Request Changes persists a separate proposal without changing the real public or private target", async ({ page, request }) => {
  await isolateExternalServices(page);
  const candidate = { ...publishedCandidate, id: "request-real-published", name: "Real Published Request Target" };
  expect((await request.post(`${apiUrl}/v1/admin/candidates`, { headers: reviewerHeaders, data: { candidate, reviewReason: "Private original research note" } })).status()).toBe(201);
  expect((await request.post(`${apiUrl}/v1/admin/candidates/${candidate.id}/approve`, { headers: reviewerHeaders, data: { expectedRevision: 1 } })).status()).toBe(200);
  const original = (await (await request.get(`${apiUrl}/v1/admin/candidates/${candidate.id}`, { headers: reviewerHeaders })).json()).data;
  await page.goto(`/candidates/${candidate.id}`);
  await page.getByRole("link", { name: "Request Changes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/candidate-form\\?mode=published&candidate=${candidate.id}$`));
  await expect(page.getByLabel("Candidate display name")).toHaveValue(candidate.name);
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("I attest")).not.toBeChecked();
  await page.getByLabel("Public campaign phone", { exact: true }).fill("");
  await page.getByLabel("Candidate biography or campaign statement", { exact: true }).fill("Proposed corrected biography");
  await page.getByLabel("Requested changes", { exact: true }).fill("Please remove the old phone and update this biography.");
  await fillSubmitter(page);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/v1/candidates/change-requests") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const receipt = (await response.json()).data;
  await expect(page.getByRole("status")).toContainText("Your change request was received");
  const proposal = (await (await request.get(`${apiUrl}/v1/admin/candidates/${receipt.submissionId}`, { headers: reviewerHeaders })).json()).data;
  expect(proposal).toMatchObject({ source: "change-request", status: "pending", candidate: { id: candidate.id, bio: "Proposed corrected biography" }, submitter: { submitterEmail: "current-requester@example.com" }, changeRequest: { targetSubmissionId: candidate.id, targetStatus: "approved", targetRevision: original.revision, baseCandidate: original.candidate } });
  expect(proposal.candidate).not.toHaveProperty("phone");
  expect((await (await request.get(`${apiUrl}/v1/admin/candidates/${candidate.id}`, { headers: reviewerHeaders })).json()).data).toEqual(original);
  expect((await (await request.get(`${apiUrl}/v1/candidates/${candidate.id}`)).json()).data).toEqual(original.candidate);
  expect((await request.get(`${apiUrl}/v1/candidates/${receipt.submissionId}`)).status()).toBe(404);
  // Closed requests stay private; the approved fixture intentionally remains published.
  expect((await request.post(`${apiUrl}/v1/admin/candidates/${receipt.submissionId}/deny`, { headers: reviewerHeaders, data: { expectedRevision: 1, reason: "Fixture cleanup" } })).status()).toBe(200);
});

test("published uploads guard target switches and successful receipts reset every form control (mock contract)", async ({ page }) => {
  await isolateExternalServices(page);
  await page.route("**/v1/candidates/*/change-target", (route) => route.fulfill({ json: { data: { candidate: publishedCandidate, submissionId: "published-source-reference", revision: 7, status: "approved" } } }));
  let releaseUpload!: () => void;
  const uploadPending = new Promise<void>((resolve) => { releaseUpload = resolve; });
  await page.route("**/v1/candidates/photos", async (route) => { await uploadPending; return route.fulfill({ json: { data: { path: "/v1/candidates/photos/11111111-1111-4111-8111-111111111111.jpg" } } }); });
  await page.route("**/v1/candidates/change-requests", (route) => route.fulfill({ status: 201, json: { data: { submissionId: "change-upload-receipt", status: "pending", revision: 1, createdAt: "2026-09-09T12:00:00.000Z" } } }));
  await page.goto(`/candidate-form?mode=published&candidate=${publishedCandidate.id}`);
  await expect(page.getByLabel("Candidate display name")).toHaveValue(publishedCandidate.name);
  const png = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 40; canvas.height = 60; const context = canvas.getContext("2d")!; context.fillStyle = "navy"; context.fillRect(0, 0, 40, 60); return canvas.toDataURL("image/png").split(",")[1]; });
  await page.route("**/v1/candidates/photos/*", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from(png, "base64") }));
  await page.getByLabel("Upload profile picture").setInputFiles({ name: "request-photo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByText("Uploading photo…", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Submission type", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Load Profile", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Submit Change Request", exact: true })).toBeDisabled();
  releaseUpload();
  await expect(page.getByLabel("Portrait image URL", { exact: true })).toHaveValue(/11111111-1111-4111-8111-111111111111.jpg$/);
  await page.getByLabel("State", { exact: true }).selectOption("alaska");
  await page.getByLabel("Race scope", { exact: true }).selectOption("statewide");
  await page.getByLabel("Requested changes", { exact: true }).fill("Updated portrait and statewide Alaska race.");
  await fillSubmitter(page);
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("change-upload-receipt");
  await expect(page.getByLabel("State", { exact: true })).toHaveValue("texas");
  await expect(page.getByLabel("Race scope", { exact: true })).toHaveValue("district");
  await expect(page.getByLabel("County, if applicable", { exact: true })).toHaveValue("potter");
  await expect(page.locator('input[name="countySlugs"][value="randall"]')).toBeChecked();
  await expect(page.getByLabel("Portrait image URL", { exact: true })).toHaveValue(publishedCandidate.image);
  await expect(page.getByLabel("Your email", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("I consent")).not.toBeChecked();
});

test("late target responses cannot replace another profile or reveal a draft after switching modes (mock contract)", async ({ page }) => {
  await isolateExternalServices(page);
  let releaseLate!: () => void;
  const late = new Promise<void>((resolve) => { releaseLate = resolve; });
  let lateReads = 0;
  await page.route("**/v1/candidates/*/change-target", async (route) => {
    const stale = route.request().url().includes("stale-profile");
    if (stale) { lateReads += 1; await late; }
    return route.fulfill({ json: { data: { candidate: stale ? { ...publishedCandidate, id: "stale-profile", name: "Stale Response" } : publishedCandidate, submissionId: stale ? "stale-reference" : "current-reference", revision: 7, status: "approved" } } });
  });
  await page.goto("/candidate-form?mode=published&candidate=stale-profile");
  await expect.poll(() => lateReads).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Submit Change Request", exact: true })).toBeDisabled();
  await page.getByLabel("Published profile ID", { exact: true }).fill(publishedCandidate.id);
  await page.getByRole("button", { name: "Load Profile", exact: true }).click();
  await expect(page.getByLabel("Candidate display name")).toHaveValue(publishedCandidate.name);
  await page.getByLabel("Candidate biography or campaign statement", { exact: true }).fill("My unsaved correction");
  releaseLate();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Candidate display name")).toHaveValue(publishedCandidate.name);
  await expect(page.getByLabel("Candidate biography or campaign statement", { exact: true })).toHaveValue("My unsaved correction");
  await page.getByLabel("Submission type", { exact: true }).selectOption("pending");
  await expect(page.getByLabel("Candidate display name")).toHaveCount(0);
  await expect(page.getByLabel("Pending submission reference", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Requested changes", { exact: true })).toHaveAttribute("maxlength", "2000");
});

test("pending followup sends private instructions without reading or editing the draft (mock contract)", async ({ page }) => {
  await isolateExternalServices(page);
  const reads: string[] = [];
  page.on("request", (request) => { if (request.method() === "GET" && request.url().includes("/v1/candidates/")) reads.push(request.url()); });
  let body: Record<string, unknown> | undefined;
  await page.route("**/v1/candidates/change-requests", (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { data: { submissionId: "change-pending-receipt", status: "pending", revision: 1, createdAt: "2026-09-09T12:00:00.000Z" } } });
  });
  await page.goto("/candidate-form?mode=pending&reference=private-pending-reference");
  await expect(page.getByLabel("Submission type", { exact: true })).toHaveValue("pending");
  await expect(page.getByLabel("Pending submission reference", { exact: true })).toHaveValue("private-pending-reference");
  await expect(page.getByLabel("Candidate display name")).toHaveCount(0);
  await expect(page.getByText("Pending profiles are private", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "erik@patriotsinaction.com", exact: true })).toBeVisible();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("I attest")).not.toBeChecked();
  await page.getByLabel("Requested changes", { exact: true }).fill("Please replace the old campaign phone with 806-555-0123.");
  await fillSubmitter(page);
  await page.getByRole("button", { name: "Submit Change Request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your change request was received");
  await expect(page.getByRole("status")).toContainText("change-pending-receipt");
  expect(body).toEqual({ requestId: expect.stringMatching(/^change-[a-f0-9-]{36}$/), targetSubmissionId: "private-pending-reference", targetStatus: "pending", reason: "Please replace the old campaign phone with 806-555-0123.", submitter: { submitterName: "Current Requester", submitterEmail: "current-requester@example.com", submitterRole: "campaign" }, consent: true, attestation: true, honeypot: "" });
  expect(reads).toEqual([]);
});
