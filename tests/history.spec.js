import { test, expect } from "@playwright/test";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

async function waitForApp(page) {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#redoButton")).toBeDisabled();
}

async function addImageToFirstTile(page) {
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "test-image.png",
        mimeType: "image/png",
        buffer: tinyPng
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
}

test("new board starts with Undo and Redo disabled", async ({ page }) => {
    await waitForApp(page);
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#redoButton")).toBeDisabled();
});

test("grid size changes can be undone and redone", async ({ page }) => {
    await waitForApp(page);

    await page.locator("#rows").selectOption("2");
    await page.locator("#generateBoard").click();

    await expect(page.locator("#board .image")).toHaveCount(6);
    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect(page.locator("#redoButton")).toBeDisabled();

    await page.locator("#undoButton").click();
    await expect(page.locator("#board .image")).toHaveCount(9);
    await expect(page.locator("#redoButton")).toBeEnabled();

    await page.locator("#redoButton").click();
    await expect(page.locator("#board .image")).toHaveCount(6);
    await expect(page.locator("#redoButton")).toBeDisabled();
});

test("adding an image, undo, redo, and a new edit update history correctly", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect(page.locator("#redoButton")).toBeDisabled();

    await page.locator("#undoButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(0);
    await expect(page.locator("#redoButton")).toBeEnabled();

    await page.locator("#redoButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    await page.locator("#undoButton").click();
    await expect(page.locator("#redoButton")).toBeEnabled();

    await page.locator("#imageRatio").selectOption("4:3");

    await expect(page.locator("#redoButton")).toBeDisabled();
});

test("Clear Board can be undone and redone", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    await page.locator("#clearBoardButton").click();
    await expect(page.locator("#board .image img")).toHaveCount(0);

    await page.locator("#undoButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    await page.locator("#redoButton").click();
    await expect(page.locator("#board .image img")).toHaveCount(0);
});

test("board and undo/redo state persist after reload", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);
    await page.locator("#undoButton").click();

    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(0);
    await expect(page.locator("#redoButton")).toBeEnabled();

    await page.reload();
    await expect(page.locator("#board .image")).toHaveCount(9);
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(0);
    await expect(page.locator("#redoButton")).toBeEnabled();

    await page.locator("#redoButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
});
