import { test, expect } from "@playwright/test";

const screenshotPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAU0lEQVR4nO3PQQ3AIADAQEANEpGIrIngcVnSU9DOfe74s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaB90JcByOCc2PwAAAAASUVORK5CYII=",
    "base64"
);

test("rebuilds a screenshot crop into a separate editable grid", async ({ page }) => {
    await page.goto("/");

    const originalGridId = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.currentGridId;
    });

    await page.locator("#rebuildFromScreenshotButton").click();
    await expect(page.locator("#screenshotReconstructionModal")).toBeVisible();

    await page.locator("#screenshotReconstructionFile").setInputFiles({
        name: "grid-screenshot.png",
        mimeType: "image/png",
        buffer: screenshotPng
    });

    await expect.poll(() =>
        page.locator("#screenshotReconstructionImage").evaluate(img => img.naturalWidth)
    ).toBeGreaterThan(0);
    await expect(page.locator("#screenshotReconstructionCreateButton")).toBeEnabled();

    await page.locator("#screenshotRows").selectOption("2");
    await page.locator("#screenshotColumns").selectOption("2");
    await page.locator("#screenshotReconstructionCreateButton").click();

    await expect(page.locator("#screenshotReconstructionModal")).toBeHidden();
    await expect(page.locator("#rows")).toHaveValue("2");
    await expect(page.locator("#columns")).toHaveValue("2");
    await expect(page.locator("#board .image")).toHaveCount(4);
    await expect(page.locator("#board .image img")).toHaveCount(4);

    const result = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const { getGridSummaries } = await import("/js/storage/grids.js");
        const grids = await getGridSummaries();
        return {
            id: appState.currentGridId,
            name: appState.currentGridName,
            images: appState.savedImages,
            matchingSavedGrid: grids.some(grid =>
                String(grid.id) === String(appState.currentGridId) &&
                grid.name.startsWith("Screenshot Grid ")
            )
        };
    });

    expect(result.id).not.toBe(originalGridId);
    expect(result.name).toMatch(/^Screenshot Grid /);
    expect(result.images).toHaveLength(4);
    expect(result.images.every(image => image?.source?.startsWith("data:image/png;base64,"))).toBeTruthy();
    expect(result.matchingSavedGrid).toBeTruthy();
});

test("rejects non-image screenshot files without creating a grid", async ({ page }) => {
    await page.goto("/");
    const originalGridId = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.currentGridId;
    });

    await page.locator("#rebuildFromScreenshotButton").click();
    await page.locator("#screenshotReconstructionFile").setInputFiles({
        name: "not-an-image.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("not an image")
    });

    await expect(page.locator("#screenshotReconstructionStatus")).toContainText("valid image");
    await expect(page.locator("#screenshotReconstructionCreateButton")).toBeDisabled();
    await page.locator("#screenshotReconstructionCancelButton").click();
    await expect(page.locator("#screenshotReconstructionModal")).toBeHidden();

    expect(await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.currentGridId;
    })).toBe(originalGridId);
});
