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

    // Count image-descriptor blocks while skipping data sub-blocks. This
    // verifies the output contains multiple frames, not merely a GIF header.
    let offset = 13;
    const packed = exported[10];
    if (packed & 0x80) offset += 3 * (2 ** ((packed & 0x07) + 1));
    let frameCount = 0;
    const framePayloads = [];
    while (offset < exported.length) {
        const marker = exported[offset++];
        if (marker === 0x3B) break; // trailer
        if (marker === 0x21) {
            offset++; // extension label
            while (offset < exported.length) {
                const size = exported[offset++];
                if (size === 0) break;
                offset += size;
            }
        } else if (marker === 0x2C) {
            frameCount++;
            offset += 8; // left, top, width, height
            const imagePacked = exported[offset++];
            if (imagePacked & 0x80) offset += 3 * (2 ** ((imagePacked & 0x07) + 1));
            offset++; // LZW minimum code size
            const payload = [];
            while (offset < exported.length) {
                const size = exported[offset++];
                if (size === 0) break;
                payload.push(exported.subarray(offset, offset + size));
                offset += size;
            }
            framePayloads.push(Buffer.concat(payload).toString("hex"));
        } else {
            break;
        }
    }
    expect(frameCount).toBeGreaterThan(1);
    expect(new Set(framePayloads).size).toBeGreaterThan(1);
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
