import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },
    projects: [
        {
            name: "chromium",
            // Use Playwright's regular Chromium build in new headless mode
            // instead of the default separate headless-shell binary. This is
            // a controlled CI diagnostic for GIF frame advancement.
            use: { ...devices["Desktop Chrome"], channel: "chromium" }
        }
    ],
    webServer: {
        command: "node tests/server.js",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 15000
    }
});
