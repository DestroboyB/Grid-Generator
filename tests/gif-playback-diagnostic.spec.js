import { test, expect } from "@playwright/test";

const animatedGif = Buffer.from(
    "R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIMgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAgyAAAALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==",
    "base64"
);

test("Minimal blank-page GIF playback diagnostic", async ({ page, browserName }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setContent("<!doctype html><html><body></body></html>");

    const result = await page.evaluate(async base64 => {
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
        return {
            userAgent: navigator.userAgent,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            width: image.naturalWidth,
            height: image.naturalHeight,
            samples
        };
    }, animatedGif.toString("base64"));

    console.log("BLANK PAGE GIF DIAGNOSTIC", JSON.stringify({
        browserName,
        browserVersion: page.context().browser()?.version(),
        ...result
    }));
    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
    expect(new Set(result.samples.map(sample => sample.join(","))).size).toBeGreaterThan(1);
});
