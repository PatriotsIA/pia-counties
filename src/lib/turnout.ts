type TurnoutEntry = {
  registeredVoters: number;
  ballotsCast: number;
};

type TurnoutElection = {
  id: string;
  year: number;
  electionLabel: string;
  electionType: string;
  updatedAt: string;
  source?: {
    name?: string;
    url?: string;
  };
  byFips: Record<string, TurnoutEntry>;
};

type TurnoutDataset = {
  schemaVersion: number;
  generatedAt: string;
  elections: TurnoutElection[];
};

const TURNOUT_URL = "/data/turnout/latest.json";
const TURNOUT_CACHE_KEY = "pia-counties.turnout.latest";

let inMemoryDataset: TurnoutDataset | null = null;

function isValidEntry(entry: unknown): entry is TurnoutEntry {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<TurnoutEntry>;
  return (
    typeof candidate.registeredVoters === "number" &&
    Number.isFinite(candidate.registeredVoters) &&
    candidate.registeredVoters > 0 &&
    typeof candidate.ballotsCast === "number" &&
    Number.isFinite(candidate.ballotsCast) &&
    candidate.ballotsCast >= 0
  );
}

function isValidElection(election: unknown): election is TurnoutElection {
  if (!election || typeof election !== "object") return false;
  const candidate = election as Partial<TurnoutElection>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.year !== "number" ||
    typeof candidate.electionLabel !== "string" ||
    typeof candidate.electionType !== "string" ||
    typeof candidate.updatedAt !== "string" ||
    !candidate.byFips ||
    typeof candidate.byFips !== "object"
  ) {
    return false;
  }

  for (const value of Object.values(candidate.byFips)) {
    if (!isValidEntry(value)) return false;
  }

  return true;
}

function isValidDataset(dataset: unknown): dataset is TurnoutDataset {
  if (!dataset || typeof dataset !== "object") return false;
  const candidate = dataset as Partial<TurnoutDataset>;
  if (typeof candidate.schemaVersion !== "number" || typeof candidate.generatedAt !== "string" || !Array.isArray(candidate.elections)) {
    return false;
  }

  for (const election of candidate.elections) {
    if (!isValidElection(election)) return false;
  }

  return true;
}

function readCachedDataset(): TurnoutDataset | null {
  if (typeof window === "undefined") return null;
  const cachedRaw = window.localStorage.getItem(TURNOUT_CACHE_KEY);
  if (!cachedRaw) return null;

  try {
    const parsed = JSON.parse(cachedRaw);
    return isValidDataset(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedDataset(dataset: TurnoutDataset) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TURNOUT_CACHE_KEY, JSON.stringify(dataset));
}

export async function loadTurnoutDataset() {
  if (inMemoryDataset) return inMemoryDataset;

  try {
    const response = await fetch(TURNOUT_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Turnout fetch failed: ${response.status}`);
    const json = await response.json();
    if (!isValidDataset(json)) throw new Error("Turnout payload schema mismatch.");
    inMemoryDataset = json;
    writeCachedDataset(json);
    return json;
  } catch {
    const cached = readCachedDataset();
    if (cached) {
      inMemoryDataset = cached;
      return cached;
    }
    throw new Error("Unable to load turnout dataset.");
  }
}

export type CountyTurnoutSummary = {
  electionId: string;
  year: number;
  registeredVoters: number;
  ballotsCast: number;
  turnoutPct: number;
  electionLabel: string;
  updatedAt: string;
  electionType: string;
  sourceName?: string;
};

export async function getCountyTurnoutHistoryByFips(fips: string): Promise<CountyTurnoutSummary[]> {
  const dataset = await loadTurnoutDataset();
  const results: CountyTurnoutSummary[] = [];

  for (const election of dataset.elections) {
    const entry = election.byFips[fips];
    if (!entry || entry.registeredVoters <= 0) continue;
    results.push({
      electionId: election.id,
      year: election.year,
      registeredVoters: entry.registeredVoters,
      ballotsCast: entry.ballotsCast,
      turnoutPct: Math.min(100, (entry.ballotsCast / entry.registeredVoters) * 100),
      electionLabel: election.electionLabel,
      updatedAt: election.updatedAt,
      electionType: election.electionType,
      sourceName: election.source?.name,
    });
  }

  return results.sort((a, b) => b.year - a.year);
}
