import { test, expect } from "@playwright/test";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

const replacementPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    "base64"
);

async function uploadImageToFirstTile(page, name, buffer) {
    const tile = page.locator('#board .image[data-index="0"]');
    await tile.click();

    const hasImage = await tile.locator("img").count();
    if (!hasImage) {
        await page.locator("#openImageSourceMenuButton").click();
        const chooserPromise = page.waitForEvent("filechooser");
        await page.locator("#uploadImageButton").click();
        const chooser = await chooserPromise;
        await chooser.setFiles({ name, mimeType: "image/png", buffer });
    } else {
        await page.locator("#replaceImageButton").click();
        await page.locator("#replaceUploadImageButton").click();
        const chooserPromise = page.waitForEvent("filechooser");
        await page.locator("#uploadImageButton").click();
        const chooser = await chooserPromise;
        await chooser.setFiles({ name, mimeType: "image/png", buffer });
    }

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();
    await expect(tile.locator("img")).toHaveCount(1);
}

test("image can be added, replaced, and deleted", async ({ page }) => {
    await page.goto("/");
    const tile = page.locator('#board .image[data-index="0"]');
    await expect(tile).toBeVisible();

    await uploadImageToFirstTile(page, "original.png", tinyPng);
    const originalSrc = await tile.locator("img").getAttribute("src");

    await tile.click();
    await expect(page.locator("#replaceImageButton")).toBeVisible();
    await uploadImageToFirstTile(page, "replacement.png", replacementPng);
    const replacementSrc = await tile.locator("img").getAttribute("src");
    expect(replacementSrc).not.toBe(originalSrc);

    await tile.click();
    await expect(page.locator("#deleteImageButton")).toBeVisible();
    await page.locator("#deleteImageButton").click();
    await expect(tile.locator("img")).toHaveCount(0);
});
