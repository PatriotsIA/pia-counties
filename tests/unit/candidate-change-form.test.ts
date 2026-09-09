import { expect, it } from "vitest";
import type { Candidate } from "../../src/data/candidates";
import * as form from "../../src/lib/candidate-change-form";

const base: Candidate = { id: "published-target", name: "Alex Target", office: "Commissioner", stateSlug: "texas", scope: "county", countySlug: "potter", phone: "806-555-0100", bio: "Old biography", countySlugs: ["randall", "carson"] };
function formData(candidate: Candidate) {
  const values = new FormData();
  for (const [key, value] of Object.entries(candidate)) {
    if (Array.isArray(value)) value.forEach((entry) => values.append(key, entry));
    else if (value === true) values.set(key, "on");
    else if (value !== false) values.set(key, String(value));
  }
  values.set("officeLevel", candidate.officeLevel || "");
  return values;
}

it("reuses a change request ID only for identical retries", () => {
  expect(form.prepareChangeRequestAttempt).toBeTypeOf("function");
  const payload = { targetSubmissionId: "reference", targetStatus: "pending" as const, reason: "Correct the biography", submitter: { submitterName: "Current staff", submitterEmail: "staff@example.com", submitterRole: "campaign" }, consent: true, attestation: true, honeypot: "" };
  const first = form.prepareChangeRequestAttempt(payload);
  expect(first.id).toMatch(/^change-[a-f0-9-]{36}$/);
  expect(form.prepareChangeRequestAttempt({ ...payload }, first)).toEqual(first);
  expect(form.prepareChangeRequestAttempt({ ...payload, reason: "Different instructions" }, first).id).not.toBe(first.id);
  expect(form.prepareChangeRequestAttempt({ ...payload, submitter: { ...payload.submitter, submitterEmail: "different@example.com" } }, first).id).not.toBe(first.id);
});

it("updates derived county names only when the selected geography changes", () => {
  const values = formData(base);
  values.set("countySlug", "randall");
  expect(form.buildCandidateChangePatch(base, values)).toEqual({ countySlug: "randall", countyName: "Randall County" });
  const statewide = formData({ ...base, countyName: "Potter County" });
  statewide.set("stateSlug", "alaska"); statewide.set("scope", "statewide"); statewide.set("countySlug", ""); statewide.delete("countySlugs");
  expect(form.buildCandidateChangePatch({ ...base, countyName: "Potter County" }, statewide)).toEqual({ stateSlug: "alaska", scope: "statewide", countySlug: null, countyName: null, countySlugs: null });
});

it("builds a public-only changed-field patch with explicit null deletions, not legacy defaults", () => {
  expect(form.buildCandidateChangePatch).toBeTypeOf("function");
  const values = formData(base);
  values.set("phone", "");
  values.set("bio", "Corrected biography");
  values.set("id", "do-not-send-this-id");
  values.set("submitterEmail", "private@example.com");
  values.set("moderationReason", "private note");
  // HTML controls cannot distinguish missing/false or missing/empty arrays.
  values.delete("countySlugs");
  expect(form.buildCandidateChangePatch(base, values)).toEqual({ phone: null, bio: "Corrected biography", countySlugs: null });
  const unchanged = formData(base);
  unchanged.delete("countySlugs"); unchanged.append("countySlugs", "carson"); unchanged.append("countySlugs", "randall");
  expect(form.buildCandidateChangePatch(base, unchanged)).toEqual({});
});
