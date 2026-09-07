import { beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules(); vi.unstubAllGlobals(); vi.stubEnv("VITE_CANDIDATE_API_BASE", "https://candidate.example/prod"); vi.stubEnv("DEV", false);
  vi.stubGlobal("window", { location: { origin: "http://localhost" } });
});
const payload = { id: "alex-test", name: "Alex Test", office: "Commissioner", stateSlug: "texas", countySlug: "potter", scope: "county" as const, submitterName: "Staff", submitterEmail: "staff@example.com", submitterRole: "campaign", publicationConsent: true, attestation: true };
it("sends private submitter fields separately and requires a valid persistence receipt", async () => {
  const fetcher = vi.fn(async () => Response.json({ data: { submissionId: "alex-test", status: "pending" } }, { status: 201 })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  await api.submitCandidateProfile(payload);
  const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string);
  expect(body.candidate).not.toHaveProperty("submitterEmail"); expect(body.submitter.submitterEmail).toBe("staff@example.com");
  fetcher.mockImplementationOnce(async () => Response.json({}));
  await expect(api.submitCandidateProfile(payload)).rejects.toThrow("receipt");
});
it("surfaces field validation details instead of an unhelpful generic error", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { message: "Invalid submission", details: [{ path: "candidate.countySlug", message: "Select a county" }] } }, { status: 400 })));
  const api = await import("../../src/lib/candidate-api");
  await expect(api.submitCandidateProfile(payload)).rejects.toThrow("Select a county");
});
it("rejects repeated pagination cursors rather than looping indefinitely", async () => {
  const fetcher = vi.fn(async () => Response.json({ data: [], nextCursor: "repeat" })); vi.stubGlobal("fetch", fetcher);
  const api = await import("../../src/lib/candidate-api");
  await expect(api.fetchApprovedCandidates()).rejects.toThrow("pagination"); expect(fetcher).toHaveBeenCalledTimes(2);
});
