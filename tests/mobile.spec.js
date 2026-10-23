import { test, expect } from "@playwright/test";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

async function waitForApp(page, width = 375, height = 812) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

test("mobile layouts do not create horizontal page overflow", async ({ page }) => {
    for (const viewport of [
        { width: 320, height: 720 },
        { width: 375, height: 812 },
        { width: 390, height: 844 },
        { width: 430, height: 932 },
        { width: 768, height: 1024 }
    ]) {
        await waitForApp(page, viewport.width, viewport.height);

        const dimensions = await page.evaluate(() => ({
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth
        }));

        expect(
            dimensions.document,
            `Horizontal overflow at ${viewport.width}px: ${JSON.stringify(dimensions)}`
        ).toBeLessThanOrEqual(viewport.width);
        expect(dimensions.body).toBeLessThanOrEqual(viewport.width);
    }
});

test("image-cell menus move with page scrolling and close when tapped outside", async ({ page }) => {
    await waitForApp(page, 375, 812);

    await page.evaluate(() => {
        document.body.style.minHeight = "200vh";
        window.scrollTo(0, 0);
    });

    const emptyCell = page.locator('#board .image[data-index="0"]');
    await emptyCell.click();
    const addMenu = page.locator("#addImageMenu");
    await expect(addMenu).toBeVisible();

    const initialTop = await addMenu.evaluate(menu => menu.getBoundingClientRect().top);
    await page.evaluate(() => window.scrollTo(0, 120));
    await expect.poll(() => addMenu.evaluate(menu => menu.getBoundingClientRect().top))
        .toBeLessThan(initialTop - 80);

    await expect.poll(() => page.evaluate(() =>
        !document.documentElement.classList.contains("image-menu-open") &&
        !document.body.classList.contains("image-menu-open") &&
        getComputedStyle(document.body).position !== "fixed"
    )).toBe(true);

    await page.locator("body").click({ position: { x: 8, y: 8 } });
    await expect(addMenu).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#board .image[data-index="0"]').evaluate((cell, imageData) => {
        const image = document.createElement("img");
        image.src = imageData;
        cell.appendChild(image);
    }, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=");

    await page.locator('#board .image[data-index="0"]').click();
    const imageMenu = page.locator("#imageMenu");
    await expect(imageMenu).toBeVisible();
    await page.locator("body").click({ position: { x: 8, y: 8 } });
    await expect(imageMenu).toBeHidden();
});


test("tapping another grid cell switches its menu in one tap", async ({ page }) => {
    await waitForApp(page, 375, 812);

    const firstCell = page.locator('#board .image[data-index="0"]');
    const secondCell = page.locator('#board .image[data-index="8"]');
    const addMenu = page.locator("#addImageMenu");
    const imageMenu = page.locator("#imageMenu");

    await secondCell.evaluate((cell, imageData) => {
        const image = document.createElement("img");
        image.src = imageData;
        cell.appendChild(image);
    }, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=");

    await firstCell.click();
    await expect(addMenu).toBeVisible();

    await secondCell.click();
    await expect(imageMenu).toBeVisible();
    await expect(addMenu).toBeHidden();

    await firstCell.click();
    await expect(addMenu).toBeVisible();
    await expect(imageMenu).toBeHidden();
});

test("mobile board settings and saved-grid drawer are usable", async ({ page }) => {
    await waitForApp(page);

    const settingsButton = page.locator("#boardSettingsButton");
    const settingsPanel = page.locator("#boardSettingsPanel");

    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    await expect(settingsPanel).toHaveClass(/open/);
    await expect(page.locator("#spacing")).toBeVisible();

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await expect(page.locator("#libraryPanel")).toBeVisible();
    await expect(page.locator("#librarySearchInput")).toBeVisible();
    await expect(page.locator("#newGridButton")).toBeVisible();

    await page.locator("#libraryCloseButton").click();
    await expect(page.locator("#libraryPanel")).not.toHaveClass(/open/);
});

test("image editor tabs and controls remain usable on a phone-sized viewport", async ({ page }) => {
    await waitForApp(page, 375, 812);

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "mobile-test.png",
        mimeType: "image/png",
        buffer: tinyPng
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

    for (const tool of ["transform", "adjust", "filters"]) {
        const button = page.locator(`.editor-tool[data-tool="${tool}"]`);
        await expect(button).toBeVisible();
        await button.click();
        await expect(button).toHaveClass(/active/);
        await expect(page.locator(`.editor-panel[data-panel="${tool}"]`)).toHaveClass(/active/);
    }

    await expect(page.locator("#cropButton")).toBeVisible();
    await expect(page.locator("#restoreOriginalButton")).toBeVisible();

    await page.locator('.editor-tool[data-tool="transform"]').click();
    await expect(page.locator("#cropOutsideImageToggle")).toBeVisible();

    const transformLayout = await page.evaluate(() => {
        const panel = document.querySelector('.editor-panel[data-panel="transform"]');
        const panelRect = panel.getBoundingClientRect();
        const controls = [
            "#rotateLeftButton",
            "#rotateRightButton",
            "#flipHorizontalButton",
            "#flipVerticalButton",
            "#cropOutsideImageToggle",
            "#cropNudgeUp",
            "#cropNudgeLeft",
            "#cropNudgeDown",
            "#cropNudgeRight",
            ".editor-crop-nudge-help"
        ].map(selector => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return {
                selector,
                top: rect.top,
                bottom: rect.bottom,
                visible: rect.top >= panelRect.top && rect.bottom <= panelRect.bottom
            };
        });
        return {
            panelHeight: panelRect.height,
            allControlsVisible: controls.every(control => control.visible),
            controls
        };
    });
    expect(transformLayout.panelHeight).toBeGreaterThanOrEqual(125);
    expect(transformLayout.panelHeight).toBeLessThanOrEqual(155);
    expect(transformLayout.allControlsVisible, JSON.stringify(transformLayout.controls)).toBe(true);

    // The modal should lock the document behind it even when the active tab is swiped.
    await expect.poll(() => page.locator("body").evaluate(body =>
        body.classList.contains("cropper-modal-open") &&
        getComputedStyle(body).position === "fixed" &&
        getComputedStyle(body).overflow === "hidden" &&
        getComputedStyle(document.documentElement).overflow === "hidden"
    )).toBe(true);
    await page.evaluate(() => {
        document.body.style.minHeight = "200vh";
        window.scrollTo(0, 0);
    });
    for (const tool of ["transform", "adjust", "filters"]) {
        await page.locator(`.editor-tool[data-tool="${tool}"]`).click();
        await page.mouse.move(180, 650);
        await page.mouse.wheel(0, 300);
        expect(await page.evaluate(() => window.scrollY), `Background scrolled on ${tool} tab`).toBe(0);
    }

    await page.locator('.editor-tool[data-tool="transform"]').click();
    await expect(page.locator('.editor-panel[data-panel="transform"]')).toHaveClass(/active/);
    const finalTransformLayout = await page.locator('.editor-panel[data-panel="transform"]').evaluate(panel => {
        const panelRect = panel.getBoundingClientRect();
        const selectors = [
            "#rotateLeftButton",
            "#rotateRightButton",
            "#flipHorizontalButton",
            "#flipVerticalButton",
            "#cropOutsideImageToggle",
            "#cropNudgeUp",
            "#cropNudgeLeft",
            "#cropNudgeDown",
            "#cropNudgeRight",
            ".editor-crop-nudge-help"
        ];
        return {
            scrollTop: panel.scrollTop,
            controls: selectors.map(selector => {
                const rect = panel.querySelector(selector).getBoundingClientRect();
                return {
                    selector,
                    top: rect.top,
                    bottom: rect.bottom,
                    visible: rect.top >= panelRect.top && rect.bottom <= panelRect.bottom
                };
            })
        };
    });
    expect(finalTransformLayout.scrollTop).toBe(0);
    expect(
        finalTransformLayout.controls.every(control => control.visible),
        JSON.stringify(finalTransformLayout.controls)
    ).toBe(true);
});

test("mobile library scrolls internally with many saved grids", async ({ page }) => {
    await waitForApp(page, 375, 812);

    await page.evaluate(async () => {
        const request = indexedDB.open("gridBoardDatabase", 2);
        const db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        await new Promise((resolve, reject) => {
            const transaction = db.transaction("grids", "readwrite");
            const store = transaction.objectStore("grids");

            for (let index = 0; index < 30; index += 1) {
                store.put({
                    id: `mobile-scroll-grid-${index}`,
                    name: `Mobile Scroll Grid ${String(index + 1).padStart(2, "0")}`,
                    categoryId: null,
                    createdAt: Date.now() + index,
                    updatedAt: Date.now() + index,
                    rows: 3,
                    columns: 3,
                    ratio: "1:1",
                    images: [],
                    undoStack: [],
                    redoStack: []
                });
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });

        db.close();
    });

    await page.locator("#libraryButton").click();
    await expect(page.locator("#libraryPanel")).toHaveClass(/open/);
    await expect(page.locator("#libraryContent .library-grid")).toHaveCount(31);
    await expect(page.locator('#libraryContent .library-grid[data-grid-id^="mobile-scroll-grid-"]')).toHaveCount(30);

    const scrollState = await page.locator("#libraryContent").evaluate(element => {
        const before = element.scrollTop;
        element.scrollTop = element.scrollHeight;
        return {
            before,
            after: element.scrollTop,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            bodyLocked: document.body.classList.contains("library-open")
        };
    });

    expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
    expect(scrollState.after).toBeGreaterThan(scrollState.before);
    expect(scrollState.bodyLocked).toBe(true);
});
