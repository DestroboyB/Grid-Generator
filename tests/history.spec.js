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

test("history is capped at 30 states and remains usable after reload", async ({ page }) => {
    await waitForApp(page);

    // Each ratio change creates a distinct history state. Cycle through
    // valid options to create more edits than the 30-state retention limit.
    const ratios = ["4:3", "3:2", "16:9", "3:4", "2:3", "9:16", "1:1"];
    for (let i = 0; i < 36; i++) {
        await page.locator("#imageRatio").selectOption(ratios[i % ratios.length]);
        await expect(page.locator("#undoButton")).toBeEnabled();
    }

    const historyBeforeReload = await page.evaluate(async () => {
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
        return records[0];
    });

    expect(historyBeforeReload.undoStack).toHaveLength(30);
    expect(historyBeforeReload.redoStack).toHaveLength(0);

    await page.reload();
    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect(page.locator("#redoButton")).toBeDisabled();

    // Undo until the oldest retained state. It should stop at the cap,
    // not continue to the original state from before the retained window.
    for (let i = 0; i < 29; i++) {
        await page.locator("#undoButton").click();
    }
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#redoButton")).toBeEnabled();

    const oldestRetainedRatio = await page.locator("#imageRatio").inputValue();
    // The disabled Undo button and unchanged ratio confirm the retained boundary.
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#imageRatio")).toHaveValue(oldestRetainedRatio);

    // Redo several states and verify that a new edit clears the redo stack.
    for (let i = 0; i < 5; i++) {
        await page.locator("#redoButton").click();
    }
    await expect(page.locator("#redoButton")).toBeEnabled();

    const currentRatio = await page.locator("#imageRatio").inputValue();
    const nextRatio = ratios.find(ratio => ratio !== currentRatio);
    await page.locator("#imageRatio").selectOption(nextRatio);
    await expect(page.locator("#redoButton")).toBeDisabled();
});

test("a failed IndexedDB save is reported and a later save succeeds", async ({ page }) => {
    await page.addInitScript(() => {
        const originalPut = IDBObjectStore.prototype.put;
        window.__failNextGridSave = false;

        IDBObjectStore.prototype.put = function (...args) {
            const request = originalPut.apply(this, args);
            if (window.__failNextGridSave && this.transaction.mode === "readwrite") {
                window.__failNextGridSave = false;
                queueMicrotask(() => {
                    try {
                        this.transaction.abort();
                    } catch {
                        // The transaction may already have completed.
                    }
                });
            }
            return request;
        };
    });

    await waitForApp(page);
    await page.evaluate(() => {
        window.__failNextGridSave = true;
    });

    await page.locator("#imageRatio").selectOption("4:3");
    await expect(page.locator("#gridSaveStatus")).toBeVisible();
    await expect(page.locator("#gridSaveStatus")).toContainText("Couldn't save");

    // The queue must continue after the first failed transaction.
    await page.locator("#imageRatio").selectOption("3:2");
    await expect(page.locator("#gridSaveStatus")).toBeHidden();

    await page.reload();
    await expect(page.locator("#imageRatio")).toHaveValue("3:2");
    await expect(page.locator("#gridSaveStatus")).toBeHidden();
});

test("a queued save cannot recreate a grid deleted before its write", async ({ page }) => {
    await waitForApp(page);

    const gridId = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const read = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const getAll = read.objectStore("grids").getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        });
        const id = grids[0]?.id;

        // Hold a read/write transaction open. The app's read for the pending
        // save and the UI's delete will queue behind it in a deterministic order.
        const blocker = db.transaction("grids", "readwrite");
        const store = blocker.objectStore("grids");
        window.__releaseGridWriteBlocker = false;
        window.__gridWriteBlockerStarted = true;
        const keepAlive = () => {
            if (window.__releaseGridWriteBlocker) return;
            const next = store.getAll();
            next.onsuccess = keepAlive;
        };
        const first = store.getAll();
        first.onsuccess = keepAlive;
        window.__releaseGridWriteBlockerFn = () => {
            window.__releaseGridWriteBlocker = true;
        };

        return id;
    });
    expect(gridId).toBeTruthy();

    // The save's read is queued before deletion; its eventual write must
    // re-check that the record still exists rather than resurrecting it.
    await page.locator("#imageRatio").selectOption("4:3");

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const gridRow = page.locator(`.library-grid[data-grid-id="${gridId}"]`);
    await gridRow.locator('button[title="Delete this grid"]').click();

    await page.evaluate(() => window.__releaseGridWriteBlockerFn());

    await expect.poll(async () => page.evaluate(id => new Promise((resolve, reject) => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("grids", "readonly");
            const get = tx.objectStore("grids").get(id);
            get.onsuccess = () => {
                resolve(get.result ?? null);
                db.close();
            };
            get.onerror = () => reject(get.error);
        };
    }), gridId)).toBeNull();
});
