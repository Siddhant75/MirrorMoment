import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const localChromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const testBaseUrl = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: testBaseUrl,
    ...devices["Desktop Chrome"],
    launchOptions: existsSync(localChromePath) ? { executablePath: localChromePath } : undefined,
  },
  webServer: {
    command: "node .next/standalone/server.js",
    url: testBaseUrl,
    reuseExistingServer: false,
    env: {
      HOSTNAME: "127.0.0.1",
      MIRRORMOMENT_MODE: "replay",
      PORT: "3100",
      YOUCAM_API_KEY: "",
    },
  },
});
