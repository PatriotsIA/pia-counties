import { expect, it } from "vitest";
import { getCandidatesForCounty, getCandidatesForState, getCandidateOfficeLevel, type Candidate } from "../../src/data/candidates";
import { counties } from "../../src/data/counties";

it("matches approved catalog entries by state, statewide scope, and primary or additional county coverage", () => {
  const potter = counties.find((county) => county.state.slug === "texas" && county.slug === "potter")!;
  const base: Candidate = { id: "local", name: "Local", office: "County Judge", stateSlug: "texas", countySlug: "potter", scope: "county" };
  const catalog: Candidate[] = [base, { ...base, id: "state", scope: "statewide", countySlug: undefined }, { ...base, id: "district", scope: "district", countySlug: "randall", countySlugs: ["potter"], officeLevel: "federal" }, { ...base, id: "wrong-county", countySlug: "randall" }, { ...base, id: "wrong-state", stateSlug: "pennsylvania", scope: "statewide" }, { ...base, id: "legacy-abbreviation", stateSlug: "tx" }];
  expect(getCandidatesForCounty(potter, catalog).map((candidate) => candidate.id).sort()).toEqual(["district", "legacy-abbreviation", "local", "state"]);
  expect(getCandidatesForState("tx", catalog)).toHaveLength(5);
  expect(getCandidateOfficeLevel({ ...base, office: "U.S. Senator", scope: "statewide" })).toBe("federal");
  expect(getCandidateOfficeLevel({ ...base, office: "Governor", scope: "statewide" })).toBe("state");
  for (const office of ["State Senate 5", "House District 143", "Texas House District 86", "State Republican Executive Committee, Senate District 31", "Judge of the Texas 231st District Court"]) expect(getCandidateOfficeLevel({ ...base, office, scope: "district" })).toBe("state");
});
