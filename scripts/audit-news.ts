import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { counties, states } from "../src/data/counties";

const args = new Map(process.argv.slice(2).map((arg) => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=") || "true"]; }));
const base = (args.get("base-url") || process.env.VITE_NEWS_API_URL || "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) throw new Error("Supply --base-url=https://your-county-post-api");
const origin = args.get("origin") || "https://patriotsinaction.com";
const output = args.get("output") || "coverage/news-live";
const concurrency = Math.min(8, Math.max(1, Number(args.get("concurrency") || 4)));
const topics = args.get("all-topics") === "true" ? ["general", "politics", "sports", "obituaries", "municipal-bonds", "budgets-levies", "property-taxes"] : ["general"];
const targets = [
  ...states.filter((state) => !args.has("state") || state.slug === args.get("state")).flatMap((state) => [...new Set([...topics, "politics"])].map((topic) => `/v1/feeds/states/${state.slug}/${topic}`)),
  ...counties.filter((county) => (!args.has("state") || county.state.slug === args.get("state")) && (!args.has("county") || county.slug === args.get("county"))).flatMap((county) => topics.map((topic) => `/v1/feeds/counties/${county.state.slug}/${county.slug}/${topic}`)),
];
if (new Set(targets).size !== targets.length) throw new Error("County/state routes are not unique; resolve geography collisions before auditing.");
type Row = { path: string; status: number; count: number; ms: number; cors: boolean; scope: boolean; fetchedAt?: string; error?: string };
await mkdir(output, { recursive: true });
const checkpoint = `${output}/checkpoint.jsonl`;
const completed = new Map<string, Row>();
try {
  const text = await readFile(checkpoint, "utf8");
  for (const line of text.trim().split("\n").filter(Boolean)) { const row = JSON.parse(line) as Row; completed.set(row.path, row); }
} catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
const queue = targets.filter((target) => { const row = completed.get(target); return !row || (args.has("retry-failures") && (row.status !== 200 || !row.cors || !row.scope || row.error)) || (args.has("retry-empty") && row.count === 0); });
console.log(JSON.stringify({ targets: targets.length, remaining: queue.length, concurrency }));
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (;;) {
    const path = queue.shift();
    if (!path) return;
    const started = performance.now();
    let row: Row;
    try {
      let response: Response;
      for (let attempt = 0; ; attempt++) {
        response = await fetch(`${base}${path}?limit=40`, { headers: { Origin: origin, Accept: "application/json" }, signal: AbortSignal.timeout(45_000) });
        if (response.status !== 429 || attempt >= 3) break;
        await response.arrayBuffer();
        await new Promise((resolve) => setTimeout(resolve, 5_000 * (attempt + 1)));
      }
      const data = await response.json();
      const parts = path.split("/");
      row = { path, status: response.status, count: Array.isArray(data.items) ? data.items.length : 0, ms: Math.round(performance.now() - started), cors: [origin, "*"].includes(response.headers.get("access-control-allow-origin") || ""), scope: data.scope?.stateSlug === parts[4] && data.scope?.level === (parts[3] === "counties" ? "county" : "state") && data.topic === parts.at(-1) && (parts[3] !== "counties" || data.scope?.countySlug === parts[5]), fetchedAt: data.meta?.fetchedAt };
      if (!Array.isArray(data.items)) row.error = "Invalid payload";
    } catch (error) { row = { path, status: 0, count: 0, ms: Math.round(performance.now() - started), cors: false, scope: false, error: error instanceof Error ? error.message : String(error) }; }
    completed.set(path, row);
    await appendFile(checkpoint, JSON.stringify(row) + "\n");
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (completed.size % 100 === 0) console.log(JSON.stringify({ completed: completed.size, remaining: queue.length }));
  }
}));
const rows = targets.map((target) => completed.get(target)!);
const times = rows.map((row) => row.ms).sort((a,b) => a-b);
const summary = { checkedAt: new Date().toISOString(), base, origin, targets: rows.length, populated: rows.filter((r) => r.status === 200 && r.count > 0 && r.cors && r.scope).length, empty: rows.filter((r) => r.status === 200 && !r.count).length, failed: rows.filter((r) => r.status !== 200 || !r.cors || !r.scope || r.error).length, p50Ms: times[Math.floor(times.length * .5)], p95Ms: times[Math.floor(times.length * .95)], maxMs: times.at(-1) };
await writeFile(`${output}/report.json`, JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
if (summary.failed) process.exitCode = 1;
