import { isAmbiguousCountyName } from "../data/county-name-index";
import { site } from "../data/site";
import type { StateSite } from "../data/states";

export type CountyFeedKind =
  | "localNews"
  | "localSports"
  | "localVideo"
  | "obituaries"
  | "elections"
  | "bondIssues"
  | "countyMoney"
  | "propertyTaxes";

function googleNewsRssUrl(query: string) {
  const url = new URL(site.links.googleNewsRssSearch);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}

function countyScopedTerms(countyName: string, state: StateSite) {
  if (isAmbiguousCountyName(countyName)) {
    return `"${countyName} County ${state.name}" OR "${countyName} County ${state.abbr}" OR "${countyName} ${state.abbr}"`;
  }
  return `${countyName} County ${state.name} OR ${countyName} ${state.abbr}`;
}

function scopedTopicQuery(scoped: string, topics: string[]) {
  return `(${scoped}) (${topics.join(" OR ")})`;
}

const countyMoneyTopics = [
  '"county budget"',
  "budget",
  "spending",
  "finance",
  "audit",
  "revenue",
  "funding",
  '"public funds"',
];

const electionTopics = [
  "election",
  "elections",
  '"early voting"',
  "voting",
  "voter",
  "ballot",
  "candidate",
  "precinct",
  '"primary election"',
  "runoff",
];

export function buildCountyFeedUrl(kind: CountyFeedKind, countyName: string, state: StateSite) {
  const scoped = countyScopedTerms(countyName, state);

  switch (kind) {
    case "localNews":
      return googleNewsRssUrl(`${scoped} local news OR ${scoped} community news`);
    case "localSports":
      return googleNewsRssUrl(
        `${scoped} high school sports OR ${scoped} college sports OR ${scoped} football OR ${scoped} basketball OR ${scoped} baseball OR ${scoped} softball`,
      );
    case "localVideo":
      return googleNewsRssUrl(`${scoped} local news video OR ${scoped} news video`);
    case "obituaries":
      return googleNewsRssUrl(
        `${scoped} obituaries OR ${scoped} obituary OR ${scoped} funeral home OR ${scoped} death notice`,
      );
    case "elections":
      return googleNewsRssUrl(scopedTopicQuery(scoped, electionTopics));
    case "bondIssues":
      return googleNewsRssUrl(
        scopedTopicQuery(scoped, [
          '"bond issue"',
          '"bond election"',
          '"bond referendum"',
          '"general obligation bond"',
          '"county bond"',
        ]),
      );
    case "countyMoney":
      return googleNewsRssUrl(scopedTopicQuery(scoped, countyMoneyTopics));
    case "propertyTaxes":
      return googleNewsRssUrl(
        scopedTopicQuery(scoped, [
          '"property tax"',
          '"property taxes"',
          '"tax rate"',
          '"tax appraisal"',
          '"property appraisal"',
          '"tax assessor"',
          '"homestead exemption"',
        ]),
      );
  }
}

export function buildMarketFeedUrl(kind: CountyFeedKind, placeName: string, state: StateSite) {
  const scopedPlace = `"${placeName} ${state.name}" OR "${placeName} ${state.abbr}"`;

  switch (kind) {
    case "localNews":
      return googleNewsRssUrl(`${scopedPlace} local news`);
    case "localSports":
      return googleNewsRssUrl(
        `${scopedPlace} high school sports OR ${scopedPlace} college sports OR ${scopedPlace} football OR ${scopedPlace} basketball`,
      );
    case "localVideo":
      return googleNewsRssUrl(`${scopedPlace} local news video OR ${scopedPlace} news video`);
    case "obituaries":
      return googleNewsRssUrl(
        `${scopedPlace} obituaries OR ${scopedPlace} obituary OR ${scopedPlace} funeral home`,
      );
    case "elections":
      return googleNewsRssUrl(scopedTopicQuery(scopedPlace, electionTopics));
    case "bondIssues":
      return googleNewsRssUrl(
        scopedTopicQuery(scopedPlace, [
          '"bond issue"',
          '"bond election"',
          '"bond referendum"',
          '"general obligation bond"',
          '"county bond"',
        ]),
      );
    case "countyMoney":
      return googleNewsRssUrl(scopedTopicQuery(scopedPlace, countyMoneyTopics));
    case "propertyTaxes":
      return googleNewsRssUrl(
        scopedTopicQuery(scopedPlace, [
          '"property tax"',
          '"property taxes"',
          '"tax rate"',
          '"tax appraisal"',
          '"property appraisal"',
          '"tax assessor"',
          '"homestead exemption"',
        ]),
      );
  }
}

export function buildStateElectionFeedUrl(state: StateSite) {
  return googleNewsRssUrl(scopedTopicQuery(`"${state.name}"`, electionTopics));
}
