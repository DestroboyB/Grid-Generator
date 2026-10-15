import { test, expect } from "@playwright/test";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

async function waitForApp(page, width = 375, height = 812) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

test("mobile layouts do not create horizontal page overflow", async ({ page }) => {
    for (const viewport of [
        { width: 320, height: 720 },
        { width: 375, height: 812 },
        { width: 390, height: 844 },
        { width: 430, height: 932 },
        { width: 768, height: 1024 }
    ]) {
        await waitForApp(page, viewport.width, viewport.height);

        const dimensions = await page.evaluate(() => ({
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth
        }));

        expect(
            dimensions.document,
            `Horizontal overflow at ${viewport.width}px: ${JSON.stringify(dimensions)}`
        ).toBeLessThanOrEqual(viewport.width);
        expect(dimensions.body).toBeLessThanOrEqual(viewport.width);
    }
});

test("mobile board settings and saved-grid drawer are usable", async ({ page }) => {
    await waitForApp(page);

    const settingsButton = page.locator("#boardSettingsButton");
    const settingsPanel = page.locator("#boardSettingsPanel");

    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    await expect(settingsPanel).toHaveClass(/open/);
    await expect(page.locator("#spacing")).toBeVisible();

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await expect(page.locator("#libraryPanel")).toBeVisible();
    await expect(page.locator("#librarySearchInput")).toBeVisible();
    await expect(page.locator("#newGridButton")).toBeVisible();

    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);
});

test("image editor tabs and controls remain usable on a phone-sized viewport", async ({ page }) => {
    await waitForApp(page, 375, 812);

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "mobile-test.png",
        mimeType: "image/png",
        buffer: tinyPng
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

    for (const tool of ["transform", "adjust", "filters"]) {
        const button = page.locator(`.editor-tool[data-tool="${tool}"]`);
        await expect(button).toBeVisible();
        await button.click();
        await expect(button).toHaveClass(/active/);
        await expect(page.locator(`.editor-panel[data-panel="${tool}"]`)).toHaveClass(/active/);
    }

    await expect(page.locator("#cropButton")).toBeVisible();
    await expect(page.locator("#restoreOriginalButton")).toBeVisible();
});
