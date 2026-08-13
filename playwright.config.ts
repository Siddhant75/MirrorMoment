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
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: testBaseUrl,
    reuseExistingServer: false,
    env: {
      MIRRORMOMENT_MODE: "replay",
      YOUCAM_API_KEY: "",
    },
  },
});
