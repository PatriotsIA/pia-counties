import ICAL from "ical.js";
import type { CalendarEvent } from "./calendar";

type MightyListResponse<T> = {
  items?: T[];
  links?: {
    next?: string | null;
  };
};

export type MightyPost = {
  id: number;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  images?: (string | null)[];
  permalink?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
  post_type?: string;
  content_type?: string;
  link?: string | null;
  location?: string | null;
};

export type MightyEvent = MightyPost & {
  starts_at?: string | null;
  ends_at?: string | null;
  frequency?: string | null;
  recurrence_rule?: string | null;
  time_zone?: string | null;
};

const configuredMightyBase = import.meta.env.VITE_MIGHTY_API_BASE?.replace(/\/+$/, "");
const mightyBase = import.meta.env.DEV && configuredMightyBase ? "/api/mighty" : configuredMightyBase;
const MAX_EVENT_PAGES = 20;
const MAX_RECURRENCE_OCCURRENCES = 500;

function requireBaseUrl() {
  if (!mightyBase) throw new Error("Mighty API base URL is not configured.");
  return mightyBase.replace(/\/+$/, "");
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = requireBaseUrl();
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    throw new Error(`Mighty API request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchSpaceFeed(spaceId: string, perPage = 25): Promise<MightyPost[]> {
  const data = await fetchJson<MightyListResponse<MightyPost>>(`/spaces/${spaceId}/feed?per_page=${perPage}`);
  return data.items || [];
}

export async function fetchSpaceEvents(spaceId: string, perPage = 50): Promise<MightyEvent[]> {
  const pageSize = Number.isFinite(perPage) ? Math.min(100, Math.max(1, Math.floor(perPage))) : 50;
  const events: MightyEvent[] = [];
  const seen = new Set<number>();

  for (let page = 1; page <= MAX_EVENT_PAGES; page += 1) {
    const data = await fetchJson<MightyListResponse<MightyEvent>>(
      `/spaces/${spaceId}/events?page=${page}&per_page=${pageSize}`,
      { cache: "no-store" },
    );

    for (const event of data.items || []) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        events.push(event);
      }
    }

    if (!data.links?.next) return events;
  }

  throw new Error(`Mighty events exceeded ${MAX_EVENT_PAGES} pages.`);
}

export function mightyIsConfigured() {
  return Boolean(mightyBase);
}

export function normalizeMightyEvents(items: MightyEvent[], now = new Date()): CalendarEvent[] {
  const futureLimit = new Date(now);
  futureLimit.setFullYear(futureLimit.getFullYear() + 2);
  const seen = new Set<string>();

  return items
    .flatMap((event) => expandMightyEvent(event, now, futureLimit))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .filter((event) => {
      const key = `${event.title.toLowerCase()}-${event.start.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function expandMightyEvent(event: MightyEvent, now: Date, futureLimit: Date): CalendarEvent[] {
  const start = parseDate(event.starts_at);
  if (!start) return [];
  const end = parseDate(event.ends_at);
  const duration = end ? Math.max(0, end.getTime() - start.getTime()) : undefined;

  if (!event.recurrence_rule) {
    return (end || start) >= now ? [toCalendarEvent(event, start, end)] : [];
  }

  const localStart = localIcalTime(event.starts_at);
  if (!localStart) return (end || start) >= now ? [toCalendarEvent(event, start, end)] : [];

  try {
    const iterator = ICAL.Recur.fromString(event.recurrence_rule).iterator(localStart);
    const results: CalendarEvent[] = [];
    let occurrence = iterator.next();
    let count = 0;

    while (occurrence && count < MAX_RECURRENCE_OCCURRENCES) {
      const occurrenceStart = sameLocalTime(occurrence, localStart)
        ? start
        : dateFromOccurrence(occurrence, event.time_zone, event.starts_at);
      if (occurrenceStart > futureLimit) break;

      const occurrenceEnd = duration === undefined
        ? undefined
        : new Date(occurrenceStart.getTime() + duration);
      if ((occurrenceEnd || occurrenceStart) >= now) {
        results.push(toCalendarEvent(event, occurrenceStart, occurrenceEnd));
      }

      count += 1;
      occurrence = iterator.next();
    }

    return results;
  } catch {
    return (end || start) >= now ? [toCalendarEvent(event, start, end)] : [];
  }
}

function toCalendarEvent(event: MightyEvent, start: Date, end?: Date): CalendarEvent {
  return {
    id: `mn-${event.id}-${start.toISOString()}`,
    title: event.title || event.summary || "Community event",
    start,
    end,
    eventLink: event.permalink || event.link || undefined,
    location: event.location || undefined,
    isAllDay: false,
  };
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function localIcalTime(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return undefined;
  return new ICAL.Time({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
    isDate: false,
  }, ICAL.Timezone.utcTimezone);
}

function sameLocalTime(left: ICAL.Time, right: ICAL.Time) {
  return left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute
    && left.second === right.second;
}

function dateFromOccurrence(occurrence: ICAL.Time, timeZone?: string | null, originalStart?: string | null) {
  if (timeZone) {
    try {
      return dateInTimeZone(occurrence, timeZone);
    } catch {
      // Fall back to the event's original numeric offset.
    }
  }

  const offset = originalStart?.match(/(Z|[+-]\d{2}:\d{2})$/)?.[1] || "Z";
  const pad = (value: number) => String(value).padStart(2, "0");
  return new Date(
    `${occurrence.year}-${pad(occurrence.month)}-${pad(occurrence.day)}T`
    + `${pad(occurrence.hour)}:${pad(occurrence.minute)}:${pad(occurrence.second)}${offset}`,
  );
}

function dateInTimeZone(occurrence: ICAL.Time, timeZone: string) {
  const target = Date.UTC(
    occurrence.year,
    occurrence.month - 1,
    occurrence.day,
    occurrence.hour,
    occurrence.minute,
    occurrence.second,
  );
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let timestamp = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = target - represented;
    timestamp += correction;
    if (!correction) break;
  }

  return new Date(timestamp);
}
