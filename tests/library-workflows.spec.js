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
