import { test, expect } from "@playwright/test";

test("outer padding can be changed, undone, and saved", async ({ page }) => {
    await page.goto("/");

    const padding = page.locator("#outerPadding");
    const paddingValue = page.locator("#outerPaddingValue");
    const board = page.locator("#board");

    await expect(padding).toHaveValue("10");
    await expect(board).toHaveCSS("padding", "10px");

    // The board must not be flex-shrunk, which can clip the horizontal grid edges.
    for (const value of ["4", "0"]) {
        await page.evaluate(async nextValue => {
            const { appState } = await import("/js/state.js");
            const { updateBoardStyle } = await import("/js/board.js");
            appState.outerPadding = Number(nextValue);
            document.getElementById("outerPadding").value = nextValue;
            updateBoardStyle();
        }, value);

        await expect(board).toHaveCSS("padding", `${value}px`);
        const edgeGaps = await board.evaluate(element => {
            const rect = element.getBoundingClientRect();
            const cells = Array.from(element.querySelectorAll(":scope > .image"));
            const first = cells[0].getBoundingClientRect();
            const last = cells[cells.length - 1].getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
                left: first.left - rect.left - parseFloat(style.borderLeftWidth) - parseFloat(style.paddingLeft),
                right: rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight) - last.right
            };
        });
        expect(Math.abs(edgeGaps.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(edgeGaps.right)).toBeLessThanOrEqual(1);
    }

    await padding.evaluate(input => {
        input.value = "18";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await expect(paddingValue).toHaveText("18 px");
    await expect(board).toHaveCSS("padding", "18px");

    await page.locator("#undoButton").click();
    await expect(padding).toHaveValue("10");
    await expect(board).toHaveCSS("padding", "10px");

    await page.locator("#redoButton").click();
    await expect(padding).toHaveValue("18");
    await expect(board).toHaveCSS("padding", "18px");

    await expect.poll(() => page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        const { getGrid } = await import("/js/storage/grids.js");
        const grid = await getGrid(appState.currentGridId);
        return grid?.outerPadding;
    })).toBe(18);

    await page.reload();
    await expect(page.locator("#outerPadding")).toHaveValue("18");
    await expect(page.locator("#board")).toHaveCSS("padding", "18px");
});
