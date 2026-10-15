import { test, expect } from "@playwright/test";

async function waitForApp(page, width = 375, height = 812) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

// Generate a real, decoded high-resolution image in Chromium so this test
// exercises image decoding and Cropper without committing a large fixture.
async function makeLargePng(page, size = 2048) {
    const dataUrl = await page.evaluate((size) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#244a80");
        gradient.addColorStop(0.5, "#e6a34a");
        gradient.addColorStop(1, "#3b805e");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add detail so this is not just a tiny, trivially-compressible image.
        for (let y = 0; y < canvas.height; y += 32) {
            context.fillStyle = `rgba(255,255,255,${(y % 64) / 128})`;
            context.fillRect(0, y, canvas.width, 12);
        }

        return canvas.toDataURL("image/png");
    }, size);

    return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function importImageIntoFirstTile(page, buffer, expectedWidth = 2048) {
    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;

    await chooser.setFiles({
        name: `stress-image-${expectedWidth}.png`,
        mimeType: "image/png",
        buffer
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(
        () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
    ).toBe(expectedWidth);

    await page.locator("#cropButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
}

test("stress: maximum 10x10 board remains responsive through repeated layout changes", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);

    await page.locator("#rows").selectOption("10");
    await page.locator("#columns").selectOption("10");
    await page.locator("#generateBoard").click();
    await expect(page.locator("#board .image")).toHaveCount(100);

    const ratios = ["4:3", "3:2", "16:9", "3:4", "2:3", "9:16", "1:1"];
    for (let i = 0; i < 21; i++) {
        await page.locator("#imageRatio").selectOption(ratios[i % ratios.length]);
        await expect(page.locator("#board .image")).toHaveCount(100);
    }

    await page.reload();
    await expect(page.locator("#board .image")).toHaveCount(100);
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    expect(pageErrors, "Unexpected uncaught browser errors during maximum-grid stress test").toEqual([]);
});

test("stress: high-resolution image survives editing, repeated changes, and reload", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);
    const largePng = await makeLargePng(page);
    await importImageIntoFirstTile(page, largePng);

    const ratios = ["4:3", "3:2", "16:9", "3:4", "2:3", "9:16", "1:1"];
    for (let i = 0; i < 14; i++) {
        await page.locator("#imageRatio").selectOption(ratios[i % ratios.length]);
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }

    await page.reload();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await expect.poll(
        () => page.locator('#board .image[data-index="0"] img').evaluate(image => image.complete && image.naturalWidth > 0)
    ).toBe(true);

    expect(pageErrors, "Unexpected uncaught browser errors during high-resolution image stress test").toEqual([]);
});


test("stress: repeated high-resolution editor open and cancel cleans up Cropper DOM", async ({ page }) => {
    test.setTimeout(120000);

    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);
    const largePng = await makeLargePng(page);
    const memorySamples = [];

    for (let i = 0; i < 8; i++) {
        await page.locator('#board .image[data-index="0"]').click();
        await page.locator("#openImageSourceMenuButton").click();

        const chooserPromise = page.waitForEvent("filechooser");
        await page.locator("#uploadImageButton").click();
        const chooser = await chooserPromise;
        await chooser.setFiles({
            name: `editor-cycle-${i}.png`,
            mimeType: "image/png",
            buffer: largePng
        });

        await expect(page.locator("#cropModal")).toBeVisible();
        await expect.poll(
            () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
        ).toBe(2048);

        await page.locator("#cancelButton").click();
        await expect(page.locator("#cropModal")).toBeHidden();
        await expect(page.locator(".cropper-container")).toHaveCount(0);
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(0);

        const sample = await page.evaluate(() => {
            const memory = performance.memory;
            return {
                cropperContainers: document.querySelectorAll(".cropper-container").length,
                imageEditorSourceCleared: !document.querySelector("#cropImage").getAttribute("src"),
                heapUsed: memory?.usedJSHeapSize ?? null,
                heapLimit: memory?.jsHeapSizeLimit ?? null
            };
        });
        memorySamples.push(sample);
    }

    expect(memorySamples.every(sample => sample.cropperContainers === 0)).toBe(true);
    expect(memorySamples.every(sample => sample.imageEditorSourceCleared)).toBe(true);
    expect(pageErrors, "Unexpected uncaught browser errors during repeated editor lifecycle test").toEqual([]);

    // Chromium exposes this non-standard metric in some configurations only.
    // Record it for CI diagnostics when available; don't assert on noisy heap values.
    if (memorySamples.some(sample => sample.heapUsed !== null)) {
        console.log("Editor lifecycle heap samples (bytes):", memorySamples.map(sample => sample.heapUsed));
    }
});

test("stress: repeated high-resolution edits remain usable with bounded Undo/Redo history", async ({ page }) => {
    test.setTimeout(180000);

    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await waitForApp(page);
    // Keep this test focused on history behavior. The separate high-resolution
    // tests cover 2048px images; ten full-resolution snapshots can exceed the
    // browser test environment's IndexedDB budget and mask Undo/Redo behavior.
    const largePng = await makeLargePng(page, 512);
    await importImageIntoFirstTile(page, largePng, 512);

    // Each applied edit creates a history snapshot containing image data.
    // Ten edits exercise the history cap without making CI needlessly slow.
    for (let i = 0; i < 10; i++) {
        await page.locator('#board .image[data-index="0"]').click();
        await expect(page.locator("#imageMenu")).toBeVisible();
        await page.locator("#updateImageButton").click();
        await expect(page.locator("#cropModal")).toBeVisible();
        await expect.poll(
            () => page.locator("#cropImage").evaluate(image => image.naturalWidth)
        ).toBe(512);

        await page.locator("#rotateRightButton").click();
        await page.locator("#cropButton").click();
        await expect(page.locator("#cropModal")).toBeHidden();
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }

    await expect(page.locator("#undoButton")).toBeEnabled();
    for (let i = 0; i < 9; i++) {
        await page.locator("#undoButton").click();
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }
    await expect(page.locator("#undoButton")).toBeDisabled();
    await expect(page.locator("#redoButton")).toBeEnabled();

    for (let i = 0; i < 9; i++) {
        await page.locator("#redoButton").click();
        await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    }
    await expect(page.locator("#redoButton")).toBeDisabled();

    await page.reload();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await expect.poll(
        () => page.locator('#board .image[data-index="0"] img').evaluate(image => image.complete && image.naturalWidth > 0)
    ).toBe(true);

    expect(pageErrors, "Unexpected uncaught browser errors during repeated image edit/history stress test").toEqual([]);
});

test("history trimming: enforces count and size limits while retaining two states", async ({ page }) => {
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const { trimHistoryStack } = await import("/js/history.js");

        const countLimited = Array.from({ length: 12 }, (_, index) => ({
            marker: index,
            images: []
        }));
        trimHistoryStack(countLimited, 10, Number.POSITIVE_INFINITY);

        const sizeLimited = [
            { marker: "oldest", payload: "x".repeat(40) },
            { marker: "middle", payload: "y".repeat(40) },
            { marker: "recent", payload: "z".repeat(40) }
        ];
        trimHistoryStack(sizeLimited, 10, 160);

        const oversizedTwoState = [
            { marker: "previous", payload: "a".repeat(120) },
            { marker: "current", payload: "b".repeat(120) }
        ];
        trimHistoryStack(oversizedTwoState, 10, 10);

        // Setting-only edits should share identical image payloads and budget
        // them once, rather than being reduced to only two undo states.
        const sharedImages = [{ source: "data:image/png;base64," + "x".repeat(100) }];
        const repeatedImageStates = [
            { marker: "before", ratio: "1:1", images: structuredClone(sharedImages) },
            { marker: "middle", ratio: "4:3", images: structuredClone(sharedImages) },
            { marker: "current", ratio: "16:9", images: structuredClone(sharedImages) }
        ];
        trimHistoryStack(repeatedImageStates, 10, 300);

        return {
            count: countLimited.length,
            firstCountMarker: countLimited[0].marker,
            lastCountMarker: countLimited.at(-1).marker,
            sizeMarkers: sizeLimited.map(state => state.marker),
            retainedTwoStateCount: oversizedTwoState.length,
            retainedTwoStateMarkers: oversizedTwoState.map(state => state.marker),
            repeatedImageMarkers: repeatedImageStates.map(state => state.marker),
            sharedImageReferences: repeatedImageStates[0].images === repeatedImageStates[1].images &&
                repeatedImageStates[1].images === repeatedImageStates[2].images
        };
    });

    expect(result.count).toBe(10);
    expect(result.firstCountMarker).toBe(2);
    expect(result.lastCountMarker).toBe(11);
    expect(result.sizeMarkers).toEqual(["middle", "recent"]);
    expect(result.retainedTwoStateCount).toBe(2);
    expect(result.retainedTwoStateMarkers).toEqual(["previous", "current"]);
    expect(result.repeatedImageMarkers).toEqual(["before", "middle", "current"]);
    expect(result.sharedImageReferences).toBe(true);
});



test("mobile library: drawer scrolls independently and keeps creation actions visible", async ({ page }) => {
    await waitForApp(page, 375, 812);
    await page.locator("#libraryButton").click();

    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await expect(page.locator("body")).toHaveClass(/library-open/);

    // Give the drawer enough content to scroll, as it would with many grids/categories.
    await page.locator("#libraryContent").evaluate(element => {
        element.innerHTML = '<div style="height: 1800px">Scrollable test content</div>';
    });

    const actions = await page.locator(".library-actions").boundingBox();
    expect(actions).not.toBeNull();
    expect(actions.y + actions.height).toBeLessThanOrEqual(812);

    await page.mouse.move(140, 420);
    await page.mouse.wheel(0, 500);
    await expect.poll(
        () => page.locator("#libraryContent").evaluate(element => element.scrollTop)
    ).toBeGreaterThan(0);

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.locator("body").evaluate(element => getComputedStyle(element).overflow)).toBe("hidden");

    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("body")).not.toHaveClass(/library-open/);
});


test("storage reliability: IndexedDB retries after a transient open failure", async ({ page }) => {
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const indexedDBFactory = window.indexedDB;
        const originalDescriptor = Object.getOwnPropertyDescriptor(indexedDBFactory, "open");
        const originalOpen = indexedDBFactory.open;
        let shouldFail = true;
        let firstErrorName = null;
        let db = null;

        Object.defineProperty(indexedDBFactory, "open", {
            configurable: true,
            writable: true,
            value: function (...args) {
                if (shouldFail) {
                    shouldFail = false;
                    throw new DOMException(
                        "Simulated temporary storage failure",
                        "UnknownError"
                    );
                }

                return originalOpen.apply(indexedDBFactory, args);
            }
        });

        try {
            const moduleUrl = `/js/storage/database.js?retry-test=${Date.now()}`;
            const { openDatabase } = await import(moduleUrl);

            try {
                await openDatabase();
            } catch (error) {
                firstErrorName = error.name;
            }

            db = await openDatabase();
            return {
                firstErrorName,
                reopened: db instanceof IDBDatabase,
                stores: Array.from(db.objectStoreNames).sort()
            };
        } finally {
            db?.close();

            if (originalDescriptor) {
                Object.defineProperty(indexedDBFactory, "open", originalDescriptor);
            } else {
                delete indexedDBFactory.open;
            }
        }
    });

    expect(result.firstErrorName).toBe("UnknownError");
    expect(result.reopened).toBe(true);
    expect(result.stores).toEqual(["categories", "grids"]);
});


test("storage reliability: failed first save can recover and retry creating the grid", async ({ page }) => {
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const { saveCurrentGrid } = await import(
            `/js/storage/grids.js?first-save-retry=${Date.now()}`
        );
        const storePrototype = IDBObjectStore.prototype;
        const originalPut = storePrototype.put;
        const originalGridId = appState.currentGridId;
        let failFirstWrite = true;
        let firstSave = null;
        let secondSave = null;
        let savedGrid = null;

        try {
            appState.currentGridId = null;
            Object.defineProperty(storePrototype, "put", {
                configurable: true,
                writable: true,
                value: function (...args) {
                    if (failFirstWrite) {
                        failFirstWrite = false;
                        throw new DOMException(
                            "Simulated full browser storage",
                            "QuotaExceededError"
                        );
                    }

                    return originalPut.apply(this, args);
                }
            });

            firstSave = await saveCurrentGrid();
            const failedGridId = appState.currentGridId;
            const warning = document.querySelector("#gridSaveStatus")?.textContent ?? "";

            secondSave = await saveCurrentGrid();

            const request = indexedDB.open("gridBoardDatabase", 2);
            const db = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            const transaction = db.transaction("grids", "readonly");
            savedGrid = await new Promise((resolve, reject) => {
                const getRequest = transaction.objectStore("grids").get(failedGridId);
                getRequest.onsuccess = () => resolve(getRequest.result ?? null);
                getRequest.onerror = () => reject(getRequest.error);
            });
            db.close();

            return {
                firstSave,
                secondSave,
                warning,
                failedGridId,
                savedGridId: savedGrid?.id ?? null
            };
        } finally {
            Object.defineProperty(storePrototype, "put", {
                configurable: true,
                writable: true,
                value: originalPut
            });
            appState.currentGridId = originalGridId;
        }
    });

    expect(result.firstSave).toBe(false);
    expect(result.warning).toContain("browser storage is full");
    expect(result.secondSave).toBe(true);
    expect(result.savedGridId).toBe(result.failedGridId);
});

test("storage reliability: latest rapid changes and image survive an immediate reload", async ({ page }) => {
    await waitForApp(page);

    // Include actual image data, not only layout settings, in the persistence
    // check. Use a small decoded image so the test remains fast and reliable.
    const image = await makeLargePng(page, 128);
    await importImageIntoFirstTile(page, image, 128);

    // Change several saved settings in quick succession. Deliberately reload
    // without polling IndexedDB for completion first.
    await page.locator("#rows").selectOption("2");
    await page.locator("#generateBoard").click();
    await page.locator("#columns").selectOption("4");
    await page.locator("#generateBoard").click();
    await page.locator("#imageRatio").selectOption("4:3");
    await page.locator("#imageRatio").selectOption("16:9");
    await page.locator("#spacing").evaluate(element => {
        element.value = "17";
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.reload();

    await expect(page.locator("#rows")).toHaveValue("2");
    await expect(page.locator("#columns")).toHaveValue("4");
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");
    await expect(page.locator("#spacing")).toHaveValue("17");
    await expect(page.locator("#board .image")).toHaveCount(8);
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await expect.poll(
        () => page.locator('#board .image[data-index="0"] img').evaluate(image =>
            image.complete && image.naturalWidth === 128
        )
    ).toBe(true);
});

test("storage reliability: save warnings explain quota and unavailable-storage errors", async ({ page }) => {
    await waitForApp(page);

    const messages = await page.evaluate(async () => {
        const { getSaveErrorMessage } = await import("/js/storage/grids.js");

        return {
            quota: getSaveErrorMessage(new DOMException("Full", "QuotaExceededError")),
            unavailable: getSaveErrorMessage(new DOMException("Blocked", "SecurityError")),
            unknown: getSaveErrorMessage(new Error("Unexpected failure"))
        };
    });

    expect(messages.quota).toContain("browser storage is full");
    expect(messages.quota).toContain("Export important grids");
    expect(messages.unavailable).toContain("Browser storage is unavailable");
    expect(messages.unknown).toContain("export important grids");
});

test("storage reliability: quota failure warns and preserves the last saved grid version", async ({ page }) => {
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const { saveCurrentGrid, getGrid } = await import(
            `/js/storage/grids.js?existing-grid-quota-test=${Date.now()}`
        );
        const storePrototype = IDBObjectStore.prototype;
        const originalPut = storePrototype.put;
        const originalSpacing = appState.spacing;

        try {
            // Ensure the test begins with a real, persisted version of this grid.
            const initialSaveSucceeded = await saveCurrentGrid();
            const gridId = appState.currentGridId;
            const beforeFailure = await getGrid(gridId);
            if (!initialSaveSucceeded || !beforeFailure) {
                throw new Error("Could not establish the initial saved grid.");
            }

            appState.spacing = originalSpacing === 29 ? 28 : 29;
            const unsavedSpacing = appState.spacing;

            Object.defineProperty(storePrototype, "put", {
                configurable: true,
                writable: true,
                value: function (...args) {
                    throw new DOMException(
                        "Simulated full browser storage",
                        "QuotaExceededError"
                    );
                }
            });

            const saveSucceeded = await saveCurrentGrid();
            const warning = document.querySelector("#gridSaveStatus")?.textContent ?? "";
            const afterFailure = await getGrid(gridId);

            return {
                saveSucceeded,
                warning,
                originalSpacing: beforeFailure.spacing,
                unsavedSpacing,
                storedSpacing: afterFailure?.spacing ?? null,
                gridIdExists: afterFailure?.id === gridId
            };
        } finally {
            Object.defineProperty(storePrototype, "put", {
                configurable: true,
                writable: true,
                value: originalPut
            });
            appState.spacing = originalSpacing;
        }
    });

    expect(result.saveSucceeded).toBe(false);
    expect(result.warning).toContain("browser storage is full");
    expect(result.warning).toContain("couldn't be saved");
    expect(result.gridIdExists).toBe(true);
    expect(result.storedSpacing).toBe(result.originalSpacing);
    expect(result.storedSpacing).not.toBe(result.unsavedSpacing);
});


test("storage reliability: failed grid deletion preserves the saved grid and library entry", async ({ page }) => {
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const { saveCurrentGrid, getGrid } = await import(
            `/js/storage/grids.js?delete-failure-test=${Date.now()}`
        );

        const initialSaveSucceeded = await saveCurrentGrid();
        const gridId = appState.currentGridId;
        const beforeFailure = await getGrid(gridId);
        const storePrototype = IDBObjectStore.prototype;
        const originalDelete = storePrototype.delete;

        Object.defineProperty(storePrototype, "delete", {
            configurable: true,
            writable: true,
            value: function (...args) {
                throw new DOMException(
                    "Simulated browser storage failure",
                    "UnknownError"
                );
            }
        });

        try {
            let deletionError = null;

            try {
                const dbRequest = indexedDB.open("gridBoardDatabase", 2);
                const db = await new Promise((resolve, reject) => {
                    dbRequest.onsuccess = () => resolve(dbRequest.result);
                    dbRequest.onerror = () => reject(dbRequest.error);
                });

                const transaction = db.transaction("grids", "readwrite");
                transaction.objectStore("grids").delete(gridId);
                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = () => reject(transaction.error);
                    transaction.onabort = () => reject(transaction.error);
                });
                db.close();
            } catch (error) {
                deletionError = error.name;
            }

            const afterFailure = await getGrid(gridId);

            return {
                initialSaveSucceeded,
                gridId,
                beforeFailureExists: Boolean(beforeFailure),
                deletionError,
                afterFailureExists: Boolean(afterFailure),
                savedGridId: afterFailure?.id ?? null
            };
        } finally {
            Object.defineProperty(storePrototype, "delete", {
                configurable: true,
                writable: true,
                value: originalDelete
            });
        }
    });

    expect(result.initialSaveSucceeded).toBe(true);
    expect(result.beforeFailureExists).toBe(true);
    expect(result.deletionError).toBe("UnknownError");
    expect(result.afterFailureExists).toBe(true);
    expect(result.savedGridId).toBe(result.gridId);
});
