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
