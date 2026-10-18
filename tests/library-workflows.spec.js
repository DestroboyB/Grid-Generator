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

test("library drill-down shows only directly assigned grids and keeps parent grids visible with children", async ({ page }) => {
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
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`).getByRole("button", { name: "Open / Select" })).toBeVisible();
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`).getByRole("button", { name: "Edit Categories" })).toBeVisible();
    await expect(page.locator(`[data-grid-id="${ids.childGridId}"]`)).toHaveCount(0);
    await page.getByRole("button", { name: "Open Drilldown Child" }).click();
    await expect(page.locator(`[data-grid-id="${ids.childGridId}"]`)).toBeVisible();
    await expect(page.locator(`[data-grid-id="${ids.parentGridId}"]`)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "← Back" })).toBeVisible();
});

test("Import Grid is temporarily absent while Bulk Import remains available", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#importProjectButton")).toHaveCount(0);
    await expect(page.locator("#bulkImportButton")).toBeVisible();
});
