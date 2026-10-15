import { test, expect } from "@playwright/test";

test("legacy version 1 board migrates into the version 2 grid library", async ({ page }) => {
    // Seed the legacy database from a same-origin page that does not load the app.
    await page.route("**/migration-setup.html", route => route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><head><title>Migration setup</title></head><body></body></html>"
    }));
    await page.goto("/migration-setup.html");

    await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 1);
        const db = await new Promise((resolve, reject) => {
            request.onupgradeneeded = () => {
                request.result.createObjectStore("boards");
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        await new Promise((resolve, reject) => {
            const transaction = db.transaction("boards", "readwrite");
            transaction.objectStore("boards").put({
                data: {
                    rows: 2,
                    columns: 4,
                    ratio: "4:3",
                    spacing: 7,
                    backgroundColor: "#123456",
                    images: [],
                    undoStack: [],
                    redoStack: []
                }
            }, "currentBoard");
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });

        db.close();
    });

    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(8);

    const migrated = await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase");
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const result = await new Promise((resolve, reject) => {
            const transaction = db.transaction(["grids"], "readonly");
            const getAll = transaction.objectStore("grids").getAll();
            getAll.onsuccess = () => resolve({
                grids: getAll.result,
                version: db.version,
                legacyStoreRetained: db.objectStoreNames.contains("boards")
            });
            getAll.onerror = () => reject(getAll.error);
        });

        db.close();
        return result;
    });

    expect(migrated.version).toBe(2);
    expect(migrated.legacyStoreRetained).toBe(true);
    expect(migrated.grids).toHaveLength(1);
    expect(migrated.grids[0]).toMatchObject({
        name: "Untitled Grid",
        categoryId: null,
        rows: 2,
        columns: 4,
        ratio: "4:3",
        spacing: 7,
        backgroundColor: "#123456",
        images: [],
        redoStack: []
    });
    // App startup initializes history after migration, so undoStack can gain
    // an initial state before this assertion reads the record.
    expect(Array.isArray(migrated.grids[0].undoStack)).toBe(true);
    expect(migrated.grids[0].id).toMatch(/^grid_/);
});
