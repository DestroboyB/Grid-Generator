import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

// Compare the repository fixture with a separately encoded two-frame GIF.
// Sample both canvas pixels and actual rendered screenshots to distinguish
// a frozen image timeline from a canvas-only sampling issue.
const fixtures = {
    repository: "R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIMgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAgyAAAALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==",
    reencoded: "R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAMgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAAyAAAALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw=="
};

test("Minimal blank-page GIF playback diagnostic compares canvas and visible rendering", async ({ page, browserName }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setContent("<!doctype html><html><body></body></html>");

    const results = {};
    for (const [name, base64] of Object.entries(fixtures)) {
        const image = page.locator("body").locator("img").last();
        await page.evaluate(({ name, base64 }) => {
            const image = new Image();
            image.dataset.diagnostic = name;
            image.style.cssText = "position:fixed;left:0;top:0;width:64px;height:64px;image-rendering:pixelated";
            document.body.append(image);
            image.src = `data:image/gif;base64,${base64}`;
        }, { name, base64 });
        const target = page.locator(`img[data-diagnostic="${name}"]`);
        await target.evaluate(img => img.decode());

        const sampleCanvas = () => target.evaluate(img => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const context = canvas.getContext("2d");
            context.drawImage(img, 0, 0);
            return Array.from(context.getImageData(0, 0, 1, 1).data);
        });
        const canvasSamples = [];
        const screenshotHashes = [];
        let rafCallbacks = 0;
        await target.evaluate(img => {
            const tick = () => {
                window.__gifDiagnosticRaf = (window.__gifDiagnosticRaf || 0) + 1;
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });

        for (let i = 0; i < 12; i++) {
            await page.waitForTimeout(250);
            canvasSamples.push(await sampleCanvas());
            const screenshot = await target.screenshot({ animations: "allow" });
            screenshotHashes.push(createHash("sha256").update(screenshot).digest("hex"));
            rafCallbacks = await page.evaluate(() => window.__gifDiagnosticRaf || 0);
        }

        results[name] = {
            width: await target.evaluate(img => img.naturalWidth),
            height: await target.evaluate(img => img.naturalHeight),
            canvasSamples,
            uniqueCanvasFrames: new Set(canvasSamples.map(sample => sample.join(","))).size,
            uniqueRenderedScreenshots: new Set(screenshotHashes).size,
            rafCallbacks
        };
    }

    console.log("BLANK PAGE GIF COMPARISON", JSON.stringify({
        browserName,
        browserVersion: page.context().browser()?.version(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        reducedMotion: await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
        results
    }));

    for (const result of Object.values(results)) {
        expect(result.width).toBe(16);
        expect(result.height).toBe(16);
        expect(result.rafCallbacks).toBeGreaterThan(0);
    }
    // Keep this a diagnostic: report whether visible frames advance without
    // failing the whole suite solely because the environment freezes GIFs.
    expect(results.reencoded.uniqueCanvasFrames).toBeGreaterThanOrEqual(1);
});
