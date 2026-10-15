import { test, expect } from "@playwright/test";

async function waitForApp(page, width = 375, height = 812) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

// Generate a real, decoded high-resolution image in Chromium so this test
// exercises image decoding and Cropper without committing a large fixture.
async function makeLargePng(page, size = 2048) {
    const dataUrl = await page.evaluate((size) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

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
    }, size);

    return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function importImageIntoFirstTile(page, buffer, expectedWidth = 2048) {
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;

    await chooser.setFiles({
        name: `stress-image-${expectedWidth}.png`,
        mimeType: "image/png",
        buffer
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(
        () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
    ).toBe(expectedWidth);

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

test("stress: repeated high-resolution edits remain usable with bounded Undo/Redo history", async ({ page }) => {
    test.setTimeout(180000);

    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);
    // Keep this test focused on history behavior. The separate high-resolution
    // tests cover 2048px images; ten full-resolution snapshots can exceed the
    // browser test environment's IndexedDB budget and mask Undo/Redo behavior.
    const largePng = await makeLargePng(page, 512);
    await importImageIntoFirstTile(page, largePng, 512);

    // Each applied edit creates a history snapshot containing image data.
    // Ten edits exercise the history cap without making CI needlessly slow.
    for (let i = 0; i < 10; i++) {
        await page.locator('#board .image[data-index="0"]').click();
        await expect(page.locator("#imageMenu")).toBeVisible();
        await page.locator("#updateImageButton").click();
        await expect(page.locator("#cropModal")).toBeVisible();
        await expect.poll(
            () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
        ).toBe(512);

        await page.locator("#rotateRightButton").click();
        await page.locator("#cropButton").click();
        await expect(page.locator("#cropModal")).toBeHidden();
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }

    await expect(page.locator("#undoButton")).toBeEnabled();
    for (let i = 0; i < 9; i++) {
        await page.locator("#undoButton").click();
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#redoButton")).toBeEnabled();

    for (let i = 0; i < 9; i++) {
        await page.locator("#redoButton").click();
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }
    await expect(page.locator("#redoButton")).toBeDisabled();

    await page.reload();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await expect.poll(
        () => page.locator('#board .image[data-index="0"] img').evaluate(image => image.complete && image.naturalWidth > 0)
    ).toBe(true);

    expect(pageErrors, "Unexpected uncaught browser errors during repeated image edit/history stress test").toEqual([]);
});

test("history trimming: enforces count and size limits while retaining two states", async ({ page }) => {
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const { trimHistoryStack } = await import("/js/history.js");

        const countLimited = Array.from({ length: 12 }, (_, index) => ({
            marker: index,
            images: []
        }));
        trimHistoryStack(countLimited, 10, Number.POSITIVE_INFINITY);

        const sizeLimited = [
            { marker: "oldest", payload: "x".repeat(40) },
            { marker: "middle", payload: "y".repeat(40) },
            { marker: "recent", payload: "z".repeat(40) }
        ];
        trimHistoryStack(sizeLimited, 10, 160);

        const oversizedTwoState = [
            { marker: "previous", payload: "a".repeat(120) },
            { marker: "current", payload: "b".repeat(120) }
        ];
        trimHistoryStack(oversizedTwoState, 10, 10);

        // Setting-only edits should share identical image payloads and budget
        // them once, rather than being reduced to only two undo states.
        const sharedImages = [{ source: "data:image/png;base64," + "x".repeat(100) }];
        const repeatedImageStates = [
            { marker: "before", ratio: "1:1", images: structuredClone(sharedImages) },
            { marker: "middle", ratio: "4:3", images: structuredClone(sharedImages) },
            { marker: "current", ratio: "16:9", images: structuredClone(sharedImages) }
        ];
        trimHistoryStack(repeatedImageStates, 10, 300);

        return {
            count: countLimited.length,
            firstCountMarker: countLimited[0].marker,
            lastCountMarker: countLimited.at(-1).marker,
            sizeMarkers: sizeLimited.map(state => state.marker),
            retainedTwoStateCount: oversizedTwoState.length,
            retainedTwoStateMarkers: oversizedTwoState.map(state => state.marker),
            repeatedImageMarkers: repeatedImageStates.map(state => state.marker),
            sharedImageReferences: repeatedImageStates[0].images === repeatedImageStates[1].images &&
                repeatedImageStates[1].images === repeatedImageStates[2].images
        };
    });

    expect(result.count).toBe(10);
    expect(result.firstCountMarker).toBe(2);
    expect(result.lastCountMarker).toBe(11);
    expect(result.sizeMarkers).toEqual(["middle", "recent"]);
    expect(result.retainedTwoStateCount).toBe(2);
    expect(result.retainedTwoStateMarkers).toEqual(["previous", "current"]);
    expect(result.repeatedImageMarkers).toEqual(["before", "middle", "current"]);
    expect(result.sharedImageReferences).toBe(true);
});

