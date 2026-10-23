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



test("rotating non-square crop ratios keeps the crop box on the image", async ({ page }) => {
    await page.goto("/");
    await page.locator("#imageRatio").selectOption("16:9");

    const tile = page.locator('#board .image[data-index="0"]');
    await tile.click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#cde"/><circle cx="80" cy="100" r="45" fill="#f00"/><circle cx="320" cy="100" r="45" fill="#00f"/></svg>');
    await chooser.setFiles({ name: "rotate-ratio-test.svg", mimeType: "image/svg+xml", buffer: svg });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(400);

    const readGeometry = () => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const cropper = appState.cropper;
        const canvas = cropper.getCanvasData();
        const crop = cropper.getCropBoxData();
        const containerElement = document.querySelector(".cropper-container");
        const canvasElement = containerElement?.querySelector(".cropper-canvas");
        const imageElement = canvasElement?.querySelector("img");
        const containerRect = containerElement?.getBoundingClientRect();
        const canvasRect = canvasElement?.getBoundingClientRect();
        const imageRect = imageElement?.getBoundingClientRect();
        return {
            canvas,
            crop,
            viewMode: cropper.options.viewMode,
            ratio: crop.width / crop.height,
            rotation: cropper.getImageData().rotate,
            containerBounds: containerRect && {
                left: containerRect.left,
                top: containerRect.top,
                right: containerRect.right,
                bottom: containerRect.bottom
            },
            canvasBounds: canvasRect && {
                left: canvasRect.left,
                top: canvasRect.top,
                right: canvasRect.right,
                bottom: canvasRect.bottom,
                centerX: (canvasRect.left + canvasRect.right) / 2,
                centerY: (canvasRect.top + canvasRect.bottom) / 2
            },
            imageBounds: imageRect && {
                centerX: (imageRect.left + imageRect.right) / 2,
                centerY: (imageRect.top + imageRect.bottom) / 2,
                left: imageRect.left,
                top: imageRect.top,
                right: imageRect.right,
                bottom: imageRect.bottom
            }
        };
    });

    for (const [button, expectedRotation] of [
        ["#rotateRightButton", 90],
        ["#rotateLeftButton", 0]
    ]) {
        await page.locator(button).click();

        // Wait for CropperJS to apply the rotation and for the fitting callback
        // to finish before checking the rendered image geometry.
        await expect.poll(async () => (await readGeometry()).rotation)
            .toBe(expectedRotation);
        await page.evaluate(() => new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        }));

        const geometry = await readGeometry();
        expect(geometry.ratio).toBeCloseTo(16 / 9, 2);
        expect(geometry.crop.left).toBeGreaterThanOrEqual(geometry.canvas.left - 1);
        expect(geometry.crop.top).toBeGreaterThanOrEqual(geometry.canvas.top - 1);
        expect(geometry.crop.left + geometry.crop.width)
            .toBeLessThanOrEqual(geometry.canvas.left + geometry.canvas.width + 1);
        expect(geometry.crop.top + geometry.crop.height)
            .toBeLessThanOrEqual(geometry.canvas.top + geometry.canvas.height + 1);

        // A rotated image's transformed bounding rectangle can extend beyond
        // the frame even when correctly clipped by CropperJS. What matters for
        // the reported sideways shift is that its visual center stays aligned
        // with the canvas that clips it.
        expect(geometry.imageBounds).not.toBeNull();
        expect(geometry.canvasBounds).not.toBeNull();
        expect(geometry.canvasBounds.centerX)
            .toBeCloseTo(
                (geometry.containerBounds.left + geometry.containerBounds.right) / 2,
                0
            );
        expect(geometry.canvasBounds.centerY)
            .toBeCloseTo(
                (geometry.containerBounds.top + geometry.containerBounds.bottom) / 2,
                0
            );
    }

    await page.locator("#cancelButton").click();
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

    // Record style mutations to catch a hidden -> visible modal flash during toggle.
    await page.evaluate(() => {
        window.cropperModalStyleMutations = [];
        const modal = document.querySelector("#cropModal");
        new MutationObserver(records => {
            window.cropperModalStyleMutations.push(...records.map(record => ({
                oldValue: record.oldValue || "",
                currentValue: modal.getAttribute("style") || ""
            })));
        }).observe(modal, { attributes: true, attributeFilter: ["style"], attributeOldValue: true });
    });

    await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        window.cropperInstanceBeforeOutsideToggle = appState.cropper;
    });

    await outsideImageToggle.check();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.cropper === window.cropperInstanceBeforeOutsideToggle;
    })).toBe(true);
    await expect.poll(() => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.cropper?.getCropBoxData()?.width ?? 0;
    })).toBeGreaterThan(0);
    const modalMutations = await page.evaluate(() => window.cropperModalStyleMutations);
    expect(
        modalMutations.some(mutation => /visibility\s*:\s*hidden/.test(mutation.oldValue)),
        JSON.stringify(modalMutations)
    ).toBe(false);

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
    await expect.poll(() => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.cropper === window.cropperInstanceBeforeOutsideToggle;
    })).toBe(true);
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
