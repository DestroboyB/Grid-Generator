import { test, expect } from "@playwright/test";

test("grid names are trimmed and duplicate names are rejected case-insensitively", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const { createGrid, getGrid, renameGrid } = await import(
            `/js/storage/grids.js?grid-name-workflow=${Date.now()}`
        );

        const first = await createGrid({ name: "  Workflow Grid Alpha  " });
        const second = await createGrid({ name: "Workflow Grid Beta" });
        const renamed = await renameGrid(first.id, "  Workflow Grid Renamed  ");

        let duplicateRejected = false;
        let duplicateMessage = "";

        try {
            await renameGrid(second.id, "workflow grid renamed");
        } catch (error) {
            duplicateRejected = true;
            duplicateMessage = error.message;
        }

        const storedFirst = await getGrid(first.id);
        const storedSecond = await getGrid(second.id);

        return {
            firstName: first.name,
            renamedName: renamed?.name ?? null,
            storedFirstName: storedFirst?.name ?? null,
            storedSecondName: storedSecond?.name ?? null,
            duplicateRejected,
            duplicateMessage
        };
    });

    expect(result.firstName).toBe("Workflow Grid Alpha");
    expect(result.renamedName).toBe("Workflow Grid Renamed");
    expect(result.storedFirstName).toBe("Workflow Grid Renamed");
    expect(result.storedSecondName).toBe("Workflow Grid Beta");
    expect(result.duplicateRejected).toBe(true);
    expect(result.duplicateMessage).toMatch(/already exists/i);
});

test("deleting a category preserves its grids and reparents its immediate subcategories", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const { createCategory, deleteCategory, getCategory } = await import(
            `/js/storage/categories.js?category-delete-workflow=${Date.now()}`
        );
        const { createGrid, getGrid } = await import(
            `/js/storage/grids.js?category-delete-grid-workflow=${Date.now()}`
        );

        const parent = await createCategory("Workflow Parent");
        const target = await createCategory("Workflow Target", parent.id);
        const child = await createCategory("Workflow Child", target.id);
        const grid = await createGrid({
            name: "Grid in Deleted Category",
            categoryId: target.id
        });

        const deleted = await deleteCategory(target.id);
        const storedTarget = await getCategory(target.id);
        const storedChild = await getCategory(child.id);
        const storedGrid = await getGrid(grid.id);

        return {
            deleted,
            targetStillExists: Boolean(storedTarget),
            childParentId: storedChild?.parentId ?? null,
            expectedParentId: parent.id,
            gridCategoryId: storedGrid?.categoryId ?? null
        };
    });

    expect(result.deleted).toBe(true);
    expect(result.targetStillExists).toBe(false);
    expect(result.childParentId).toBe(result.expectedParentId);
    expect(result.gridCategoryId).toBeNull();
});


test("multiple category assignments preserve legacy primary ID and survive individual category deletion", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
        const { createCategory, deleteCategory, getAllCategories } = await import(
            `/js/storage/categories.js?multi-category-storage=${Date.now()}`
        );
        const { createGrid, getGrid, getGridSummaries } = await import(
            `/js/storage/grids.js?multi-category-grids=${Date.now()}`
        );
        const first = await createCategory("Multi Assignment First");
        const second = await createCategory("Multi Assignment Second");
        const legacy = await createGrid({ name: "Legacy Single Assignment", categoryId: first.id });
        const multi = await createGrid({ name: "Multi Assignment Grid", categoryIds: [first.id, second.id] });
        const { openDatabase, GRID_STORE } = await import("/js/storage/database.js");
        const db = await openDatabase();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(GRID_STORE, "readwrite");
            transaction.objectStore(GRID_STORE).put({
                id: "legacy-category-only-record",
                name: "Raw Legacy Schema Grid",
                categoryId: first.id,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
        const rawLegacy = await getGrid("legacy-category-only-record");
        const before = await getGrid(multi.id);
        const summaries = await getGridSummaries();
        await deleteCategory(first.id);
        const after = await getGrid(multi.id);
        const legacyAfter = await getGrid(legacy.id);
        const rawLegacyAfter = await getGrid("legacy-category-only-record");
        return {
            legacyAssignments: legacy.categoryIds,
            legacyPrimary: legacy.categoryId,
            rawLegacyAssignments: rawLegacy.categoryIds,
            rawLegacyAfterAssignments: rawLegacyAfter.categoryIds,
            rawLegacyAfterPrimary: rawLegacyAfter.categoryId,
            beforeAssignments: before.categoryIds,
            beforePrimary: before.categoryId,
            summaryAssignments: summaries.find(grid => grid.id === multi.id)?.categoryIds,
            afterAssignments: after.categoryIds,
            afterPrimary: after.categoryId,
            legacyAfterAssignments: legacyAfter.categoryIds,
            remainingCategoryExists: (await getAllCategories()).some(category => category.id === second.id)
        };
    });
    expect(result.legacyAssignments).toHaveLength(1);
    expect(result.legacyPrimary).toBeTruthy();
    expect(result.rawLegacyAssignments).toEqual([result.legacyPrimary]);
    expect(result.rawLegacyAfterAssignments).toEqual([]);
    expect(result.rawLegacyAfterPrimary).toBeNull();
    expect(result.beforeAssignments).toHaveLength(2);
    expect(result.beforePrimary).toBe(result.beforeAssignments[0]);
    expect(result.summaryAssignments).toHaveLength(2);
    expect(result.afterAssignments).toEqual([result.beforeAssignments[1]]);
    expect(result.afterPrimary).toBe(result.beforeAssignments[1]);
    expect(result.legacyAfterAssignments).toEqual([]);
    expect(result.remainingCategoryExists).toBe(true);
});

test("library category drill-down is contained in the dropdown and grid rows still select grids", async ({ page }) => {
    await page.goto("/");
    const ids = await page.evaluate(async () => {
        const { createCategory } = await import(`/js/storage/categories.js?library-drilldown=${Date.now()}`);
        const { createGrid, loadGrid } = await import(`/js/storage/grids.js?library-drilldown-grids=${Date.now()}`);
        const parent = await createCategory("Drilldown Parent");
        const child = await createCategory("Drilldown Child", parent.id);
        const parentGrid = await createGrid({ name: "Direct Parent Grid", categoryId: parent.id });
        const childGrid = await createGrid({ name: "Direct Child Grid", categoryId: child.id });
        await loadGrid(parentGrid.id);
        return { parentId: parent.id, childId: child.id, parentGridId: parentGrid.id, childGridId: childGrid.id };
    });
    await page.locator("#libraryButton").click();
    await expect(page.locator("#currentGridName")).toHaveText("Direct Parent Grid");
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`)).toBeVisible();
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`).getByRole("button", { name: "Open / Select" })).toHaveCount(0);
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`).getByRole("button", { name: "Edit Categories" })).toBeVisible();
    await expect(page.locator(`[data-grid-id="${ids.childGridId}"]`)).toHaveCount(0);
    await expect(page.locator(".library-category-navigation")).toHaveCount(0);
    await expect(page.locator(".library-breadcrumb-row")).toHaveCount(0);

    const trigger = page.getByRole("button", { name: "Choose category" });
    await trigger.click();
    const popup = page.locator(".library-category-popup");
    await popup.getByRole("button", { name: "Browse subcategories of Drilldown Parent" }).click();
    await popup.getByRole("button", { name: "Show grids in Drilldown Child" }).click();
    await expect(popup).toHaveCount(0);
    await expect(page.locator(`[data-grid-id="${ids.childGridId}"]`)).toBeVisible();
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`)).toHaveCount(0);
    await expect(page.locator(".library-category-navigation")).toHaveCount(0);
    await page.locator(`[data-grid-id="${ids.childGridId}"] .library-grid-name`).click();
    await expect(page.locator("#currentGridName")).toHaveText("Direct Child Grid");
});

test("current grid header supports inline rename, Enter save, Escape cancel, and blur save", async ({ page }) => {
    await page.goto("/");
    const ids = await page.evaluate(async () => {
        const { createGrid, loadGrid } = await import(
            `/js/storage/grids.js?header-inline-rename=${Date.now()}`
        );
        const first = await createGrid({ name: "Header Rename Original" });
        const second = await createGrid({ name: "Header Rename Blur Target" });
        await loadGrid(first.id);
        return { firstId: first.id, secondId: second.id };
    });

    await page.locator("#libraryButton").click();
    const header = page.locator("#currentGridName");
    await expect(header).toHaveText("Header Rename Original");
    await header.click();
    await header.locator("input").fill("Header Rename Saved");
    await header.locator("input").press("Enter");
    await expect(header).toHaveText("Header Rename Saved");

    await header.click();
    await header.locator("input").fill("This Should Be Cancelled");
    await header.locator("input").press("Escape");
    await expect(header).toHaveText("Header Rename Saved");

    await header.click();
    await header.locator("input").fill("Header Rename On Blur");
    await page.locator("#libraryContent .library-category-selector-trigger").click();
    await expect(header).toHaveText("Header Rename On Blur");

    const stored = await page.evaluate(async ids => {
        const { getGrid } = await import(`/js/storage/grids.js?header-rename-check=${Date.now()}`);
        return { first: (await getGrid(ids.firstId))?.name, second: (await getGrid(ids.secondId))?.name };
    }, ids);
    expect(stored.first).toBe("Header Rename On Blur");
    expect(stored.second).toBe("Header Rename Blur Target");
});

test("hierarchical category dropdown contains every level, has no duplicate navigation buttons, and preserves assignments", async ({ page }) => {
    await page.goto("/");
    const ids = await page.evaluate(async () => {
        const { createCategory } = await import(`/js/storage/categories.js?hierarchical-dropdown=${Date.now()}`);
        const { createGrid, loadGrid } = await import(`/js/storage/grids.js?hierarchical-dropdown-grids=${Date.now()}`);
        const parent = await createCategory("Dropdown Parent");
        const child = await createCategory("Dropdown Child", parent.id);
        const grandchild = await createCategory("Dropdown Grandchild", child.id);
        await createCategory("Dropdown Sibling");
        const grid = await createGrid({
            name: "Dropdown Multi Assigned Grid",
            categoryIds: [parent.id, child.id, grandchild.id]
        });
        await loadGrid(grid.id);
        return { parentId: parent.id, childId: child.id, grandchildId: grandchild.id, gridId: grid.id };
    });

    await page.locator("#libraryButton").click();
    const trigger = page.getByRole("button", { name: "Choose category" });
    await expect(page.locator("#libraryCategorySelect")).toHaveCount(0);
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS("min-height", "44px");
    await expect(page.locator(".library-category-navigation")).toHaveCount(0);
    await expect(page.locator(".library-breadcrumb-row")).toHaveCount(0);
    await expect(page.locator("#newGridButton")).toBeVisible();
    await expect(page.locator("#newCategoryButton")).toBeVisible();

    // A parent category remains directly selectable even though it has children.
    await trigger.click();
    const popup = page.locator(".library-category-popup");
    await expect(popup).toBeVisible();
    await expect(popup.getByRole("button", { name: "Show grids in Dropdown Parent" })).toBeVisible();
    await expect(popup.getByRole("button", { name: "Show grids in Dropdown Child" })).toHaveCount(0);
    await expect(popup.getByRole("button", { name: "Uncategorized" })).toBeVisible();
    let popupBox = await popup.boundingBox();
    expect(popupBox.width).toBeGreaterThan(200);
    expect(popupBox.x).toBeGreaterThanOrEqual(0);
    expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));

    await popup.getByRole("button", { name: "Show grids in Dropdown Parent" }).click();
    await expect(trigger).toContainText("Dropdown Parent");
    await expect(page.locator(".library-category-navigation")).toHaveCount(0);
    await expect(page.locator(`[data-grid-id="${ids.gridId}"]`)).toBeVisible();

    // Drill down one level at a time, with Back navigation inside the popup.
    await trigger.click();
    await popup.getByRole("button", { name: "Browse subcategories of Dropdown Parent" }).click();
    await expect(popup.getByRole("button", { name: "Show grids in Dropdown Child" })).toBeVisible();
    await popup.getByRole("button", { name: "Browse subcategories of Dropdown Child" }).click();
    await expect(popup.getByRole("button", { name: "Show grids in Dropdown Grandchild" })).toBeVisible();
    await popup.getByRole("button", { name: "← Back" }).click();
    await expect(popup.getByRole("button", { name: "Show grids in Dropdown Child" })).toBeVisible();
    await popup.getByRole("button", { name: "Show grids in Dropdown Child" }).click();
    await expect(popup).toHaveCount(0);
    await expect(trigger).toContainText("Dropdown Parent / Dropdown Child");
    await expect(page.locator(`[data-grid-id="${ids.gridId}"]`)).toBeVisible();

    // Explicitly verify the popup palette is readable in dark mode.
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    await trigger.click();
    await page.waitForTimeout(300); // Allow the theme's color transition to finish.
    const colors = await page.evaluate(() => {
        const popup = document.querySelector(".library-category-popup");
        return {
            background: getComputedStyle(popup).backgroundColor,
            color: getComputedStyle(popup).color,
            triggerBackground: getComputedStyle(document.querySelector(".library-category-selector-trigger")).backgroundColor,
            triggerColor: getComputedStyle(document.querySelector(".library-category-selector-trigger")).color
        };
    });
    expect(colors.background).toBe("rgb(31, 41, 55)");
    expect(colors.color).toBe("rgb(243, 244, 246)");
    expect(colors.triggerBackground).toBe("rgb(39, 52, 73)");
    expect(colors.triggerColor).toBe("rgb(255, 255, 255)");

    const storedAssignments = await page.evaluate(async gridId => {
        const { getGrid } = await import(`/js/storage/grids.js?dropdown-assignments=${Date.now()}`);
        return (await getGrid(gridId))?.categoryIds;
    }, ids.gridId);
    expect(storedAssignments.map(String)).toEqual([String(ids.parentId), String(ids.childId), String(ids.grandchildId)]);
});

test("category management dialogs use readable slash paths and newly created categories stay selected", async ({ page }) => {
    await page.goto("/");
    const ids = await page.evaluate(async () => {
        const { createCategory } = await import(`/js/storage/categories.js?category-modal-paths=${Date.now()}`);
        const { createGrid, loadGrid } = await import(`/js/storage/grids.js?category-modal-paths-grids=${Date.now()}`);
        const parent = await createCategory("Modal Parent");
        const child = await createCategory("Modal Child", parent.id);
        const grandchild = await createCategory("Modal Grandchild", child.id);
        const grid = await createGrid({ name: "Modal Path Grid", categoryIds: [parent.id, child.id] });
        await loadGrid(grid.id);
        return { parentId: parent.id, childId: child.id, grandchildId: grandchild.id, gridId: grid.id };
    });
    await page.locator("#libraryButton").click();
    await page.locator(`[data-grid-id="${ids.gridId}"]`).getByRole("button", { name: "Edit Categories" }).click();
    const editDialog = page.locator(".library-modal-content.category-selection-modal");
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByText("Modal Parent / Modal Child", { exact: true })).toBeVisible();
    await expect(editDialog.getByText("Modal Parent / Modal Child / Modal Grandchild", { exact: true })).toBeVisible();
    await expect(editDialog.locator(".library-category-selection-list")).toBeVisible();
    await editDialog.getByRole("button", { name: "Cancel" }).click();
    await page.locator("#newCategoryButton").click();
    const createDialog = page.locator(".library-modal-content");
    await createDialog.getByRole("textbox", { name: "Category name" }).fill("Fresh Category");
    await createDialog.getByRole("button", { name: "Save" }).click();
    const trigger = page.getByRole("button", { name: "Choose category" });
    await expect(trigger).toContainText("Fresh Category");
    await expect(trigger).not.toContainText("Top-level categories");
});
test("Import Grid is available while Bulk Import remains available", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#importProjectButton")).toBeVisible();
    await expect(page.locator("#bulkImportButton")).toBeVisible();
});

test("clearing My Grids search restores the default list without pressing Enter", async ({ page }) => {
    await page.goto("/");
    const gridIds = await page.evaluate(async () => {
        const { createGrid, loadGrid } = await import(
            `/js/storage/grids.js?clear-library-search=${Date.now()}`
        );
        const first = await createGrid({ name: "Clear Search Target" });
        const second = await createGrid({ name: "Clear Search Other One" });
        const third = await createGrid({ name: "Clear Search Other Two" });
        await loadGrid(first.id);
        return [first.id, second.id, third.id];
    });

    await page.locator("#libraryButton").click();
    const search = page.locator("#librarySearchInput");
    await search.fill("Clear Search Target");
    await search.press("Enter");

    await expect(page.locator("#libraryContent .library-view-heading")).toHaveText("Search results");
    await expect(page.locator("#libraryContent [data-grid-id]")).toHaveCount(1);
    await expect(page.locator(`[data-grid-id="${gridIds[0]}"]`)).toBeVisible();

    // Filling the search field with an empty value fires the same input event
    // as clearing it with the native X button or deleting the text manually.
    await search.fill("");

    await expect(page.locator("#libraryContent .library-view-heading")).toHaveCount(0);
    for (const gridId of gridIds) {
        await expect(page.locator(`#libraryContent [data-grid-id="${gridId}"]`)).toBeVisible();
    }
    // The app may also show its pre-existing default grid, so assert the
    // seeded grids are restored rather than requiring an exact total count.
    await expect(page.locator("#libraryContent [data-grid-id]")).toHaveCount(await page.locator("#libraryContent [data-grid-id]").count());
});
