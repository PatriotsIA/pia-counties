import type { Candidate } from "../data/candidates";

export function candidateProfilePath(candidate: Candidate) {
  return `/candidates/${candidate.id}`;
}

export function candidateJurisdiction(candidate: Candidate) {
  return candidate.countyName || candidate.district || (candidate.scope === "statewide" ? "Statewide" : "");
}

