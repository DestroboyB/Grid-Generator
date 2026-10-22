import { test, expect } from "@playwright/test";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

const replacementPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    "base64"
);

async function uploadFile(page, buttonSelector, name, buffer) {
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator(buttonSelector).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name, mimeType: "image/png", buffer });
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();
}

test("image can be added, replaced, and deleted", async ({ page }) => {
    await page.goto("/");
    const tile = page.locator('#board .image[data-index="0"]');
    await expect(tile).toBeVisible();

    await tile.click();
    await page.locator("#openImageSourceMenuButton").click();
    await uploadFile(page, "#uploadImageButton", "original.png", tinyPng);
    await expect(tile.locator("img")).toHaveCount(1);
    const originalSrc = await tile.locator("img").getAttribute("src");

    await tile.click();
    await page.locator("#replaceImageButton").click();
    await uploadFile(page, "#replaceUploadImageButton", "replacement.png", replacementPng);
    await expect(tile.locator("img")).toHaveCount(1);
    const replacementSrc = await tile.locator("img").getAttribute("src");
    expect(replacementSrc).not.toBe(originalSrc);

    await tile.click();
    await expect(page.locator("#deleteImageButton")).toBeVisible();
    await page.locator("#deleteImageButton").click();
    await expect(tile.locator("img")).toHaveCount(0);
});

test("reopening an image uses the current board ratio", async ({ page }) => {
    await page.goto("/");
    const tile = page.locator('#board .image[data-index="0"]');

    // Add an image while the board is square, then change the board shape.
    await tile.click();
    await page.locator("#openImageSourceMenuButton").click();
    await uploadFile(page, "#uploadImageButton", "ratio-test.png", tinyPng);

    await page.locator("#imageRatio").selectOption("16:9");
    await expect(tile.locator("img")).toHaveCount(1);

    // Reopen the image's editor after the ratio change.
    await tile.click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(async () => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const crop = appState.cropper.getData();
        return crop.width / crop.height;
    })).toBeCloseTo(16 / 9, 1);
});



test("crop editor supports precise movement and optionally allows cropping outside the image", async ({ page }) => {
    await page.goto("/");
    const tile = page.locator('#board .image[data-index="0"]');
    await tile.click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#cde"/></svg>');
    await chooser.setFiles({ name: "crop-adjust.svg", mimeType: "image/svg+xml", buffer: svg });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(400);
    await expect.poll(() => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.cropper.getCropBoxData().width;
    })).toBeGreaterThan(0);

    const readCropBox = () => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return {
            ...appState.cropper.getCropBoxData(),
            viewMode: appState.cropper.options.viewMode
        };
    });

    // Leave room on every side so the test checks movement, not a valid boundary stop.
    await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        appState.cropper.setCropBoxData({ left: 100, top: 25, width: 100, height: 100 });
    });

    const initial = await readCropBox();
    expect(initial.viewMode).toBe(1);

    await page.locator("#cropNudgeUp").click();
    const afterButton = await readCropBox();
    expect(afterButton.left).toBeCloseTo(initial.left, 0);
    expect(afterButton.top).toBeCloseTo(initial.top - 1, 0);

    await page.keyboard.press("ArrowRight");
    const afterKey = await readCropBox();
    expect(afterKey.left).toBeCloseTo(afterButton.left + 1, 0);
    expect(afterKey.top).toBeCloseTo(afterButton.top, 0);

    await page.keyboard.press("Shift+ArrowDown");
    const afterShift = await readCropBox();
    expect(afterShift.top).toBeCloseTo(afterKey.top + 10, 0);

    const outsideImageToggle = page.locator("#cropOutsideImageToggle");
    await expect(outsideImageToggle).not.toBeChecked();
    await outsideImageToggle.check();

    const outsideCrop = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const canvas = appState.cropper.getCanvasData();
        appState.cropper.setCropBoxData({
            left: canvas.left - 20,
            top: canvas.top + 10,
            width: 100,
            height: 100
        });
        return {
            viewMode: appState.cropper.options.viewMode,
            crop: appState.cropper.getCropBoxData(),
            canvas
        };
    });
    expect(outsideCrop.viewMode).toBe(0);
    expect(outsideCrop.crop.left).toBeLessThan(outsideCrop.canvas.left);

    await outsideImageToggle.uncheck();
    const constrainedCrop = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return {
            viewMode: appState.cropper.options.viewMode,
            crop: appState.cropper.getCropBoxData(),
            canvas: appState.cropper.getCanvasData()
        };
    });
    expect(constrainedCrop.viewMode).toBe(1);
    expect(constrainedCrop.crop.left).toBeGreaterThanOrEqual(constrainedCrop.canvas.left - 1);

    await page.locator("#cancelButton").click();
});
