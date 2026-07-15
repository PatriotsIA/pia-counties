import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { candidates } from "../src/data/candidates";
import { counties, states, type CountyPageKey } from "../src/data/counties";
import { site } from "../src/data/site";

type UrlEntry = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: string;
};

const countyPages: CountyPageKey[] = ["home", "about", "elections", "candidates", "news", "events", "tv", "partners", "contact"];
const today = new Date().toISOString().slice(0, 10);

function statePath(state: { abbr: string }) {
  return `/${state.abbr.toLowerCase()}`;
}

function countyPath(county: { slug: string; state: { abbr: string } }) {
  return `${statePath(county.state)}/${county.slug}`;
}

function countyPagePath(county: (typeof counties)[number], page: CountyPageKey) {
  return page === "home" ? countyPath(county) : `${countyPath(county)}/${page}`;
}

function absoluteUrl(urlPath: string) {
  return new URL(urlPath, site.url).toString();
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function urlEntry(pathname: string, changefreq: UrlEntry["changefreq"], priority: string): UrlEntry {
  return { path: pathname, changefreq, priority };
}

const staticUrls: UrlEntry[] = [
  urlEntry("/", "weekly", "1.0"),
  urlEntry("/counties", "weekly", "0.95"),
  urlEntry("/tx/candidates", "weekly", "0.9"),
  urlEntry("/tv", "weekly", "0.8"),
  urlEntry("/rewards", "monthly", "0.75"),
  urlEntry("/contact", "monthly", "0.7"),
  urlEntry("/privacy", "yearly", "0.3"),
  urlEntry("/terms", "yearly", "0.3"),
];

const stateUrls = states.flatMap((state) => [
  urlEntry(statePath(state), "weekly", "0.86"),
  urlEntry(`${statePath(state)}/candidates`, "weekly", "0.82"),
]);

const countyUrls = counties.flatMap((county) =>
  countyPages.map((page) =>
    urlEntry(
      countyPagePath(county, page),
      page === "news" || page === "events" ? "daily" : page === "home" ? "weekly" : "monthly",
      page === "home" ? "0.78" : page === "news" || page === "elections" || page === "candidates" ? "0.72" : "0.64",
    ),
  ),
);

const candidateUrls = candidates.map((candidate) => urlEntry(`/candidates/${candidate.id}`, "monthly", "0.74"));
const urls = [...staticUrls, ...stateUrls, ...countyUrls, ...candidateUrls];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

const llms = `# ${site.name}

${site.description}

${site.name} is a nationwide and local civic hub with county pages for voter resources, elected official lookups, candidate profiles, local news, events, community updates, PIA TV, and practical civic action.

Important URLs:
- Home: ${absoluteUrl("/")}
- County finder: ${absoluteUrl("/counties")}
- Texas candidates: ${absoluteUrl("/tx/candidates")}
- PIA TV: ${absoluteUrl("/tv")}
- Contact: ${absoluteUrl("/contact")}
- Privacy: ${absoluteUrl("/privacy")}
- Terms: ${absoluteUrl("/terms")}

County URLs use state abbreviations, for example ${absoluteUrl("/tx/potter")}.
`;

await mkdir(path.join(process.cwd(), "public"), { recursive: true });
await writeFile(path.join(process.cwd(), "public", "sitemap.xml"), sitemap);
await writeFile(path.join(process.cwd(), "public", "robots.txt"), robots);
await writeFile(path.join(process.cwd(), "public", "llms.txt"), llms);

console.log(`Generated SEO files for ${urls.length} URLs.`);
