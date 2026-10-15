import { test, expect } from "@playwright/test";

async function waitForApp(page, width = 375, height = 812) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

// Generate a real, decoded high-resolution image in Chromium so this test
// exercises image decoding and Cropper without committing a large fixture.
async function makeLargePng(page) {
    const dataUrl = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 2048;
        canvas.height = 2048;

        const context = canvas.getContext("2d");
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#244a80");
        gradient.addColorStop(0.5, "#e6a34a");
        gradient.addColorStop(1, "#3b805e");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add detail so this is not just a tiny, trivially-compressible image.
        for (let y = 0; y < canvas.height; y += 32) {
            context.fillStyle = `rgba(255,255,255,${(y % 64) / 128})`;
            context.fillRect(0, y, canvas.width, 12);
        }

        return canvas.toDataURL("image/png");
    });

    return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function importImageIntoFirstTile(page, buffer) {
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;

    await chooser.setFiles({
        name: "stress-image-2048.png",
        mimeType: "image/png",
        buffer
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(
        () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
    ).toBe(2048);

    await page.locator("#cropButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
}

test("stress: maximum 10x10 board remains responsive through repeated layout changes", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);

    await page.locator("#rows").selectOption("10");
    await page.locator("#columns").selectOption("10");
    await page.locator("#generateBoard").click();
    await expect(page.locator("#board .image")).toHaveCount(100);

    const ratios = ["4:3", "3:2", "16:9", "3:4", "2:3", "9:16", "1:1"];
    for (let i = 0; i < 21; i++) {
        await page.locator("#imageRatio").selectOption(ratios[i % ratios.length]);
        await expect(page.locator("#board .image")).toHaveCount(100);
    }

    await page.reload();
    await expect(page.locator("#board .image")).toHaveCount(100);
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    expect(pageErrors, "Unexpected uncaught browser errors during maximum-grid stress test").toEqual([]);
});

test("stress: high-resolution image survives editing, repeated changes, and reload", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);
    const largePng = await makeLargePng(page);
    await importImageIntoFirstTile(page, largePng);

    const ratios = ["4:3", "3:2", "16:9", "3:4", "2:3", "9:16", "1:1"];
    for (let i = 0; i < 14; i++) {
        await page.locator("#imageRatio").selectOption(ratios[i % ratios.length]);
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }

    await page.reload();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await expect.poll(
        () => page.locator('#board .image[data-index="0"] img').evaluate(image => image.complete && image.naturalWidth > 0)
    ).toBe(true);

    expect(pageErrors, "Unexpected uncaught browser errors during high-resolution image stress test").toEqual([]);
});


test("stress: repeated high-resolution editor open and cancel cleans up Cropper DOM", async ({ page }) => {
    test.setTimeout(120000);

    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);
    const largePng = await makeLargePng(page);
    const memorySamples = [];

    for (let i = 0; i < 8; i++) {
        await page.locator('#board .image[data-index="0"]').click();
        await page.locator("#openImageSourceMenuButton").click();

        const chooserPromise = page.waitForEvent("filechooser");
        await page.locator("#uploadImageButton").click();
        const chooser = await chooserPromise;
        await chooser.setFiles({
            name: `editor-cycle-${i}.png`,
            mimeType: "image/png",
            buffer: largePng
        });

        await expect(page.locator("#cropModal")).toBeVisible();
        await expect.poll(
            () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
        ).toBe(2048);

        await page.locator("#cancelButton").click();
        await expect(page.locator("#cropModal")).toBeHidden();
        await expect(page.locator(".cropper-container")).toHaveCount(0);
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(0);

        const sample = await page.evaluate(() => {
            const memory = performance.memory;
            return {
                cropperContainers: document.querySelectorAll(".cropper-container").length,
                imageEditorSourceCleared: !document.querySelector("#cropImage").getAttribute("src"),
                heapUsed: memory?.usedJSHeapSize ?? null,
                heapLimit: memory?.jsHeapSizeLimit ?? null
            };
        });
        memorySamples.push(sample);
    }

    expect(memorySamples.every(sample => sample.cropperContainers === 0)).toBe(true);
    expect(memorySamples.every(sample => sample.imageEditorSourceCleared)).toBe(true);
    expect(pageErrors, "Unexpected uncaught browser errors during repeated editor lifecycle test").toEqual([]);

    // Chromium exposes this non-standard metric in some configurations only.
    // Record it for CI diagnostics when available; don't assert on noisy heap values.
    if (memorySamples.some(sample => sample.heapUsed !== null)) {
        console.log("Editor lifecycle heap samples (bytes):", memorySamples.map(sample => sample.heapUsed));
    }
});
