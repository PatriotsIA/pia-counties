import { getCountiesForState } from "../data/counties";
import type { Candidate } from "../data/candidates";

export function candidateProfilePath(candidate: Candidate) {
  return `/candidates/${candidate.id}`;
}

export function candidateJurisdiction(candidate: Candidate) {
  return candidate.scope === "statewide" ? "Statewide" : candidate.district || candidate.countyName || "";
}


export function candidateJurisdictions(candidate: Candidate) {
  return [...new Set([candidateJurisdiction(candidate), ...getCountiesForState(candidate.stateSlug).filter((county) => county.slug === candidate.countySlug || candidate.countySlugs?.includes(county.slug)).map((county) => county.displayName)].filter(Boolean))];
}
