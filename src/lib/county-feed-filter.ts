import type { CountySite } from "../data/counties";
import { getOtherStatesWithCountyName } from "../data/county-name-index";
import type { StateSite } from "../data/states";
import type { NewsFeedItem } from "./rss-feed";

export type CountyFeedRegionContext = {
  county: CountySite;
  marketCity?: string;
  usedFallback?: boolean;
};

export function filterFeedItemsByRegion(items: NewsFeedItem[], context: CountyFeedRegionContext) {
  return items.filter((item) => isFeedItemRelevantToCounty(item, context));
}

export function isFeedItemRelevantToCounty(item: NewsFeedItem, context: CountyFeedRegionContext) {
  const text = feedItemSearchText(item);
  const targetState = context.county.state;
  const conflictingStates = getOtherStatesWithCountyName(context.county.name, targetState.abbr);
  const hasTargetState = mentionsState(text, targetState);
  const hasCountyReference = mentionsCountyName(text, context.county.name);

  for (const otherState of conflictingStates) {
    if (!mentionsState(text, otherState)) continue;

    if (hasCountyReference && !hasTargetState) return false;
    if (!hasTargetState) return false;
  }

  if (conflictingStates.length > 0 && hasCountyReference && !hasTargetState) {
    return false;
  }

  if (hasTargetState) return true;

  const localCity = (context.usedFallback ? context.marketCity : context.county.primaryCity)?.toLowerCase();
  if (localCity && text.includes(localCity) && !conflictingStates.some((state) => mentionsState(text, state))) {
    return true;
  }

  if (conflictingStates.length > 0) {
    return !conflictingStates.some((state) => mentionsState(text, state));
  }

  return true;
}

function feedItemSearchText(item: NewsFeedItem) {
  const linkHost = hostname(item.link);
  return [item.title, item.description, item.source, linkHost].filter(Boolean).join(" ").toLowerCase();
}

function mentionsCountyName(text: string, countyName: string) {
  const lowerName = countyName.toLowerCase();
  return (
    text.includes(`${lowerName} county`) ||
    text.includes(`${lowerName},`) ||
    text.includes(`${lowerName} `)
  );
}

function mentionsState(text: string, state: StateSite) {
  const name = state.name.toLowerCase();
  const abbr = state.abbr.toLowerCase();

  if (text.includes(name)) return true;

  const abbrPatterns = [
    ` ${abbr} `,
    ` ${abbr},`,
    `, ${abbr}`,
    `,${abbr}`,
    `(${abbr})`,
    `-${abbr}-`,
    ` ${abbr}.`,
  ];

  return abbrPatterns.some((pattern) => text.includes(pattern));
}

function hostname(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
