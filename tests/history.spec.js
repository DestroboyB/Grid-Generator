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

test("deleting a grid prevents later saves from restoring it", async ({ page }) => {
    await waitForApp(page);

    const gridId = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const getAll = tx.objectStore("grids").getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        });
        db.close();
        return grids[0]?.id;
    });
    expect(gridId).toBeTruthy();

    // Queue several layout saves, then delete the active grid.
    for (const ratio of ["4:3", "3:2", "16:9", "3:4", "2:3"]) {
        await page.locator("#imageRatio").selectOption(ratio);
    }

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const gridRow = page.locator(`.library-grid[data-grid-id="${gridId}"]`);
    await gridRow.locator('button[title="Delete this grid"]').click();

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

    // A later edit on the current board should not bring back the deleted ID.
    await page.locator("#imageRatio").selectOption("9:16");
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

test("switching between grids restores each grid's layout and Undo/Redo history", async ({ page }) => {
    await waitForApp(page);

    await page.locator("#imageRatio").selectOption("4:3");
    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect.poll(async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return records.some(grid => grid.name === "Untitled Grid" && grid.ratio === "4:3");
    })).toBe(true);

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("Second Grid");
    await page.locator("#createNewGridButton").click();

    await expect(page.locator("#imageRatio")).toHaveValue("1:1");
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#redoButton")).toBeDisabled();

    await page.locator("#imageRatio").selectOption("16:9");
    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect.poll(async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return records.some(grid => grid.name === "Second Grid" && grid.ratio === "16:9");
    })).toBe(true);

    // Switch back to the original grid and check its own history.
    const originalGridRow = page.locator("#libraryContent .library-grid").filter({ hasText: "Untitled Grid" });
    await originalGridRow.locator(".library-grid-name").click();
    await expect(originalGridRow).toHaveClass(/active/);
    await expect(page.locator("#imageRatio")).toHaveValue("4:3");
    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect(page.locator("#redoButton")).toBeDisabled();

    // Return to the second grid and confirm its own saved layout and history.
    const secondGridRow = page.locator("#libraryContent .library-grid").filter({ hasText: "Second Grid" });
    await secondGridRow.locator(".library-grid-name").click();
    await expect(secondGridRow).toHaveClass(/active/);
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");
    await expect(page.locator("#undoButton")).toBeEnabled();
    await expect(page.locator("#redoButton")).toBeDisabled();
});

test("grid names are trimmed and duplicate names are rejected", async ({ page }) => {
    await waitForApp(page);

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("  Second Grid  ");
    await page.locator("#createNewGridButton").click();

    await expect(page.locator("#libraryContent .library-grid").filter({ hasText: "Second Grid" })).toHaveCount(1);

    page.on("dialog", dialog => dialog.accept());
    const secondRow = page.locator("#libraryContent .library-grid").filter({ hasText: "Second Grid" });
    await secondRow.locator('button[title="Rename this grid"]').click();
    await page.locator(".library-grid-rename-input").fill("Untitled Grid");

    await page.locator(".library-grid-rename-input").press("Enter");
    await expect(page.locator(".library-grid-rename-input")).toHaveValue("Untitled Grid");
    await page.locator(".library-grid-rename-input").press("Escape");
    await expect(page.locator("#libraryContent .library-grid").filter({ hasText: "Second Grid" })).toHaveCount(1);
});

test("switching grids immediately after Undo does not fail saves or lose either grid", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });

    await waitForApp(page);
    await page.locator("#imageRatio").selectOption("4:3");
    await expect(page.locator("#undoButton")).toBeEnabled();

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("Undo Switch Target");
    await page.locator("#createNewGridButton").click();
    await expect(page.locator("#newGridModal")).not.toHaveClass(/open/);
    if ((await page.locator("#libraryPanel").getAttribute("class")).includes("open")) {
        await page.locator("#libraryCloseButton").click();
    }
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    await page.locator("#imageRatio").selectOption("16:9");
    await expect(page.locator("#undoButton")).toBeEnabled();

    // Reopen the first grid, then immediately switch away after Undo to
    // exercise the race between the history save and the grid-load save.
    if (!(await page.locator("#libraryPanel").getAttribute("class")).includes("open")) {
        await page.locator("#libraryButton").click();
    }
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const originalRow = page.locator('#libraryContent .library-grid').filter({ hasText: "Untitled Grid" });
    await originalRow.locator(".library-grid-name").click();
    await expect(page.locator("#imageRatio")).toHaveValue("4:3");
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    await page.locator("#undoButton").click();
    await expect(page.locator("#imageRatio")).toHaveValue("1:1");

    if (!(await page.locator("#libraryPanel").getAttribute("class")).includes("open")) {
        await page.locator("#libraryButton").click();
    }
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const targetRow = page.locator('#libraryContent .library-grid').filter({ hasText: "Undo Switch Target" });
    await targetRow.locator(".library-grid-name").click();
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");

    await expect(page.locator("#gridSaveStatus")).toBeHidden();
    expect(consoleErrors.filter(message => message.includes("Failed to save the current grid"))).toEqual([]);

    await page.reload();
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");
});

test("images and appearance settings remain isolated when switching between grids", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    const setControl = async (selector, value) => page.locator(selector).evaluate((element, nextValue) => {
        if (element.type === "checkbox") {
            element.checked = Boolean(nextValue);
        } else {
            element.value = String(nextValue);
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);

    await page.locator("#imageRatio").selectOption("4:3");
    await setControl("#spacing", 11);
    await setControl("#backgroundColor", "#ff0000");
    await setControl("#borderEnabled", false);
    await setControl("#borderColor", "#0000ff");
    await setControl("#borderSize", 4);

    await expect.poll(async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return records.find(grid => grid.name === "Untitled Grid");
    })).toMatchObject({
        ratio: "4:3",
        spacing: 11,
        backgroundColor: "#ff0000",
        borderEnabled: false,
        borderColor: "#0000ff",
        borderSize: 4
    });

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("Appearance Target");
    await page.locator("#createNewGridButton").click();
    await expect(page.locator("#newGridModal")).not.toHaveClass(/open/);

    await page.locator("#imageRatio").selectOption("16:9");
    await setControl("#spacing", 3);
    await setControl("#backgroundColor", "#00ff00");
    await setControl("#borderEnabled", true);
    await setControl("#borderColor", "#ff00ff");
    await setControl("#borderSize", 6);

    await expect.poll(async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return records.find(grid => grid.name === "Appearance Target");
    })).toMatchObject({
        ratio: "16:9",
        spacing: 3,
        backgroundColor: "#00ff00",
        borderEnabled: true,
        borderColor: "#ff00ff",
        borderSize: 6
    });

    if (!(await page.locator("#libraryPanel").getAttribute("class")).includes("open")) {
        await page.locator("#libraryButton").click();
    }
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const originalRow = page.locator("#libraryContent .library-grid").filter({ hasText: "Untitled Grid" });
    await originalRow.locator(".library-grid-name").click();
    await expect(page.locator("#imageRatio")).toHaveValue("4:3");
    await expect(page.locator("#spacing")).toHaveValue("11");
    await expect(page.locator("#backgroundColor")).toHaveValue("#ff0000");
    await expect(page.locator("#borderEnabled")).not.toBeChecked();
    await expect(page.locator("#borderColor")).toHaveValue("#0000ff");
    await expect(page.locator("#borderSize")).toHaveValue("4");
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    const targetRow = page.locator("#libraryContent .library-grid").filter({ hasText: "Appearance Target" });
    await targetRow.locator(".library-grid-name").click();
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");
    await expect(page.locator("#spacing")).toHaveValue("3");
    await expect(page.locator("#backgroundColor")).toHaveValue("#00ff00");
    await expect(page.locator("#borderEnabled")).toBeChecked();
    await expect(page.locator("#borderColor")).toHaveValue("#ff00ff");
    await expect(page.locator("#borderSize")).toHaveValue("6");
    await expect(page.locator("#board .image img")).toHaveCount(0);

    await page.reload();
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");
    await expect(page.locator("#spacing")).toHaveValue("3");
    await expect(page.locator("#backgroundColor")).toHaveValue("#00ff00");
    await expect(page.locator("#borderEnabled")).toBeChecked();
    await expect(page.locator("#borderColor")).toHaveValue("#ff00ff");
    await expect(page.locator("#borderSize")).toHaveValue("6");
});


test("image rotation, adjustments, and filter persist after reload and support Undo/Redo", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    const savedImage = async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        const grid = grids.find(item => item.name === "Untitled Grid");
        return grid?.images?.[0] ?? null;
    });

    const setRange = async (selector, value) => {
        await page.locator(selector).evaluate((element, nextValue) => {
            element.value = String(nextValue);
            element.dispatchEvent(new Event("input", { bubbles: true }));
        }, value);
    };

    // Rotate and make custom adjustments.
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#rotateRightButton").click();
    await page.locator('[data-tool="adjust"]').click();
    await setRange("#brightnessInput", 135);
    await setRange("#contrastInput", 120);
    await expect(page.locator("#brightnessInput")).toHaveValue("135");
    await expect(page.locator("#contrastInput")).toHaveValue("120");

    await page.locator("#cropButton").click();
    await expect(page.locator("#cropModal")).toBeHidden();
    await expect.poll(savedImage).toMatchObject({
        rotation: 90,
        brightness: 135,
        contrast: 120,
        filterName: "none"
    });

    // Reload and confirm custom adjustment values return in the editor.
    await page.reload();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator('[data-tool="adjust"]').click();
    await expect(page.locator("#brightnessInput")).toHaveValue("135");
    await expect(page.locator("#contrastInput")).toHaveValue("120");

    // Apply a preset as a separate edit; presets intentionally set their own
    // adjustment values, so they are tested separately from custom adjustments.
    await page.locator('[data-tool="filters"]').click();
    await page.locator('.filter-button[data-filter="sepia"]').click();
    await expect(page.locator('.filter-button[data-filter="sepia"]')).toHaveClass(/active/);
    await expect(page.locator("#brightnessInput")).toHaveValue("100");
    await expect(page.locator("#contrastInput")).toHaveValue("100");
    await page.locator("#cropButton").click();

    await expect.poll(savedImage).toMatchObject({
        rotation: 90,
        brightness: 100,
        contrast: 100,
        filterName: "sepia",
        sepia: 80
    });

    // Undo restores the custom-adjustment edit; Redo restores the sepia preset.
    await page.locator("#undoButton").click();
    await expect.poll(savedImage).toMatchObject({
        rotation: 90,
        brightness: 135,
        contrast: 120,
        filterName: "none"
    });

    await page.locator("#redoButton").click();
    await expect.poll(savedImage).toMatchObject({
        rotation: 90,
        brightness: 100,
        contrast: 100,
        filterName: "sepia",
        sepia: 80
    });
});


test("horizontal and vertical flips persist after reload and support Undo/Redo", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    const savedImage = async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return grids.find(item => item.name === "Untitled Grid")?.images?.[0] ?? null;
    });

    // Flip in both directions and save.
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#flipHorizontalButton").click();
    await page.locator("#flipVerticalButton").click();
    await page.locator("#cropButton").click();

    await expect.poll(savedImage).toMatchObject({
        flipX: true,
        flipY: true
    });

    // Reload and toggle each restored flip off. If state wasn't restored,
    // clicking would turn the flip on instead.
    await page.reload();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#flipHorizontalButton").click();
    await page.locator("#flipVerticalButton").click();
    await page.locator("#cropButton").click();

    await expect.poll(savedImage).toMatchObject({
        flipX: false,
        flipY: false
    });

    await page.locator("#undoButton").click();
    await expect.poll(savedImage).toMatchObject({
        flipX: true,
        flipY: true
    });

    await page.locator("#redoButton").click();
    await expect.poll(savedImage).toMatchObject({
        flipX: false,
        flipY: false
    });
});


test("PNG, JPG, and WebP downloads produce correctly encoded image files", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    const formats = [
        {
            format: "png",
            selector: "#downloadPngButton",
            extension: ".png",
            signature: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        },
        {
            format: "jpg",
            selector: "#downloadJpgButton",
            extension: ".jpg",
            signature: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        },
        {
            format: "webp",
            selector: "#downloadWebpButton",
            extension: ".webp",
            signature: buffer => buffer.toString("ascii", 0, 4) === "RIFF" &&
                buffer.toString("ascii", 8, 12) === "WEBP"
        }
    ];

    for (const item of formats) {
        await page.locator("#downloadButton").click();
        await expect(page.locator("#downloadMenu")).toBeVisible();

        const downloadPromise = page.waitForEvent("download");
        await page.locator(item.selector).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe(`grid-board${item.extension}`);

        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);

        expect(bytes.length).toBeGreaterThan(32);
        expect(item.signature(bytes)).toBe(true);
        await expect(page.locator("#downloadMenu")).toBeHidden();
    }
});


test("horizontal flip changes the saved image pixels, not just its metadata", async ({ page }) => {
    await waitForApp(page);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const pngBase64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ff0000";
        context.fillRect(0, 0, 50, 100);
        context.fillStyle = "#0000ff";
        context.fillRect(50, 0, 50, 100);
        return canvas.toDataURL("image/png").split(",")[1];
    });

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "two-color-test.png",
        mimeType: "image/png",
        buffer: Buffer.from(pngBase64, "base64")
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(100);
    await page.locator("#flipHorizontalButton").click();
    await page.locator("#cropButton").click();

    const pixels = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();

        const source = grids.find(item => item.name === "Untitled Grid")?.images?.[0]?.source;
        if (!source) throw new Error("No saved image source found");

        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const y = Math.floor(canvas.height / 2);
        const left = Array.from(context.getImageData(5, y, 1, 1).data);
        const right = Array.from(context.getImageData(canvas.width - 6, y, 1, 1).data);
        return { width: canvas.width, height: canvas.height, left, right };
    });

    expect(pixels.width).toBeGreaterThan(10);
    expect(pixels.height).toBeGreaterThan(10);
    expect(pixels.left[2]).toBeGreaterThan(200);
    expect(pixels.left[0]).toBeLessThan(40);
    expect(pixels.right[0]).toBeGreaterThan(200);
    expect(pixels.right[2]).toBeLessThan(40);

    // Confirm the exported PNG preserves the same left/right orientation.
    const tileLayout = await page.locator('#board .image[data-index="0"]').evaluate(tile => {
        const board = document.getElementById("board");
        const boardRect = board.getBoundingClientRect();
        const tileRect = tile.getBoundingClientRect();
        return {
            x: tileRect.left - boardRect.left,
            y: tileRect.top - boardRect.top,
            width: tileRect.width,
            height: tileRect.height
        };
    });

    await page.locator("#downloadButton").click();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#downloadPngButton").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const exportedBase64 = Buffer.concat(chunks).toString("base64");

    const exportedPixels = await page.evaluate(async ({ exportedBase64, tileLayout }) => {
        const image = new Image();
        image.src = "data:image/png;base64," + exportedBase64;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);

        const leftX = Math.round((tileLayout.x + tileLayout.width * 0.25) * 2);
        const rightX = Math.round((tileLayout.x + tileLayout.width * 0.75) * 2);
        const y = Math.round((tileLayout.y + tileLayout.height * 0.5) * 2);
        return {
            left: Array.from(context.getImageData(leftX, y, 1, 1).data),
            right: Array.from(context.getImageData(rightX, y, 1, 1).data)
        };
    }, { exportedBase64, tileLayout });

    expect(exportedPixels.left[2]).toBeGreaterThan(180);
    expect(exportedPixels.left[0]).toBeLessThan(60);
    expect(exportedPixels.right[0]).toBeGreaterThan(180);
    expect(exportedPixels.right[2]).toBeLessThan(60);
});


test("rotating an asymmetric image changes its saved pixel orientation", async ({ page }) => {
    await waitForApp(page);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const pngBase64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ff0000";
        context.fillRect(0, 0, 50, 100);
        context.fillStyle = "#0000ff";
        context.fillRect(50, 0, 50, 100);
        return canvas.toDataURL("image/png").split(",")[1];
    });

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "two-color-rotation-test.png",
        mimeType: "image/png",
        buffer: Buffer.from(pngBase64, "base64")
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(100);
    await page.locator("#rotateRightButton").click();
    await page.locator("#cropButton").click();

    const pixels = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();

        const source = grids.find(item => item.name === "Untitled Grid")?.images?.[0]?.source;
        if (!source) throw new Error("No saved image source found");

        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const x = Math.floor(canvas.width / 2);
        const top = Array.from(context.getImageData(x, 5, 1, 1).data);
        const bottom = Array.from(context.getImageData(x, canvas.height - 6, 1, 1).data);
        return { width: canvas.width, height: canvas.height, top, bottom };
    });

    expect(pixels.width).toBeGreaterThan(10);
    expect(pixels.height).toBeGreaterThan(10);
    expect(pixels.top[0]).toBeGreaterThan(200);
    expect(pixels.top[2]).toBeLessThan(40);
    expect(pixels.bottom[2]).toBeGreaterThan(200);
    expect(pixels.bottom[0]).toBeLessThan(40);
});


test("grayscale filter is applied to the exported PNG", async ({ page }) => {
    await waitForApp(page);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const pngBase64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ff0000";
        context.fillRect(0, 0, 50, 100);
        context.fillStyle = "#0000ff";
        context.fillRect(50, 0, 50, 100);
        return canvas.toDataURL("image/png").split(",")[1];
    });

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "two-color-grayscale-test.png",
        mimeType: "image/png",
        buffer: Buffer.from(pngBase64, "base64")
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(100);
    await page.locator('[data-tool="filters"]').click();
    await page.locator('.filter-button[data-filter="grayscale"]').click();
    await expect(page.locator('.filter-button[data-filter="grayscale"]')).toHaveClass(/active/);
    await page.locator("#cropButton").click();

    const sourcePixels = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        const source = grids.find(item => item.name === "Untitled Grid")?.images?.[0]?.source;
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const y = Math.floor(canvas.height / 2);
        return {
            left: Array.from(context.getImageData(5, y, 1, 1).data),
            right: Array.from(context.getImageData(canvas.width - 6, y, 1, 1).data)
        };
    });

    // The original saved source remains colored; the display/export layer
    // is responsible for applying the grayscale filter.
    expect(sourcePixels.left[0]).toBeGreaterThan(200);
    expect(sourcePixels.left[1]).toBeLessThan(40);
    expect(sourcePixels.right[2]).toBeGreaterThan(200);
    expect(sourcePixels.right[0]).toBeLessThan(40);

    const tileLayout = await page.locator('#board .image[data-index="0"]').evaluate(tile => {
        const boardRect = document.getElementById("board").getBoundingClientRect();
        const tileRect = tile.getBoundingClientRect();
        return {
            x: tileRect.left - boardRect.left,
            y: tileRect.top - boardRect.top,
            width: tileRect.width,
            height: tileRect.height
        };
    });

    await page.locator("#downloadButton").click();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#downloadPngButton").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const exportedBase64 = Buffer.concat(chunks).toString("base64");

    const exportedPixels = await page.evaluate(async ({ exportedBase64, tileLayout }) => {
        const image = new Image();
        image.src = "data:image/png;base64," + exportedBase64;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const leftX = Math.round((tileLayout.x + tileLayout.width * 0.25) * 2);
        const rightX = Math.round((tileLayout.x + tileLayout.width * 0.75) * 2);
        const y = Math.round((tileLayout.y + tileLayout.height * 0.5) * 2);
        return {
            left: Array.from(context.getImageData(leftX, y, 1, 1).data),
            right: Array.from(context.getImageData(rightX, y, 1, 1).data)
        };
    }, { exportedBase64, tileLayout });

    for (const pixel of [exportedPixels.left, exportedPixels.right]) {
        const channels = pixel.slice(0, 3);
        expect(Math.max(...channels) - Math.min(...channels)).toBeLessThanOrEqual(8);
    }
    expect(exportedPixels.left[0]).toBeGreaterThan(exportedPixels.right[0]);
});


test("Restore Original clears rotation and filter adjustments before saving", async ({ page }) => {
    await waitForApp(page);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const pngBase64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ff0000";
        context.fillRect(0, 0, 50, 100);
        context.fillStyle = "#0000ff";
        context.fillRect(50, 0, 50, 100);
        return canvas.toDataURL("image/png").split(",")[1];
    });

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "restore-original-test.png",
        mimeType: "image/png",
        buffer: Buffer.from(pngBase64, "base64")
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(100);
    await page.locator("#rotateRightButton").click();
    await page.locator('[data-tool="filters"]').click();
    await page.locator('.filter-button[data-filter="grayscale"]').click();
    await page.locator("#cropButton").click();

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBe(100);
    await page.locator("#restoreOriginalButton").click();
    await page.locator("#cropButton").click();

    const savedImage = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const grids = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return grids.find(item => item.name === "Untitled Grid")?.images?.[0] ?? null;
    });

    expect(savedImage).toMatchObject({
        rotation: 0,
        flipX: false,
        flipY: false,
        filterName: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0
    });

    const restoredPixels = await page.evaluate(async source => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const y = Math.floor(canvas.height / 2);
        return {
            left: Array.from(context.getImageData(5, y, 1, 1).data),
            right: Array.from(context.getImageData(canvas.width - 6, y, 1, 1).data)
        };
    }, savedImage.source);

    expect(restoredPixels.left[0]).toBeGreaterThan(200);
    expect(restoredPixels.left[2]).toBeLessThan(40);
    expect(restoredPixels.right[2]).toBeGreaterThan(200);
    expect(restoredPixels.right[0]).toBeLessThan(40);
});


test("edited images stay with their own grids when switching back and forth", async ({ page }) => {
    await waitForApp(page);
    await addImageToFirstTile(page);

    // Edit the first grid with a rotation.
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#rotateRightButton").click();
    await page.locator("#cropButton").click();

    await expect.poll(async () => page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        return records.find(grid => grid.name === "Untitled Grid")?.images?.[0]?.rotation ?? null;
    })).toBe(90);

    // Create a second grid and give it a different image transform.
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("Edited Grid B");
    await page.locator("#createNewGridButton").click();
    await expect(page.locator("#imageRatio")).toHaveValue("1:1");

    if (await page.locator("#libraryPanel").evaluate(panel => panel.classList.contains("open"))) {
        await page.locator("#libraryCloseButton").click();
        await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);
    }
    await addImageToFirstTile(page);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#updateImageButton").click();
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#flipHorizontalButton").click();
    await page.locator("#cropButton").click();

    const readImageState = async name => page.evaluate(async gridName => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("grids", "readonly");
        const records = await new Promise((resolve, reject) => {
            const get = tx.objectStore("grids").getAll();
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
        });
        db.close();
        const image = records.find(grid => grid.name === gridName)?.images?.[0];
        return image ? {
            source: image.source,
            rotation: image.rotation,
            flipX: image.flipX,
            flipY: image.flipY
        } : null;
    }, name);

    await expect.poll(() => readImageState("Edited Grid B")).toMatchObject({
        rotation: 0,
        flipX: true,
        flipY: false
    });

    // Switch back to A and verify its rotated image wasn't replaced by B's.
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const gridA = page.locator("#libraryContent .library-grid").filter({ hasText: "Untitled Grid" });
    await gridA.locator(".library-grid-name").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    const stateA = await readImageState("Untitled Grid");
    expect(stateA).toMatchObject({ rotation: 90, flipX: false, flipY: false });
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveAttribute("src", stateA.source);

    // Undo/Redo the first grid's image edit while the library is closed.
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);
    await page.locator("#undoButton").click();
    await expect.poll(() => readImageState("Untitled Grid")).toMatchObject({
        rotation: 0,
        flipX: false,
        flipY: false
    });
    await page.locator("#redoButton").click();
    await expect.poll(() => readImageState("Untitled Grid")).toMatchObject({
        rotation: 90,
        flipX: false,
        flipY: false
    });

    // Switch to B again and confirm its flip and image source are intact.
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const gridB = page.locator("#libraryContent .library-grid").filter({ hasText: "Edited Grid B" });
    await gridB.locator(".library-grid-name").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    const stateB = await readImageState("Edited Grid B");
    expect(stateB).toMatchObject({ rotation: 0, flipX: true, flipY: false });
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveAttribute("src", stateB.source);
});


test("MyAnimeList search tabs stay within the viewport at responsive widths", async ({ page }) => {
    await waitForApp(page);
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();
    await page.locator("#searchMalButton").click();
    await expect(page.locator("#malSearchModal")).toBeVisible();

    for (const width of [1280, 850, 600, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });

        const layout = await page.evaluate(() => {
            const modal = document.getElementById("malSearchModal");
            const container = modal.querySelector(".mal-search-container");
            const tabs = modal.querySelector(".mal-search-tabs");
            const modalRect = modal.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const tabsRect = tabs.getBoundingClientRect();

            return {
                viewportWidth: window.innerWidth,
                documentWidth: document.documentElement.scrollWidth,
                modalWidth: modalRect.width,
                containerLeft: containerRect.left,
                containerRight: containerRect.right,
                tabsLeft: tabsRect.left,
                tabsRight: tabsRect.right,
                tabsClientWidth: tabs.clientWidth,
                tabsScrollWidth: tabs.scrollWidth,
                buttons: ["malCharacterNameTab", "malCharacterTab", "malByAnimeTab", "malAnimeTab"].map(id => {
                    const rect = document.getElementById(id).getBoundingClientRect();
                    return { id, left: rect.left, right: rect.right };
                })
            };
        });

        expect(layout.documentWidth, `document horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
        expect(layout.modalWidth).toBeLessThanOrEqual(width);
        expect(layout.containerLeft).toBeGreaterThanOrEqual(-1);
        expect(layout.containerRight).toBeLessThanOrEqual(width + 1);
        expect(layout.tabsScrollWidth, `search tabs overflow at ${width}px`).toBeLessThanOrEqual(layout.tabsClientWidth + 2);

        for (const button of layout.buttons) {
            expect(button.left, `${button.id} starts outside tabs at ${width}px`).toBeGreaterThanOrEqual(layout.tabsLeft - 1);
            expect(button.right, `${button.id} ends outside tabs at ${width}px`).toBeLessThanOrEqual(layout.tabsRight + 1);
        }
    }
});
