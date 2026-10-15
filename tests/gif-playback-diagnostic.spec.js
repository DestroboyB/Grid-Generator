import { test, expect } from "@playwright/test";

// Compare the repository fixture with a separately encoded two-frame GIF.
// The only meaningful difference is that the original fixture sets disposal=2.
const fixtures = {
    repository: "R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIMgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAgyAAAALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==",
    reencoded: "R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAMgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAAyAAAALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw=="
};

test("Minimal blank-page GIF playback diagnostic compares both fixtures", async ({ page, browserName }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setContent("<!doctype html><html><body></body></html>");

    const results = await page.evaluate(async fixtures => {
        const observations = {};
        for (const [name, base64] of Object.entries(fixtures)) {
            const image = new Image();
            image.style.cssText = "position:fixed;left:0;top:0;width:64px;height:64px";
            document.body.append(image);
            image.src = `data:image/gif;base64,${base64}`;
            await image.decode();

            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            const sample = () => {
                context.drawImage(image, 0, 0);
                return Array.from(context.getImageData(0, 0, 1, 1).data);
            };
            const samples = [];
            for (let i = 0; i < 12; i++) {
                await new Promise(resolve => setTimeout(resolve, 250));
                samples.push(sample());
            }
            observations[name] = {
                width: image.naturalWidth,
                height: image.naturalHeight,
                samples,
                uniqueFrames: new Set(samples.map(sample => sample.join(","))).size
            };
            image.remove();
        }
        return observations;
    }, fixtures);

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
    }
    expect(results.reencoded.uniqueFrames).toBeGreaterThan(1);
});
