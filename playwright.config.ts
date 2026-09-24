import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/advertiser",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4186",
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE === "bundled"
          ? undefined
          : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4186 --strictPort",
    url: "http://127.0.0.1:4186",
    reuseExistingServer: false,
    env: {
      VITE_ADVERTISING_API_URL: "https://advertising.fixture/",
      VITE_EMAILJS_SERVICE_ID: "test-service",
      VITE_EMAILJS_TEMPLATE_ID: "test-template",
      VITE_EMAILJS_PUBLIC_KEY: "test-public-key",
    },
  },
});
