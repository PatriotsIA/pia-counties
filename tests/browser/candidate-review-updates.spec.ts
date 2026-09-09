import { Buffer } from "node:buffer";
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import type { Candidate } from "../../src/data/candidates";

const api = "http://127.0.0.1:8791";
const headers = { Authorization: "Bearer fixture-reviewer-id-token" };

async function signIn(page: Page, path = "/candidate-review") {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.fallback();
    if (url.hostname.startsWith("cognito-idp.")) return route.fulfill({ json: { AuthenticationResult: { IdToken: "fixture-reviewer-id-token", AccessToken: "fixture-access-token", ExpiresIn: 3600 } } });
    return route.abort();
  });
  await page.goto(path);
  await page.getByLabel("Email or username").fill("reviewer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture Password 123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

async function seed(request: APIRequestContext, id: string, published: boolean, fields: Partial<Candidate> = {}) {
  const candidate = { id, name: `Review ${id}`, office: "Governor", officeLevel: "state", stateSlug: "texas", scope: "statewide", bio: "Original biography.", ...fields };
  expect((await request.post(`${api}/v1/admin/candidates`, { headers, data: { candidate, reviewReason: "Fixture research notes" } })).status()).toBe(201);
  if (published) expect((await request.post(`${api}/v1/admin/candidates/${id}/approve`, { headers, data: { expectedRevision: 1 } })).status()).toBe(200);
  return candidate;
}

test("reviewers can find and directly edit any published profile", async ({ page, request }) => {
  const candidate = await seed(request, "admin-published-navigation", true);
  await signIn(page);
  await page.getByRole("tab", { name: "Published profiles", exact: true }).click();
  await page.getByLabel("Search candidates").fill(candidate.id);
  await expect(page.getByLabel("Candidate name", { exact: true })).toHaveValue(candidate.name);
  await expect(page.getByRole("link", { name: "View Published Profile", exact: true })).toHaveAttribute("href", `/candidates/${candidate.id}`);
  await expect(page.getByText("Saving changes updates this published profile immediately.", { exact: true })).toBeVisible();
  await page.getByLabel("Biography", { exact: true }).fill("Directly edited published biography.");
  await page.getByRole("button", { name: "Save Published Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Published profile updated");
  const result = await (await request.get(`${api}/v1/candidates/${candidate.id}`)).json();
  expect(result.data).toMatchObject({ id: candidate.id, bio: "Directly edited published biography." });
  expect(result.data).not.toHaveProperty("submitter");
  await page.getByLabel("Biography", { exact: true }).fill("Unsaved reviewer work.");
  let warned = false;
  page.once("dialog", async (dialog) => { warned = true; await dialog.dismiss(); });
  await page.getByRole("tab", { name: "Review queue", exact: true }).click();
  expect(warned).toBe(true);
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Unsaved reviewer work.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("tab", { name: "Review queue", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Review queue", exact: true })).toHaveAttribute("aria-selected", "true");
});

// Read-only API fixtures isolate console presentation; real writes are tested separately.
test("review queue distinguishes update requests and opens the original profile (read fixtures)", async ({ page }) => {
  const candidate = { id: "review-original-fixture", name: "Review Original Fixture", office: "Governor", stateSlug: "texas", scope: "statewide", officeLevel: "state", bio: "Original biography." };
  const metadata = { consent: true, attestation: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", statusUpdatedAt: "2026-01-01T00:00:00Z", revision: 2 };
  const original = { ...metadata, submissionId: candidate.id, source: "submission", status: "approved", candidate };
  const update = { ...metadata, submissionId: "change-review-fixture", source: "change-request", status: "pending", candidate: { ...candidate, bio: "Proposed biography." }, submitter: { submitterName: "Private Requester", submitterEmail: "requester@example.com", submitterRole: "candidate" }, changeRequest: { targetSubmissionId: candidate.id, targetStatus: "approved", targetRevision: 2, baseCandidate: candidate, reason: "Please correct the biography." } };
  await page.route("**/v1/admin/candidates?**", (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    return route.fulfill({ json: { data: [original, update].filter((record) => !status || record.status === status) } });
  });
  await page.route(`**/v1/admin/candidates/${candidate.id}`, (route) => route.fulfill({ json: { data: original } }));
  await page.route(`**/v1/admin/candidates/${update.submissionId}`, (route) => route.fulfill({ json: { data: update } }));
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Requested update to published profile", exact: true })).toBeVisible();
  await expect(page.getByText("Please correct the biography.", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Proposed profile changes" })).toContainText("Original biography.");
  await expect(page.getByRole("table", { name: "Proposed profile changes" })).toContainText("Proposed biography.");
  await expect(page.getByRole("button", { name: "Apply to Published Profile", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve & Publish", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open Original Profile", exact: true }).click();
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Original biography.");
  await expect(page.getByRole("tab", { name: "Published profiles", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Back to Change Request", exact: true }).click();
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Proposed biography.");
  update.changeRequest.targetStatus = "pending";
  update.candidate.bio = candidate.bio;
  update.revision += 1;
  original.status = "pending";
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Requested update to pending profile", exact: true })).toBeVisible();
  const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
  await expect(apply).toBeDisabled();
  await page.getByLabel("Review notes / denial reason", { exact: true }).fill("Verified request.");
  await expect(apply).toBeDisabled();
  await expect(page.getByRole("table", { name: "Proposed profile changes" })).toHaveCount(0);
  await page.getByLabel("Biography", { exact: true }).fill("Entered the requested correction.");
  await expect(apply).toBeEnabled();
  update.status = "approved";
  update.revision += 1;
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByLabel("Biography", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Preview Profile", exact: true }).first().click();
  const preview = page.getByRole("dialog", { name: "Profile preview", exact: true });
  await expect(preview.getByRole("heading", { name: candidate.name, exact: true })).toBeVisible();
  await expect(preview).toContainText(candidate.bio);
  await expect(preview).not.toContainText("requester@example.com");
});

async function createRequest(request: APIRequestContext, targetId: string, published: boolean, requestId: string) {
  const result = await request.post(`${api}/v1/candidates/change-requests`, { data: {
    requestId, targetSubmissionId: targetId, targetStatus: published ? "approved" : "pending",
    ...(published ? { expectedTargetRevision: 2, candidate: { bio: "Requested public biography." } } : {}),
    reason: "Please update the biography to the corrected version.",
    submitter: { submitterName: "Request Staff", submitterEmail: "request-staff@example.com", submitterRole: "campaign" },
    consent: true, attestation: true, honeypot: "",
  } });
  expect(result.status()).toBe(201);
  return (await result.json()).data;
}

for (const button of ["Open Original Profile", "Back to Change Request"]) {
  for (const outcome of ["success", "error"]) {
    test(`late record-open ${outcome} from ${button} stays on the SPA destination`, async ({ page, request }) => {
      const candidate = await seed(request, `late-open-${button === "Open Original Profile" ? "original" : "request"}-${outcome}`, true);
      const receipt = await createRequest(request, candidate.id, true, `change-${candidate.id}`);
      await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
      await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Requested public biography.");
      if (button === "Back to Change Request") {
        await page.getByRole("button", { name: "Open Original Profile", exact: true }).click();
        await expect(page).toHaveURL(`/candidate-review?submission=${candidate.id}`);
        await expect(page.getByLabel("Biography", { exact: true })).toHaveValue(candidate.bio);
      }

      const submissionId = button === "Open Original Profile" ? candidate.id : receipt.submissionId;
      const recordUrl = `**/v1/admin/candidates/${submissionId}`;
      let finishResponse!: () => void;
      let responseReady!: () => void;
      const responseGate = new Promise<void>((resolve) => { finishResponse = resolve; });
      const pendingResponse = new Promise<void>((resolve) => { responseReady = resolve; });
      await page.route(recordUrl, async (route) => {
        expect(route.request().method()).toBe("GET");
        expect(route.request().headers().authorization).toBe(headers.Authorization);
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        responseReady();
        await responseGate;
        // Keep the real handler response for success; inject only the error case.
        await route.fulfill(outcome === "success" ? { response } : {
          response, status: 503, json: { message: "Delayed original profile failure." },
        });
      });
      const lateResponse = page.waitForResponse(recordUrl);
      await page.getByRole("button", { name: button, exact: true }).click();
      await pendingResponse;
      await expect(page.getByRole("button", { name: button, exact: true })).toBeDisabled();

      const document = await page.evaluateHandle(() => window.document);
      // Exercise the live BrowserRouter without unloading the pending request.
      await page.evaluate(() => {
        window.history.pushState({}, "", "/candidates");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      await expect(page).toHaveURL("/candidates");
      const destination = page.url();
      await expect(page.getByRole("heading", { name: "National candidate directory", exact: true })).toBeVisible();
      await expect(page.locator(".candidate-review-console")).toHaveCount(0);
      expect(await document.evaluate((original) => original === window.document)).toBe(true);
      const navigations: string[] = [];
      page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });

      finishResponse();
      const response = await lateResponse;
      expect(response.status()).toBe(outcome === "success" ? 200 : 503);
      await response.finished();
      // Let the response's async handlers and the resulting React render finish.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(page).toHaveURL(destination);
      expect(navigations).toEqual([]);
      await expect(page.getByRole("heading", { name: "National candidate directory", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Candidate Review", exact: true })).toHaveCount(0);
      await expect(page.locator(".candidate-review-console, .candidate-review-login, #candidate-review-editor")).toHaveCount(0);
      await expect(page.getByText("Delayed original profile failure.", { exact: true })).toHaveCount(0);
      expect(await document.evaluate((original) => original === window.document)).toBe(true);
      await document.dispose();
    });
  }
}

test("notes-only saves preserve county coverage order without enabling a pending request", async ({ page, request }) => {
  const candidate = await seed(request, "county-order-pending-review", false, { scope: "district", countySlugs: ["randall", "carson"] });
  const receipt = await createRequest(request, candidate.id, false, `change-${candidate.id}`);
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
  const changes = page.getByRole("table", { name: "Proposed profile changes" });
  const notes = page.getByLabel("Review notes / denial reason", { exact: true });
  await expect(apply).toBeDisabled();
  await notes.fill("Verified the request; candidate corrections are still needed.");
  await expect(apply).toBeDisabled();
  await expect(changes).toHaveCount(0);
  await page.getByRole("button", { name: "Save Proposed Changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("original profile has not changed");
  const saved = (await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data;
  expect(saved.candidate).toEqual(candidate);
  expect(saved.changeRequest.baseCandidate).toEqual(candidate);
  expect(saved.reviewReason).toBe("Verified the request; candidate corrections are still needed.");
  expect((await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data.candidate).toEqual(candidate);
  await expect(apply).toBeDisabled();
  await expect(changes).toHaveCount(0);
  await page.getByRole("button", { name: "Open Original Profile", exact: true }).click();
  await page.getByRole("button", { name: "Back to Change Request", exact: true }).click();
  await expect(notes).toHaveValue(saved.reviewReason);
  await expect(apply).toBeDisabled();
  await expect(changes).toHaveCount(0);

  await page.getByText("Additional counties covered by this race", { exact: true }).click();
  const carson = page.getByRole("checkbox", { name: "Carson County", exact: true });
  await carson.uncheck();
  await expect(apply).toBeEnabled();
  await expect(changes.getByRole("row", { name: /^County coverage / }).getByRole("cell").last()).toHaveText("randall");
  await carson.check();
  await expect(apply).toBeDisabled();
  await expect(changes).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Potter County", exact: true }).check();
  await expect(apply).toBeEnabled();
  await expect(changes.getByRole("row", { name: /^County coverage / }).getByRole("cell").last()).toHaveText("carson, potter, randall");
  await apply.click();
  await expect(page.getByRole("status")).toContainText("still pending publication review");
  const target = (await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data;
  expect(target.status).toBe("pending");
  expect(target.candidate).toEqual({ ...candidate, countySlugs: ["carson", "potter", "randall"] });
  expect((await request.get(`${api}/v1/candidates/${candidate.id}`)).status()).toBe(404);
});

for (const { label, baseline, proposed } of [
  { label: "reordered", baseline: ["randall", "carson"], proposed: ["carson", "randall"] },
  { label: "duplicated", baseline: ["randall", "carson", "randall"], proposed: ["carson", "randall", "carson"] },
  { label: "absent-to-empty", baseline: undefined, proposed: [] },
  { label: "empty-to-absent", baseline: [], proposed: undefined },
]) {
  test(`county coverage comparison ignores ${label} saved values (read fixtures)`, async ({ page }) => {
    const candidate = { id: `county-set-${label}`, name: "County Set Fixture", office: "Governor", stateSlug: "texas", scope: "district", officeLevel: "state", countySlugs: baseline };
    const update = { submissionId: `change-${candidate.id}`, source: "change-request", status: "pending", revision: 1,
      candidate: { ...candidate, countySlugs: proposed },
      changeRequest: { targetSubmissionId: candidate.id, targetStatus: "pending", targetRevision: 1, baseCandidate: candidate, reason: "Enter the requested corrections after verification." } };
    await page.route("**/v1/admin/candidates?**", (route) => route.fulfill({ json: { data: [update] } }));
    await signIn(page);
    const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
    const changes = page.getByRole("table", { name: "Proposed profile changes" });
    await expect(apply).toBeDisabled();
    await expect(changes).toHaveCount(0);
    await page.getByLabel("Review notes / denial reason", { exact: true }).fill("Private notes are not a profile correction.");
    await expect(apply).toBeDisabled();
    await expect(changes).toHaveCount(0);
  });
}

test("accepting a pending-profile request saves the requested edits without publishing", async ({ page, request }) => {
  const candidate = await seed(request, "pending-request-review", false);
  const receipt = await createRequest(request, candidate.id, false, "change-pending-review");
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  await expect(page.getByRole("heading", { name: "Requested update to pending profile", exact: true })).toBeVisible();
  const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
  await expect(apply).toBeDisabled();
  await page.getByLabel("Review notes / denial reason", { exact: true }).fill("Verified the requested correction with campaign staff.");
  await expect(apply).toBeDisabled();
  await page.getByLabel("Biography", { exact: true }).fill("Corrected pending biography.");
  await expect(apply).toBeEnabled();
  await page.getByRole("button", { name: "Save Proposed Changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("original profile has not changed");
  let target = (await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data;
  expect(target.candidate).toEqual(candidate);
  await apply.click();
  await expect(page.getByRole("status")).toContainText("still pending publication review");
  target = (await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data;
  expect(target.status).toBe("pending");
  expect(target.candidate.bio).toBe("Corrected pending biography.");
  expect(target.source).toBe("research");
  expect(target.consent).toBe(false);
  expect((await request.get(`${api}/v1/candidates/${candidate.id}`)).status()).toBe(404);
  const accepted = (await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data;
  expect(accepted.status).toBe("approved");
  expect(accepted.reviewReason).toBe("Verified the requested correction with campaign staff.");
  await expect(page.getByText("This change request is closed and read-only.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Proposed Changes", exact: true })).toHaveCount(0);
});

test("published requests apply in place, stay out of published navigation, and denial leaves originals unchanged", async ({ page, request }) => {
  const candidate = await seed(request, "published-apply-review", true);
  const receipt = await createRequest(request, candidate.id, true, "change-published-apply-review");
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Requested public biography.");
  await page.getByRole("button", { name: "Apply to Published Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("applied to the published profile");
  const target = (await (await request.get(`${api}/v1/candidates/${candidate.id}`)).json()).data;
  expect(target.id).toBe(candidate.id);
  expect(target.bio).toBe("Requested public biography.");
  const directory = (await (await request.get(`${api}/v1/candidates`)).json()).data;
  expect(directory.filter((item: { id: string }) => item.id === candidate.id)).toHaveLength(1);
  expect((await request.get(`${api}/v1/candidates/${receipt.submissionId}`)).status()).toBe(404);
  await page.getByRole("tab", { name: "Published profiles", exact: true }).click();
  await page.getByLabel("Search candidates").fill(candidate.id);
  await expect(page.getByLabel("Candidate submissions").getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Save Published Profile", exact: true })).toBeVisible();

  const denyTarget = await seed(request, "published-deny-review", true);
  const denied = await createRequest(request, denyTarget.id, true, "change-published-deny-review");
  await page.getByRole("tab", { name: "Review queue", exact: true }).click();
  await page.getByLabel("Search candidates").fill(denied.submissionId);
  await page.getByRole("button", { name: "Deny Request", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("denial reason");
  await page.getByLabel("Review notes / denial reason", { exact: true }).fill("Requested correction could not be verified.");
  await page.getByRole("button", { name: "Deny Request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("original profile has not changed");
  expect((await (await request.get(`${api}/v1/candidates/${denyTarget.id}`)).json()).data).toEqual(denyTarget);
});

test("state changes synchronize reset county controls with the comparison and no-op guard", async ({ page, request }) => {
  const candidate = await seed(request, "dependent-county-review", false, { scope: "district", countySlug: "potter", countyName: "Potter County", countySlugs: ["randall"] });
  const receipt = await createRequest(request, candidate.id, false, `change-${candidate.id}`);
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  const state = page.getByLabel("State", { exact: true });
  const county = page.getByRole("combobox", { name: "County", exact: true });
  const changes = page.getByRole("table", { name: "Proposed profile changes" });
  const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
  await expect(apply).toBeDisabled();
  await state.selectOption("oklahoma");
  await expect(county).toHaveValue("");
  await expect(page.locator('[name="countySlugs"]:checked')).toHaveCount(0);
  await expect.soft(changes.getByRole("row", { name: /^Primary county / }).getByRole("cell").last()).toHaveText("Not set");
  await expect.soft(changes.getByRole("row", { name: /^County coverage / }).getByRole("cell").last()).toHaveText("Not set");
  await state.selectOption("texas");
  await expect(county).toHaveValue("potter");
  await expect(page.locator('[name="countySlugs"][value="randall"]')).toBeChecked();
  await expect.soft(changes).toHaveCount(0);
  await expect.soft(apply).toBeDisabled();
  await county.selectOption("harris");
  await expect(changes.getByRole("row", { name: /^Primary county / }).getByRole("cell").last()).toHaveText("harris");
  await page.getByText("Additional counties covered by this race", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Randall County", exact: true }).uncheck();
  await expect(changes.getByRole("row", { name: /^County coverage / }).getByRole("cell").last()).toHaveText("Not set");
  await state.selectOption("oklahoma");
  await apply.click();
  await expect(page.getByRole("status")).toContainText("still pending publication review");
  const target = (await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data;
  expect(target.status).toBe("pending");
  expect(target.candidate.stateSlug).toBe("oklahoma");
  expect(target.candidate).not.toHaveProperty("countySlug");
  expect(target.candidate).not.toHaveProperty("countyName");
  expect(target.candidate.countySlugs || []).toEqual([]);
});

test("an uploaded portrait alone synchronizes a pending request before applying", async ({ page, request }) => {
  const candidate = await seed(request, "photo-only-pending-review", false, { image: "https://campaign.example/original.jpg" });
  const receipt = await createRequest(request, candidate.id, false, `change-${candidate.id}`);
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
  await expect(apply).toBeDisabled();
  let finishUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => { finishUpload = resolve; });
  await page.route("**/v1/candidates/photos", async (route) => { await uploadGate; await route.continue(); });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40; canvas.height = 60;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "navy"; context.fillRect(0, 0, 40, 60);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Upload profile picture").setInputFiles({ name: "review-portrait.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByRole("status")).toContainText("Uploading photo");
  await expect(apply).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save Proposed Changes", exact: true })).toBeDisabled();
  finishUpload();
  const portrait = page.getByLabel("Portrait URL", { exact: true });
  await expect(portrait).toHaveValue(/^http:\/\/127.0.0.1:8791\/v1\/candidates\/photos\/.+\.jpg$/);
  const uploadedPhoto = await portrait.inputValue();
  expect((await request.get(uploadedPhoto)).status()).toBe(200);
  await expect(apply).toBeEnabled();
  const changes = page.getByRole("table", { name: "Proposed profile changes" });
  await expect(changes.getByRole("row")).toHaveCount(2);
  await expect(changes.getByRole("row").last()).toContainText("Portrait");
  await expect(changes).toContainText(candidate.image!);
  await expect(changes).toContainText(uploadedPhoto);
  let warned = false;
  page.once("dialog", async (dialog) => { warned = true; await dialog.dismiss(); });
  await page.getByLabel("Search candidates", { exact: true }).fill(candidate.id);
  expect(warned).toBe(true);
  await expect(portrait).toHaveValue(uploadedPhoto);
  await apply.click();
  await expect(page.getByRole("status")).toContainText("still pending publication review");
  const target = (await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data;
  expect(target.status).toBe("pending");
  expect(target.candidate).toEqual({ ...candidate, image: uploadedPhoto });
  expect((await request.get(`${api}/v1/candidates/${candidate.id}`)).status()).toBe(404);
});

test("confirmed discard resets a retained editor while rejected discard preserves edits and warnings", async ({ page, request }) => {
  const candidate = await seed(request, "discard-retained-review", false);
  const receipt = await createRequest(request, candidate.id, false, `change-${candidate.id}`);
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  const biography = page.getByLabel("Biography", { exact: true });
  const search = page.getByLabel("Search candidates", { exact: true });
  const changes = page.getByRole("table", { name: "Proposed profile changes" });
  const apply = page.getByRole("button", { name: "Apply to Pending Profile", exact: true });
  await biography.fill("Discard this unsaved biography.");
  let discard = false;
  const warnings: string[] = [];
  page.on("dialog", async (dialog) => {
    warnings.push(dialog.message());
    if (discard) await dialog.accept();
    else await dialog.dismiss();
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await search.fill(candidate.id);
    expect(warnings).toHaveLength(attempt + 1);
    expect(warnings[attempt]).toBe("Discard unsaved candidate edits?");
    await expect(search).toHaveValue("");
    await expect(biography).toHaveValue("Discard this unsaved biography.");
    await expect(changes).toContainText("Discard this unsaved biography.");
    await expect(apply).toBeEnabled();
  }
  discard = true;
  await search.fill(candidate.id);
  expect(warnings).toHaveLength(3);
  await expect(search).toHaveValue(candidate.id);
  await expect(page.getByLabel("Candidate name", { exact: true })).toHaveValue(candidate.name);
  await expect.soft(biography).toHaveValue(candidate.bio);
  await expect.soft(changes).toHaveCount(0);
  await expect.soft(apply).toBeDisabled();
  await page.getByRole("button", { name: "Save Proposed Changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("original profile has not changed");
  const saved = (await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data;
  expect.soft(saved.candidate).toEqual(candidate);
  await biography.fill("New work after discard.");
  discard = false;
  await page.getByRole("tab", { name: "Published profiles", exact: true }).click();
  expect(warnings).toHaveLength(4);
  await expect(biography).toHaveValue("New work after discard.");
  await expect(page.getByRole("tab", { name: "All records", exact: true })).toHaveAttribute("aria-selected", "true");
});

for (const published of [false, true]) {
  test(`cleared optional fields stay cleared when a saved request is applied to a ${published ? "published" : "pending"} profile`, async ({ page, request }) => {
    const candidate = await seed(request, `clear-request-${published ? "published" : "pending"}`, published, { phone: "806-555-0100" });
    const receipt = await createRequest(request, candidate.id, published, `change-${candidate.id}`);
    await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
    await page.getByLabel("Public phone", { exact: true }).fill("");
    await page.getByLabel("Biography", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save Proposed Changes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("original profile has not changed");
    const saved = (await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data;
    expect(saved.candidate).not.toHaveProperty("phone");
    expect(saved.candidate).not.toHaveProperty("bio");
    expect((await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data.candidate).toEqual(candidate);
    await expect.soft(page.getByLabel("Public phone", { exact: true })).toHaveValue("");
    await expect.soft(page.getByLabel("Biography", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: `Apply to ${published ? "Published" : "Pending"} Profile`, exact: true }).click();
    await expect(page.getByRole("status")).toContainText(published ? "applied to the published profile" : "still pending publication review");
    const target = (await (await request.get(`${api}/v1/admin/candidates/${candidate.id}`, { headers })).json()).data;
    expect(target.status).toBe(published ? "approved" : "pending");
    expect.soft(target.candidate).not.toHaveProperty("phone");
    expect.soft(target.candidate).not.toHaveProperty("bio");
    if (published) {
      const publicProfile = (await (await request.get(`${api}/v1/candidates/${candidate.id}`)).json()).data;
      expect.soft(publicProfile).not.toHaveProperty("phone");
      expect.soft(publicProfile).not.toHaveProperty("bio");
    }
  });
}

test("cleared optional fields stay cleared across direct published saves", async ({ page, request }) => {
  const candidate = await seed(request, "clear-direct-published", true, { phone: "806-555-0100" });
  await signIn(page, `/candidate-review?submission=${candidate.id}`);
  await page.getByLabel("Public phone", { exact: true }).fill("");
  await page.getByLabel("Biography", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save Published Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Published profile updated");
  const cleared = (await (await request.get(`${api}/v1/candidates/${candidate.id}`)).json()).data;
  expect(cleared).not.toHaveProperty("phone");
  expect(cleared).not.toHaveProperty("bio");
  await expect.soft(page.getByLabel("Public phone", { exact: true })).toHaveValue("");
  await expect.soft(page.getByLabel("Biography", { exact: true })).toHaveValue("");
  await page.getByLabel("Office sought", { exact: true }).fill("Lieutenant Governor");
  await page.getByRole("button", { name: "Save Published Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Published profile updated");
  const updated = (await (await request.get(`${api}/v1/candidates/${candidate.id}`)).json()).data;
  expect(updated.office).toBe("Lieutenant Governor");
  expect.soft(updated).not.toHaveProperty("phone");
  expect.soft(updated).not.toHaveProperty("bio");
});

test("stale change requests cannot overwrite a newer published profile", async ({ page, request }) => {
  const candidate = await seed(request, "published-stale-review", true);
  const receipt = await createRequest(request, candidate.id, true, "change-published-stale-review");
  expect((await request.patch(`${api}/v1/admin/candidates/${candidate.id}`, { headers, data: { expectedRevision: 2, candidate: { bio: "Newer staff update." } } })).status()).toBe(200);
  await signIn(page, `/candidate-review?submission=${receipt.submissionId}`);
  const response = page.waitForResponse((response) => response.url().endsWith(`/${receipt.submissionId}/approve`));
  await page.getByRole("button", { name: "Apply to Published Profile", exact: true }).click();
  expect((await response).status()).toBe(409);
  await expect(page.getByRole("alert")).toBeVisible();
  expect((await (await request.get(`${api}/v1/candidates/${candidate.id}`)).json()).data.bio).toBe("Newer staff update.");
  expect((await (await request.get(`${api}/v1/admin/candidates/${receipt.submissionId}`, { headers })).json()).data.status).toBe("pending");
  await page.getByRole("button", { name: "Open Original Profile", exact: true }).click();
  await expect(page.getByLabel("Biography", { exact: true })).toHaveValue("Newer staff update.");
});
