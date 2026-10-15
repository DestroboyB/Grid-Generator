import { test, expect } from "@playwright/test";

const tinyGif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    "base64"
);

async function waitForApp(page) {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);
}

test("GIF upload opens the editor and offers a way to preserve animation", async ({ page }) => {
    await waitForApp(page);

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "test-animation.gif",
        mimeType: "image/gif",
        buffer: tinyGif
    });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect(page.locator("#useAnimatedGifButton")).toBeVisible();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(0);
});

test("GIF download option is hidden until an animated GIF is on the board", async ({ page }) => {
    await page.addInitScript(() => {
        class FakeGIF {
            constructor() { this.handlers = {}; }
            on(name, callback) { this.handlers[name] = callback; }
            addFrame() {}
            render() {
                this.handlers.finished?.(new Blob(["fake-gif"], { type: "image/gif" }));
            }
        }
        window.GIF = FakeGIF;
    });

    await waitForApp(page);
    // Open the menu so this assertion checks the option itself, not just
    // the fact that its parent menu is closed.
    await page.locator("#downloadButton").click();
    await expect(page.locator("#downloadGifButton")).toBeHidden();
    await page.locator("#downloadButton").click();

    await page.locator('#board .image[data-index="0"]').click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
        name: "test-animation.gif",
        mimeType: "image/gif",
        buffer: tinyGif
    });

    await expect(page.locator("#useAnimatedGifButton")).toBeVisible();
    await page.locator("#useAnimatedGifButton").click();
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    // The menu is closed while editing/importing, so reopen it before
    // asserting that the GIF option is available.
    await page.locator("#downloadButton").click();
    await expect(page.locator("#downloadGifButton")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#downloadGifButton").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("grid-board.gif");
});
