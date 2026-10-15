import { test, expect } from "@playwright/test";

test("PWA manifest describes an installable app and includes an icon", async ({ page }) => {
    await page.goto("/");
    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();

    expect(manifest.name).toBe("Grid Generator");
    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(expect.arrayContaining([
        expect.objectContaining({
            src: "./assets/grid-generator-icon.svg",
            type: "image/svg+xml"
        })
    ]));
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "./manifest.webmanifest");
});

test("service worker registers and app shell can reload offline", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) throw new Error("Service workers are unsupported");
        await navigator.serviceWorker.ready;
    });

    await page.reload();
    await page.evaluate(async () => {
        if (!navigator.serviceWorker.controller) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Service worker did not take control")), 5000);
                navigator.serviceWorker.addEventListener("controllerchange", () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
            });
        }
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle("Grid Generator");
    await expect(page.locator(".app-title")).toHaveText("Grid Generator");

    const cachedStylesheet = await page.evaluate(async () => {
        const response = await fetch("./style.css");
        return { ok: response.ok, status: response.status, contentType: response.headers.get("content-type") };
    });
    expect(cachedStylesheet.ok).toBeTruthy();
    expect(cachedStylesheet.contentType).toContain("text/css");
});
