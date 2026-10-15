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
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    await page.locator("#imageRatio").selectOption("16:9");
    await expect(page.locator("#undoButton")).toBeEnabled();

    // Reopen the first grid, then immediately switch away after Undo to
    // exercise the race between the history save and the grid-load save.
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const originalRow = page.locator('#libraryContent .library-grid').filter({ hasText: "Untitled Grid" });
    await originalRow.locator(".library-grid-name").click();
    await expect(page.locator("#imageRatio")).toHaveValue("4:3");
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    await page.locator("#undoButton").click();
    await expect(page.locator("#imageRatio")).toHaveValue("1:1");

    await page.locator("#libraryButton").click();
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

    await page.locator("#libraryButton").click();
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
