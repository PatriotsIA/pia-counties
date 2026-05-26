export type NewsFeedItem = {
  id: string;
  title: string;
  link: string;
  source?: string;
  sourceUrl?: string;
  publishedAt?: string;
  description?: string;
  imageUrl?: string;
};

const MAX_ITEMS = 40;
const ARTICLE_IMAGE_LOOKUP_LIMIT = 12;

export async function buildNewsFeedItems(xml: string) {
  return enrichNewsFeedItems(parseRssItems(xml));
}

export async function buildNewsFeedItemsFromXmls(xmls: string[]) {
  const deduped = new Map<string, NewsFeedItem>();
  xmls.flatMap(parseRssItems).forEach((item) => {
    const key = item.link || item.id;
    const existing = deduped.get(key);
    if (!existing || timestamp(item.publishedAt) > timestamp(existing.publishedAt)) {
      deduped.set(key, item);
    }
  });

  return enrichNewsFeedItems([...deduped.values()]);
}

async function enrichNewsFeedItems(feedItems: NewsFeedItem[]) {
  const items = feedItems.sort(byNewestPublished).slice(0, MAX_ITEMS);

  return Promise.all(
    items.map(async (item, index) => {
      const publisherLink = await resolvePublisherLink(item.link);
      const feedImageUrl = isGoogleHostedImage(item.imageUrl) ? "" : item.imageUrl || "";
      const articleImageUrl = index < ARTICLE_IMAGE_LOOKUP_LIMIT ? await fetchArticleImage(publisherLink) : "";

      return {
        ...item,
        link: publisherLink,
        imageUrl: articleImageUrl || feedImageUrl || fallbackImage(item.source || "News"),
      };
    }),
  ).then((enriched) => enriched.sort(byNewestPublished));
}

function parseRssItems(xml: string): NewsFeedItem[] {
  return matchBlocks(xml, "item").map((item, index) => {
    const description = decodeEntities(tagText(item, "description"));
    const source = tagText(item, "source");
    const sourceUrl = tagAttribute(item, "source", "url");
    const link = tagText(item, "link") || "#";
    const title = tagText(item, "title") || "Untitled update";

    return {
      id: tagText(item, "guid") || link || `${title}-${index}`,
      title,
      link,
      source,
      sourceUrl,
      publishedAt: tagText(item, "pubDate"),
      description: stripHtml(description).slice(0, 180),
      imageUrl: feedImageUrl(item, description),
    };
  });
}

function byNewestPublished(first: NewsFeedItem, second: NewsFeedItem) {
  return timestamp(second.publishedAt) - timestamp(first.publishedAt);
}

function timestamp(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function feedImageUrl(item: string, description: string) {
  return (
    namespacedTagAttribute(item, "media:content", "url") ||
    namespacedTagAttribute(item, "media:thumbnail", "url") ||
    tagAttribute(item, "enclosure", "url", /type=["']image\//i) ||
    description.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
    ""
  );
}

async function fetchArticleImage(link: string) {
  if (!link || link === "#") return "";

  try {
    const response = await fetch(link, {
      redirect: "follow",
      signal: AbortSignal.timeout(2500),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "PatriotsInActionFeeds/1.0",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) return "";

    const html = await response.text();
    return htmlImageUrl(html, response.url) || googleNewsArticleImageUrl(html);
  } catch {
    return "";
  }
}

async function resolvePublisherLink(link: string) {
  if (!isGoogleNewsArticleLink(link)) return link;

  try {
    return offlineGoogleNewsDecode(link) || (await decodeGoogleNewsUrl(link)) || link;
  } catch {
    return link;
  }
}

function isGoogleNewsArticleLink(link: string) {
  try {
    const url = new URL(link);
    const path = url.pathname.split("/");
    return url.hostname === "news.google.com" && path.length > 1 && path[path.length - 2] === "articles";
  } catch {
    return false;
  }
}

function offlineGoogleNewsDecode(link: string) {
  const id = googleNewsArticleId(link);
  if (!id) return "";

  try {
    let decoded = atob(id.replace(/-/g, "+").replace(/_/g, "/"));
    const prefix = String.fromCharCode(0x08, 0x13, 0x22);
    const suffix = String.fromCharCode(0xd2, 0x01, 0x00);

    if (decoded.startsWith(prefix)) decoded = decoded.slice(prefix.length);
    if (decoded.endsWith(suffix)) decoded = decoded.slice(0, -suffix.length);

    const length = decoded.charCodeAt(0);
    decoded = length >= 0x80 ? decoded.slice(2, length + 2) : decoded.slice(1, length + 1);

    return decoded.startsWith("http") ? decoded : "";
  } catch {
    return "";
  }
}

async function decodeGoogleNewsUrl(link: string) {
  const id = googleNewsArticleId(link);
  if (!id) return "";

  const params = await googleNewsDecodeParams(id);
  if (!params) return "";

  const request = [
    "Fbv4je",
    `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${params.timestamp},"${params.signature}"]`,
  ];
  const payload = JSON.stringify([[[...request]]]);

  const response = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST",
    signal: AbortSignal.timeout(2500),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `f.req=${encodeURIComponent(payload)}`,
  });

  if (!response.ok) return "";

  const text = await response.text();
  const payloadText = text.split("\n\n")[1];
  if (!payloadText) return "";

  try {
    const rows = JSON.parse(payloadText) as unknown[][];
    const responsePayload = rows.find((row) => row[0] === "wrb.fr" && row[1] === "Fbv4je")?.[2];
    if (typeof responsePayload !== "string") return "";
    const decoded = JSON.parse(responsePayload) as unknown[];
    return typeof decoded[1] === "string" ? decoded[1] : "";
  } catch {
    return "";
  }
}

async function googleNewsDecodeParams(id: string) {
  const response = await fetch(`https://news.google.com/articles/${id}`, {
    signal: AbortSignal.timeout(2500),
    headers: {
      "User-Agent": "PatriotsInActionFeeds/1.0",
    },
  });

  if (!response.ok) return undefined;

  const html = await response.text();
  const cWizDiv = html.match(/<c-wiz\b[\s\S]*?<div\b([^>]*)>/i)?.[1] || "";
  const signature = attributeValue(cWizDiv, "data-n-a-sg");
  const timestamp = attributeValue(cWizDiv, "data-n-a-ts");

  return signature && timestamp ? { signature, timestamp } : undefined;
}

function googleNewsArticleId(link: string) {
  try {
    const url = new URL(link);
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    return id || "";
  } catch {
    return "";
  }
}

function htmlImageUrl(html: string, baseUrl: string) {
  const rawImage =
    metaContent(html, "property", "og:image") ||
    metaContent(html, "property", "og:image:url") ||
    metaContent(html, "name", "twitter:image") ||
    metaContent(html, "name", "thumbnail");

  if (!rawImage) return "";

  try {
    return new URL(decodeEntities(rawImage), baseUrl).toString();
  } catch {
    return "";
  }
}

function isGoogleHostedImage(value?: string) {
  if (!value) return false;

  try {
    const host = new URL(value).hostname;
    return host === "lh3.googleusercontent.com" || host.endsWith(".googleusercontent.com") || host.endsWith(".gstatic.com");
  } catch {
    return false;
  }
}

function googleNewsArticleImageUrl(html: string) {
  const candidates = [...html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'<>\\]+/g)]
    .map((match) => decodeEscapedJsonString(match[0]))
    .filter((url) => !url.includes("-DR60l-K8vnyi99NZovm9HlXyZwQ85GMDxiwJWzoasZYCUrPuUM_P_4Rb7ei03j-0nRs0c4F"))
    .filter((url) => /=s0-w\d+|[?=]w(300|400|500|600|800|1000)/i.test(url));

  return candidates[0] || "";
}

function fallbackImage(label: string) {
  return `https://placehold.co/320x240/15386f/ffffff?text=${encodeURIComponent(label.slice(0, 24))}`;
}

function matchBlocks(xml: string, tagName: string) {
  return [...xml.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"))].map((match) => match[1]);
}

function tagText(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripCdata(decodeEntities(match[1].trim())) : "";
}

function tagAttribute(xml: string, tagName: string, attribute: string, requiredTagPattern?: RegExp) {
  const match = xml.match(new RegExp(`<${tagName}\\b([^>]*)\\/?>`, "i"));
  if (!match || (requiredTagPattern && !requiredTagPattern.test(match[0]))) return "";
  return attributeValue(match[1], attribute);
}

function namespacedTagAttribute(xml: string, tagName: string, attribute: string) {
  const escapedName = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escapedName}\\b([^>]*)\\/?>`, "i"));
  return match ? attributeValue(match[1], attribute) : "";
}

function attributeValue(attributes: string, attribute: string) {
  const match = attributes.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function metaContent(html: string, attribute: "name" | "property", value: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = metaTags.find((meta) => new RegExp(`${attribute}=["']${escapeRegExp(value)}["']`, "i").test(meta));
  return tag ? attributeValue(tag, "content") : "";
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function decodeEscapedJsonString(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
