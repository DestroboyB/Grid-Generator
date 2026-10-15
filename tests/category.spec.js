import { test, expect } from "@playwright/test";

test("category names are trimmed and duplicates are rejected case-insensitively", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const { createCategory, getAllCategories } = await import(
            `/js/storage/categories.js?category-name-integrity=${Date.now()}`
        );

        const created = await createCategory("  Regression Category  ");
        let duplicateRejected = false;
        let duplicateMessage = "";

        try {
            await createCategory("regression category");
        } catch (error) {
            duplicateRejected = true;
            duplicateMessage = error.message;
        }

        const categories = await getAllCategories();

        return {
            createdName: created.name,
            duplicateRejected,
            duplicateMessage,
            matchingNames: categories.filter(
                category => category.name.toLowerCase() === "regression category"
            ).length
        };
    });

    expect(result.createdName).toBe("Regression Category");
    expect(result.duplicateRejected).toBe(true);
    expect(result.duplicateMessage).toMatch(/already exists/i);
    expect(result.matchingNames).toBe(1);
});

test("a category cannot be moved into its own descendant", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const { createCategory, getCategory, moveCategory } = await import(
            `/js/storage/categories.js?category-cycle-integrity=${Date.now()}`
        );

        const parent = await createCategory("Cycle Test Parent");
        const child = await createCategory("Cycle Test Child", parent.id);
        let moveRejected = false;
        let rejectionMessage = "";

        try {
            await moveCategory(parent.id, child.id);
        } catch (error) {
            moveRejected = true;
            rejectionMessage = error.message;
        }

        const storedParent = await getCategory(parent.id);
        const storedChild = await getCategory(child.id);

        return {
            moveRejected,
            rejectionMessage,
            parentId: storedParent?.parentId ?? null,
            childParentId: storedChild?.parentId ?? null,
            expectedParentId: parent.id
        };
    });

    expect(result.moveRejected).toBe(true);
    expect(result.rejectionMessage).toMatch(/own subcategory/i);
    expect(result.parentId).toBeNull();
    expect(result.childParentId).toBe(result.expectedParentId);
});
