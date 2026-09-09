import { beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules(); vi.unstubAllGlobals(); vi.stubEnv("VITE_CANDIDATE_API_BASE", "https://candidate.example/prod"); vi.stubEnv("DEV", false);
  vi.stubGlobal("window", { location: { origin: "http://localhost" } });
});
const session = { idToken: "fixture-id-token", expiresAt: Number.MAX_SAFE_INTEGER, username: "reviewer" };
const record = { submissionId: "change-test", source: "change-request", candidate: { id: "alex-test", name: "Alex Test", office: "Governor", stateSlug: "texas", scope: "statewide" }, consent: true, attestation: true, status: "pending", revision: 1, createdAt: "2026-09-09T12:00:00.000Z", updatedAt: "2026-09-09T12:00:00.000Z", statusUpdatedAt: "2026-09-09T12:00:00.000Z", reviewReason: "Private notes" };
it("fetches one authenticated review target and preserves change-request metadata when flattening", async () => {
  const changeRequest = { targetSubmissionId: "original-reference", targetStatus: "approved", targetRevision: 3, baseCandidate: record.candidate, reason: "Correct the phone" };
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: { ...record, changeRequest } })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  expect(api.fetchCandidateSubmission).toBeTypeOf("function");
  const result = await api.fetchCandidateSubmission(session, "reference /?&");
  expect(fetcher.mock.calls[0]?.[0]).toBe("https://candidate.example/prod/v1/admin/candidates/reference%20%2F%3F%26");
  expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer fixture-id-token" });
  expect(result).toMatchObject({ name: "Alex Test", source: "change-request", changeRequest, moderationReason: "Private notes", submitterEmail: "" });
});
it("patches private review notes only when supplied and keeps them outside candidate fields", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: record })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  for (const notes of [{ moderationReason: "Saved note" }, { moderationReason: undefined }, {}]) {
    await api.updateCandidateSubmission(session, "original-reference", { revision: 3, phone: undefined, bio: "Corrected biography", submitterEmail: "private@example.com", ...notes });
  }
  const bodies = fetcher.mock.calls.map((call) => JSON.parse(call[1]?.body as string));
  expect(bodies).toEqual([
    { expectedRevision: 3, candidate: { phone: null, bio: "Corrected biography" }, reviewReason: "Saved note" },
    { expectedRevision: 3, candidate: { phone: null, bio: "Corrected biography" }, reviewReason: null },
    { expectedRevision: 3, candidate: { phone: null, bio: "Corrected biography" } },
  ]);
});
it("loads only a validated authoritative approved target while preserving the API stage", async () => {
  const target = { candidate: record.candidate, submissionId: "original-reference", revision: 3, status: "approved" };
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: { ...target, submitterEmail: "private@example.com", candidate: { ...record.candidate, moderationReason: "secret" } } })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  expect(api.fetchCandidateChangeTarget).toBeTypeOf("function");
  expect(await api.fetchCandidateChangeTarget("alex-test")).toEqual(target);
  expect(fetcher.mock.calls[0]?.[0]).toBe("https://candidate.example/prod/v1/candidates/alex-test/change-target");
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  for (const invalid of [{ ...target, revision: 0 }, { ...target, revision: 1.5 }, { ...target, status: "pending" }, { ...target, submissionId: "" }, { ...target, candidate: { ...record.candidate, id: "different" } }, { ...target, candidate: { ...record.candidate, scope: "invalid" } }, { ...target, candidate: { ...record.candidate, countySlugs: "potter" } }, {}]) {
    fetcher.mockImplementationOnce(async () => Response.json({ data: invalid }));
    await expect(api.fetchCandidateChangeTarget("alex-test")).rejects.toThrow("target");
  }
});
const changePayload = { requestId: "change-11111111-1111-4111-8111-111111111111", targetSubmissionId: "original-reference", targetStatus: "approved" as const, expectedTargetRevision: 3, candidate: { phone: null, bio: "New biography" }, reason: "Please correct the biography and remove an old phone.", submitter: { submitterName: "Current staff", submitterEmail: "current@example.com", submitterRole: "campaign" }, consent: true, attestation: true, honeypot: "" };
const changeReceipt = { submissionId: "change-reference", status: "pending", revision: 1, createdAt: "2026-09-09T12:00:00.000Z" };
it("sends a revision-checked public patch with null clears, keeping private and identity fields out", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: changeReceipt }, { status: 201 })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  await api.submitCandidateChangeRequest({ ...changePayload, candidate: { ...changePayload.candidate, id: "do-not-replace", submitterEmail: "private@example.com", moderationReason: "private-note" } } as typeof changePayload);
  expect(fetcher.mock.calls[0]?.[0]).toBe("https://candidate.example/prod/v1/candidates/change-requests");
  expect(JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)).toEqual(changePayload);
  await api.submitCandidateChangeRequest({ ...changePayload, targetStatus: "pending" });
  const pendingBody = JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string);
  expect(pendingBody).not.toHaveProperty("candidate");
  expect(pendingBody).not.toHaveProperty("expectedTargetRevision");
});
it("rejects invalid change requests before sending and requires a complete persistence receipt", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: changeReceipt })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  for (const invalid of [{ expectedTargetRevision: undefined }, { expectedTargetRevision: 0 }, { expectedTargetRevision: 1.5 }, { candidate: {} }, { reason: " " }, { reason: "x".repeat(2001) }, { targetSubmissionId: "" }, { requestId: "not-a-change-id" }, { attestation: false }, { consent: false }, { submitter: { ...changePayload.submitter, submitterEmail: "not-an-email" } }]) {
    await expect(api.submitCandidateChangeRequest({ ...changePayload, ...invalid })).rejects.toThrow();
  }
  expect(fetcher).not.toHaveBeenCalled();
  for (const invalid of [{ ...changeReceipt, revision: 0 }, { ...changeReceipt, revision: undefined }, { ...changeReceipt, createdAt: "not-a-date" }, { ...changeReceipt, status: "unknown" }, { ...changeReceipt, submissionId: 123 }, {}]) {
    fetcher.mockImplementationOnce(async () => Response.json({ data: invalid }));
    await expect(api.submitCandidateChangeRequest(changePayload)).rejects.toThrow("receipt");
  }
  expect(await api.submitCandidateChangeRequest(changePayload)).toEqual(changeReceipt);
});
const payload = { id: "alex-test", name: "Alex Test", office: "Commissioner", stateSlug: "texas", countySlug: "potter", scope: "county" as const, submitterName: "Staff", submitterEmail: "staff@example.com", submitterRole: "campaign", publicationConsent: true, attestation: true };
it("sends private submitter fields separately and requires a valid persistence receipt", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: { submissionId: "alex-test", status: "pending" } }, { status: 201 })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  await api.submitCandidateProfile(payload);
  const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string);
  expect(body.candidate).not.toHaveProperty("submitterEmail"); expect(body.submitter.submitterEmail).toBe("staff@example.com");
  fetcher.mockImplementationOnce(async () => Response.json({}));
  await expect(api.submitCandidateProfile(payload)).rejects.toThrow("receipt");
});
it("surfaces field validation details instead of an unhelpful generic error", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => Response.json({ error: { message: "Invalid submission", details: [{ path: "candidate.countySlug", message: "Select a county" }] } }, { status: 400 })));
  const api = await import("../../src/lib/candidate-api");
  await expect(api.submitCandidateProfile(payload)).rejects.toThrow("Select a county");
});
it("rejects repeated pagination cursors rather than looping indefinitely", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [], nextCursor: "repeat" })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  await expect(api.fetchApprovedCandidates()).rejects.toThrow("pagination"); expect(fetcher).toHaveBeenCalledTimes(2);
});
