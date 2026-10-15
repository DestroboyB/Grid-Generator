import { test, expect } from "@playwright/test";

test("dark mode preserves primary action colors and hover states", async ({ page }) => {
    await page.goto("/");
    await page.locator("#themeToggleButton").click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const primaryButtons = [
        { selector: "#generateBoard", label: "Generate Board" },
        { selector: "#downloadButton", label: "Download" }
    ];

    for (const button of primaryButtons) {
        const locator = page.locator(button.selector);
        await expect(locator, `${button.label} should be visible in dark mode`).toBeVisible();

        const background = await locator.evaluate(element => getComputedStyle(element).backgroundColor);
        expect(background, `${button.label} should retain its blue primary background`).toBe("rgb(37, 99, 235)");

        await locator.hover();
        const hoverBackground = await locator.evaluate(element => getComputedStyle(element).backgroundColor);
        expect(hoverBackground, `${button.label} should retain its blue hover background`).toBe("rgb(29, 78, 216)");
    }
});
