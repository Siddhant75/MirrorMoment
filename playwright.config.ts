import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const localChromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Desktop Chrome"],
    launchOptions: existsSync(localChromePath) ? { executablePath: localChromePath } : undefined,
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
