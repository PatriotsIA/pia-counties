import { defineConfig } from "@playwright/test";
import path from "node:path";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 45_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4180", trace: "retain-on-failure", screenshot: "only-on-failure", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium", args: ["--no-sandbox"] } },
  webServer: [
    { command: "node --import tsx tests/local-server.ts", cwd: process.env.CANDIDATE_API_REPO || path.resolve("../pia-candidate-api"), url: "http://127.0.0.1:8791/health", reuseExistingServer: false },
    { command: "npm run dev -- --host 127.0.0.1 --port 4180 --strictPort", url: "http://127.0.0.1:4180", reuseExistingServer: false, env: { VITE_NEWS_API_URL: "https://news.fixture", VITE_CANDIDATE_API_BASE: "http://127.0.0.1:8791", VITE_CANDIDATE_COGNITO_REGION: "us-east-2", VITE_CANDIDATE_COGNITO_CLIENT_ID: "fixture-client" } },
  ],
});
