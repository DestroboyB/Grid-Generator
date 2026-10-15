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

test("rapid saves stay attached to their original grid when switching grids", async ({ page }) => {
    await waitForApp(page);

    const originalGridId = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const getAll = transaction.objectStore("grids").getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        });

        db.close();
        return records[0]?.id;
    });

    expect(originalGridId).toBeTruthy();

    // Trigger several saves close together, then switch to a different grid.
    await page.locator("#rows").selectOption("2");
    await page.locator("#generateBoard").click();
    await page.locator("#columns").selectOption("4");
    await page.locator("#generateBoard").click();
    await page.locator("#imageRatio").selectOption("4:3");

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("Rapid Switch Target");
    await page.locator("#createNewGridButton").click();
    await expect(page.locator("#newGridModal")).not.toHaveClass(/open/);
    await expect(page.locator("#board .image")).toHaveCount(9);

    await expect.poll(async () => page.evaluate(async id => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const getAll = transaction.objectStore("grids").getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        });

        db.close();
        return records.find(grid => grid.id === id) ?? null;
    }, originalGridId)).toMatchObject({
        rows: 2,
        columns: 4,
        ratio: "4:3"
    });

    const grids = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const getAll = transaction.objectStore("grids").getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        });

        db.close();
        return records;
    });

    const originalGrid = grids.find(grid => grid.id === originalGridId);
    const newGrid = grids.find(grid => grid.name === "Rapid Switch Target");

    expect(originalGrid).toMatchObject({
        rows: 2,
        columns: 4,
        ratio: "4:3"
    });
    expect(newGrid).toMatchObject({
        rows: 3,
        columns: 3,
        ratio: "1:1"
    });
});
