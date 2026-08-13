type MightyListResponse<T> = {
  items?: T[];
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
};

const configuredMightyBase = import.meta.env.VITE_MIGHTY_API_BASE?.replace(/\/+$/, "");
const mightyBase = import.meta.env.DEV && configuredMightyBase ? "/api/mighty" : configuredMightyBase;

function requireBaseUrl() {
  if (!mightyBase) throw new Error("Mighty API base URL is not configured.");
  return mightyBase.replace(/\/+$/, "");
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = requireBaseUrl();
  const response = await fetch(`${base}${path}`);
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
  const data = await fetchJson<MightyListResponse<MightyEvent>>(`/spaces/${spaceId}/events?per_page=${perPage}`);
  return data.items || [];
}

export function mightyIsConfigured() {
  return Boolean(mightyBase);
}
