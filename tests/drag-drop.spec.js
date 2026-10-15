import { test, expect } from "@playwright/test";

const firstPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    "base64"
);

const secondPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    "base64"
);

async function uploadToTile(page, index, name, buffer) {
    const tile = page.locator(`#board .image[data-index="${index}"]`);
    await tile.click();
    await page.locator("#openImageSourceMenuButton").click();

    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#uploadImageButton").click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name, mimeType: "image/png", buffer });

    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();
    await expect(tile.locator("img")).toHaveCount(1);
    return tile;
}

test("dragging an image to another tile swaps the images and supports undo/redo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);

    const firstTile = await uploadToTile(page, 0, "first.png", firstPng);
    const secondTile = await uploadToTile(page, 1, "second.png", secondPng);

    const firstSourceBefore = await firstTile.locator("img").getAttribute("src");
    const secondSourceBefore = await secondTile.locator("img").getAttribute("src");
    expect(firstSourceBefore).toBeTruthy();
    expect(secondSourceBefore).toBeTruthy();
    expect(firstSourceBefore).not.toBe(secondSourceBefore);

    await firstTile.dragTo(secondTile);

    await expect(firstTile.locator("img")).toHaveAttribute("src", secondSourceBefore);
    await expect(secondTile.locator("img")).toHaveAttribute("src", firstSourceBefore);
    await expect(page.locator("#undoButton")).toBeEnabled();

    await page.locator("#undoButton").click();
    await expect(firstTile.locator("img")).toHaveAttribute("src", firstSourceBefore);
    await expect(secondTile.locator("img")).toHaveAttribute("src", secondSourceBefore);

    await page.locator("#redoButton").click();
    await expect(firstTile.locator("img")).toHaveAttribute("src", secondSourceBefore);
    await expect(secondTile.locator("img")).toHaveAttribute("src", firstSourceBefore);
});

test("dropping an external image file opens the editor and imports it into the target tile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);

    const tile = page.locator('#board .image[data-index="2"]');
    const fileDispatched = await page.evaluate(async () => {
        const target = document.querySelector('#board .image[data-index="2"]');
        const response = await fetch("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=");
        const blob = await response.blob();
        const file = new File([blob], "external-drop.png", { type: "image/png" });
        const transfer = new DataTransfer();
        transfer.items.add(file);

        target.dispatchEvent(new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer
        }));
        const dropEvent = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer
        });
        target.dispatchEvent(dropEvent);
        return dropEvent.defaultPrevented;
    });

    expect(fileDispatched).toBe(true);
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();

    await expect(tile.locator("img")).toHaveCount(1);
    await expect.poll(() => tile.locator("img").getAttribute("src")).not.toBeNull();
    await expect(page.locator("#undoButton")).toBeEnabled();

    const importedSource = await tile.locator("img").getAttribute("src");
    await page.reload();
    await expect(page.locator('#board .image[data-index="2"] img')).toHaveAttribute("src", importedSource);
});


test("dropping an image URL opens the editor and imports it into the target tile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);

    const tile = page.locator('#board .image[data-index="3"]');
    const imageURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=";

    const dropPrevented = await page.evaluate(({ imageURL }) => {
        const target = document.querySelector('#board .image[data-index="3"]');
        const transfer = new DataTransfer();
        transfer.setData("text/uri-list", imageURL);

        target.dispatchEvent(new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer
        }));

        const dropEvent = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer
        });
        target.dispatchEvent(dropEvent);
        return dropEvent.defaultPrevented;
    }, { imageURL });

    expect(dropPrevented).toBe(true);
    await expect(page.locator("#cropModal")).toBeVisible();
    await expect.poll(() => page.locator("#cropImage").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#cropButton").click();

    await expect(tile.locator("img")).toHaveCount(1);
    await expect.poll(() => tile.locator("img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);

    const importedSource = await tile.locator("img").getAttribute("src");
    await expect(page.locator("#undoButton")).toBeEnabled();
    await page.reload();
    await expect(page.locator('#board .image[data-index="3"] img')).toHaveAttribute("src", importedSource);
});


test("dropping an invalid image URL shows an error and closes the editor cleanly", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto("/");
    await expect(page.locator("#board .image")).toHaveCount(9);

    const dialogPromise = page.waitForEvent("dialog");
    await page.evaluate(() => {
        const target = document.querySelector('#board .image[data-index="4"]');
        const transfer = new DataTransfer();
        transfer.setData("text/uri-list", "data:image/png;base64,not-a-valid-image");

        target.dispatchEvent(new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer
        }));
        target.dispatchEvent(new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer
        }));
    });

    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/unable to load this image/i);
    await dialog.accept();

    await expect(page.locator("#cropModal")).toBeHidden();
    await expect(page.locator(".cropper-container")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
});
