import type { Candidate } from "../data/candidates";
import { getCountiesForState } from "../data/counties";
import { candidatePatchFields, type CandidatePatch, type CandidateChangeRequest } from "./candidate-api";

export function prepareChangeRequestAttempt(payload: Omit<CandidateChangeRequest, "requestId">, previous?: { key: string; id: string }) {
  const key = JSON.stringify(payload);
  return previous?.key === key ? previous : { key, id: `change-${crypto.randomUUID()}` };
}

export function buildCandidateChangePatch(base: Candidate, values: FormData): CandidatePatch {
  const patch: Record<string, unknown> = {};
  const text = (field: string) => String(values.get(field) || "").trim() || undefined;
  for (const field of candidatePatchFields) {
    // County names are derived, not editable controls.
    if (field === "countyName") continue;
    let next: unknown = text(field);
    let previous: unknown = base[field];
    if (field === "countySlugs") {
      next = [...new Set(values.getAll(field).map(String))].sort();
      previous = [...new Set(base.countySlugs || [])].sort();
    } else if (field === "incumbent") {
      next = values.get(field) === "on";
      previous = base.incumbent ?? false;
    } else if (field === "electionYear") {
      next = next === undefined ? undefined : Number(next);
    } else if (typeof previous === "string") {
      previous = previous.trim() || undefined;
    }
    if (JSON.stringify(next) !== JSON.stringify(previous)) patch[field] = Array.isArray(next) && !next.length ? null : next ?? null;
  }
  if ("countySlug" in patch || "stateSlug" in patch) {
    const countyName = getCountiesForState(text("stateSlug") || "").find((county) => county.slug === text("countySlug"))?.displayName;
    if (countyName !== base.countyName) patch.countyName = countyName ?? null;
  }
  return patch as CandidatePatch;
}
