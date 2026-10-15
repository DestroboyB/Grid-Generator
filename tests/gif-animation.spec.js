import { test, expect } from "@playwright/test";

// Two real frames: red then blue. A single-frame fixture cannot catch
// animation regressions in the editor or GIF export.
const animatedGif = Buffer.from(
    "R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIMgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAgyAAAALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==",
    "base64"
);

async function waitForApp(page) {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

async function uploadGifToFirstTile(page) {
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "test-animation.gif",
        mimeType: "image/gif",
        buffer: animatedGif
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect(page.locator("#animatedGifToggle")).toBeVisible();
}

async function samplePixel(page, selector = "#animatedGifPreview") {
    return page.locator(selector).evaluate(img => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
    });
}


test("Chromium advances an attached image using the animated GIF fixture", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await waitForApp(page);

    const result = await page.evaluate(async base64 => {
        const image = document.createElement("img");
        image.id = "gifTimelineBaseline";
        Object.assign(image.style, {
            position: "fixed",
            left: "0",
            top: "0",
            width: "64px",
            height: "64px",
            zIndex: "99999"
        });
        document.body.appendChild(image);
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

        const first = sample();
        let second = first;
        for (let attempt = 0; attempt < 20 && second.every((value, index) => value === first[index]); attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            second = sample();
        }
        image.remove();
        return { first, second, width: image.naturalWidth, height: image.naturalHeight };
    }, animatedGif.toString("base64"));

    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
    expect(result.second).not.toEqual(result.first);
});

test("GIF animation defaults on, while the normal crop editor remains usable", async ({ page }) => {
    await waitForApp(page);
    await uploadGifToFirstTile(page);

    const toggle = page.locator("#animatedGifToggle");
    await expect(toggle).toBeChecked();
    await expect(page.locator("#cropModal .editor-preview .cropper-container")).toBeVisible();
    await expect(page.locator("#cropModal .cropper-crop-box")).toBeVisible();
    await expect(page.locator("#animatedGifPreview")).toBeVisible();

    const firstFrame = await samplePixel(page);
    await expect.poll(async () => samplePixel(page), { timeout: 4000, intervals: [150, 250, 400] }).not.toEqual(firstFrame);

    await toggle.uncheck();
    const frozenSource = await page.locator("#cropModal .cropper-canvas img:not(#animatedGifPreview)").getAttribute("src");
    expect(frozenSource).toMatch(/^data:image\/png/);
    const frozenSelector = '#cropModal .cropper-canvas img:not(#animatedGifPreview)';
    const frozenFrame = await samplePixel(page, frozenSelector);
    await page.waitForTimeout(650);
    expect(await samplePixel(page, frozenSelector)).toEqual(frozenFrame);

    await toggle.check();
    await expect(page.locator("#cropModal .cropper-canvas img")).toHaveAttribute("src", /data:image\/gif/);
    await expect(page.locator("#cropModal .cropper-crop-box")).toBeVisible();
});

test("GIF download option is hidden until an animated GIF is on the board and export is animated", async ({ page }) => {
    await waitForApp(page);
    await page.locator("#downloadButton").click();
    await expect(page.locator("#downloadGifButton")).toBeHidden();
    await page.locator("#downloadButton").click();

    await uploadGifToFirstTile(page);
    await expect(page.locator("#animatedGifToggle")).toBeChecked();
    await page.locator("#cropButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    await page.locator("#downloadButton").click();
    await expect(page.locator("#downloadGifButton")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#downloadGifButton").click({ timeout: 30000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("grid-board.gif");

    const downloadPath = await download.path();
    const fs = await import("node:fs/promises");
    const exported = await fs.readFile(downloadPath);
    expect(exported.subarray(0, 6).toString()).toMatch(/^GIF8[79]a$/);
    expect(exported.length).toBeGreaterThan(100);

    // Decode the exported GIF in Chromium and compare rendered pixels over
    // time. Keep the test image visible and explicitly disable reduced-motion
    // emulation so browser animation policy does not freeze the fixture.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const firstCell = await page.locator('#board .image[data-index="0"]').boundingBox();
    const boardBox = await page.locator("#board").boundingBox();
    expect(firstCell).not.toBeNull();
    expect(boardBox).not.toBeNull();
    const sampleX = Math.round(firstCell.x - boardBox.x + firstCell.width / 2);
    const sampleY = Math.round(firstCell.y - boardBox.y + firstCell.height / 2);

    const renderedFrames = await page.evaluate(async ({ base64, sampleX, sampleY }) => {
        const image = new Image();
        Object.assign(image.style, {
            position: "fixed",
            left: "0",
            top: "0",
            width: "32px",
            height: "32px",
            zIndex: "99999",
            pointerEvents: "none"
        });
        // Keep the image in the document: Chromium may not advance animated
        // GIFs whose Image object is detached from the DOM.
        document.body.appendChild(image);
        image.src = `data:image/gif;base64,${base64}`;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        const sample = () => {
            context.drawImage(image, 0, 0);
            return Array.from(context.getImageData(sampleX, sampleY, 1, 1).data);
        };

        const first = sample();
        let second = first;
        for (let attempt = 0; attempt < 20 && second.every((value, index) => value === first[index]); attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            second = sample();
        }
        image.remove();
        return { first, second, width: image.naturalWidth, height: image.naturalHeight };
    }, { base64: exported.toString("base64"), sampleX, sampleY });

    expect(renderedFrames.width).toBeGreaterThan(25);
    expect(renderedFrames.height).toBeGreaterThan(25);
    expect(renderedFrames.second).not.toEqual(renderedFrames.first);
});

test("a GIF saved as a still frame can be switched back to animation when reopened", async ({ page }) => {
    await waitForApp(page);
    await uploadGifToFirstTile(page);

    const toggle = page.locator("#animatedGifToggle");
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await page.locator("#cropButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
    await expect(page.locator("#cropModal .cropper-crop-box")).toBeVisible();
});
