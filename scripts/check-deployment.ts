import { loadEnv } from "vite";

const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const required = ["VITE_NEWS_API_URL", "VITE_CANDIDATE_API_BASE", "VITE_CANDIDATE_COGNITO_REGION", "VITE_CANDIDATE_COGNITO_CLIENT_ID"] as const;
const failures: string[] = [];
for (const key of required) {
  const value = env[key]?.trim();
  if (!value || /your-|example\.com|fixture/i.test(value)) failures.push(`${key} is missing or is a placeholder.`);
  if (value && (key.endsWith("URL") || key.endsWith("BASE"))) {
    try { if (new URL(value).protocol !== "https:") failures.push(`${key} must use HTTPS for production.`); }
    catch { failures.push(`${key} is not a valid URL.`); }
  }
}
if (!failures.length && process.argv.includes("--live")) {
  const origin = env.FRONTEND_ORIGIN || "https://patriotsinaction.com";
  for (const [key, endpoint] of [["VITE_NEWS_API_URL", "/health"], ["VITE_CANDIDATE_API_BASE", "/health"], ["VITE_CANDIDATE_API_BASE", "/v1/candidates?limit=1"]] as const) {
    try {
      const response = await fetch(`${env[key]!.replace(/\/+$/, "")}${endpoint}`, { headers: { Origin: origin }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (![origin, "*"].includes(response.headers.get("access-control-allow-origin") || "")) throw new Error("Missing CORS permission for frontend origin");
      const body = await response.json();
      if (endpoint.includes("/v1/candidates") && (!Array.isArray(body.data) || !body.data.length)) throw new Error("Approved directory is empty; seed existing profiles before cutover");
      console.log(`${key} ${endpoint}: OK`);
    } catch (error) { failures.push(`${key} ${endpoint}: ${error instanceof Error ? error.message : "Failed"}`); }
  }
  try {
    const response = await fetch(`${env.VITE_CANDIDATE_API_BASE!.replace(/\/+$/, "")}/v1/candidates/submissions`, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok || ![origin, "*"].includes(response.headers.get("access-control-allow-origin") || "") || !response.headers.get("access-control-allow-methods")?.includes("POST")) throw new Error("Submission CORS preflight failed");
  } catch (error) { failures.push(error instanceof Error ? error.message : "Submission CORS preflight failed"); }
}
if (failures.length) { failures.forEach((failure) => console.error(failure)); process.exitCode = 1; }
else console.log("Deployment configuration checks passed. Reviewer sign-in, persistence, and SES still require environment-specific verification.");
