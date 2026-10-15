import { test, expect } from "@playwright/test";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

async function readGrid(page, gridId) {
    return page.evaluate(async id => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        try {
            const transaction = db.transaction("grids", "readonly");
            return await new Promise((resolve, reject) => {
                const get = transaction.objectStore("grids").get(id);
                get.onsuccess = () => resolve(get.result ?? null);
                get.onerror = () => reject(get.error);
            });
        } finally {
            db.close();
        }
    }, gridId);
}

test("saved grid settings and image data survive switching away and reopening", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);

    // Read the active grid ID from the library UI; IndexedDB ordering is not
    // guaranteed to match the currently selected grid.
    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const gridId = await page.locator(".library-grid.active").getAttribute("data-grid-id");
    expect(gridId).toBeTruthy();
    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);

    await page.locator("#rows").selectOption("2");
    await page.locator("#columns").selectOption("4");
    await page.locator("#generateBoard").click();
    await expect(page.locator("#board .image")).toHaveCount(8);
    await page.locator("#imageRatio").selectOption("4:3");

    await page.locator("#boardSettingsButton").click();
    await page.locator("#spacing").evaluate(el => {
        el.value = "12";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.locator("#backgroundColor").fill("#123456");
    await page.locator("#backgroundColor").dispatchEvent("input");
    await page.locator("#backgroundColor").dispatchEvent("change");
    // The checkbox input is visually hidden inside a custom toggle; click its visible label.
    await page.locator("label.toggle-switch").click();
    await expect(page.locator("#borderEnabled")).not.toBeChecked();
    await page.locator("#borderColor").fill("#654321");
    await page.locator("#borderColor").dispatchEvent("input");
    await page.locator("#borderColor").dispatchEvent("change");
    await page.locator("#borderSize").evaluate(el => {
        el.value = "5";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "persistence-image.png",
        mimeType: "image/png",
        buffer: tinyPng
    });
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    await expect.poll(async () => {
        const grid = await readGrid(page, gridId);
        return grid && {
            rows: grid.rows,
            columns: grid.columns,
            ratio: grid.ratio,
            spacing: grid.spacing,
            backgroundColor: grid.backgroundColor,
            borderEnabled: grid.borderEnabled,
            borderSize: grid.borderSize,
            borderColor: grid.borderColor,
            hasImage: Boolean(grid.images?.[0]?.source || grid.images?.[0]?.src || grid.images?.[0]?.data || grid.images?.[0]?.image)
        };
    }).toMatchObject({
        rows: 2,
        columns: 4,
        ratio: "4:3",
        spacing: 12,
        backgroundColor: "#123456",
        borderEnabled: false,
        borderSize: 5,
        borderColor: "#654321",
        hasImage: true
    });

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await page.locator("#newGridButton").click();
    await page.locator("#newGridNameInput").fill("Persistence Switch Target");
    await page.locator("#createNewGridButton").click();
    await expect(page.locator("#newGridModal")).not.toHaveClass(/open/);
    await expect(page.locator("#board .image")).toHaveCount(9);

    // Creating a grid leaves the library open; select the original grid directly.
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    const originalGridLocator = page.locator(`.library-grid[data-grid-id="${gridId}"]`);
    console.log("Persistence debug before reopen:", JSON.stringify({
        gridId,
        targetCount: await originalGridLocator.count(),
        targetVisible: await originalGridLocator.isVisible(),
        activeGridIds: await page.locator(".library-grid.active").evaluateAll(items => items.map(item => item.dataset.gridId)),
        storedGrid: await readGrid(page, gridId)
    }));
    page.on("dialog", async dialog => {
        console.log("Persistence debug dialog:", dialog.message());
        await dialog.dismiss();
    });
    await originalGridLocator.click();
    await page.waitForTimeout(250);
    console.log("Persistence debug after reopen:", JSON.stringify({
        gridId,
        activeGridIds: await page.locator(".library-grid.active").evaluateAll(items => items.map(item => item.dataset.gridId)),
        rows: await page.locator("#rows").inputValue(),
        columns: await page.locator("#columns").inputValue(),
        storedGrid: await readGrid(page, gridId)
    }));

    await expect(page.locator("#rows")).toHaveValue("2");
    await expect(page.locator("#columns")).toHaveValue("4");
    await expect(page.locator("#imageRatio")).toHaveValue("4:3");
    await expect(page.locator("#spacing")).toHaveValue("12");
    await expect(page.locator("#backgroundColor")).toHaveValue("#123456");
    await expect(page.locator("#borderEnabled")).not.toBeChecked();
    await expect(page.locator("#borderSize")).toHaveValue("5");
    await expect(page.locator("#borderColor")).toHaveValue("#654321");
    await expect(page.locator("#board .image")).toHaveCount(8);
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);
    await expect.poll(() =>
        page.locator('#board .image[data-index="0"] img').evaluate(img => img.complete && img.naturalWidth > 0)
    ).toBe(true);
});
