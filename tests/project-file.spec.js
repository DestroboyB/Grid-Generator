import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAU0lEQVR4nO3PQQ3AIADAQEANEpGIrIngcVnSU9DOfe74s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaB90JcByOCc2PwAAAAASUVORK5CYII=";

async function enableImportButtonForTest(page) {
    await page.route("**/*", async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.resourceType() !== "document" ||
            !(url.pathname === "/" || url.pathname.endsWith("/index.html"))) {
            await route.continue();
            return;
        }
        const response = await route.fetch();
        const html = await response.text();
        const restored = html.replace(
            /<!-- Temporarily disabled while the library redesign is stabilized\.\s*<button id="importProjectButton" type="button" class="library-button">Import Grid<\/button>\s*-->/,
            '<button id="importProjectButton" type="button" class="library-button">Import Grid</button>'
        );
        await route.fulfill({ response, body: restored });
    });
}

test("export downloads a versioned editable project file", async ({ page }) => {
    await page.goto("/");
    await page.locator("#rows").selectOption("2");
    await page.locator("#columns").selectOption("3");
    await page.locator("#generateBoard").click();
    await page.locator("#imageRatio").selectOption("4:3");

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#exportProjectButton").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gridproject$/);

    const parsed = JSON.parse(await readFile(await download.path(), "utf8"));
    expect(parsed.format).toBe("grid-generator-project");
    expect(parsed.version).toBe(1);
    expect(parsed.grid).toMatchObject({
        rows: 2,
        columns: 3,
        ratio: "4:3",
        spacing: 0,
        outerPadding: 10,
        backgroundColor: "#ffffff"
    });
    expect(parsed.grid.images).toHaveLength(6);
});

test("import restores a project as a separate grid and rejects invalid files safely", async ({ page }) => {
    await enableImportButtonForTest(page);
    await page.goto("/");
    const beforeId = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.currentGridId;
    });

    const project = {
        format: "grid-generator-project",
        version: 1,
        grid: {
            name: "Imported Test Project",
            rows: 2,
            columns: 2,
            ratio: "16:9",
            spacing: 7,
            outerPadding: 18,
            backgroundColor: "#123456",
            borderEnabled: false,
            borderSize: 4,
            borderColor: "#654321",
            images: [{ source: tinyPng }, null, null, null],
            undoStack: [],
            redoStack: []
        }
    };

    page.once("dialog", dialog => dialog.accept());
    await page.locator("#importProjectButton").click();
    await page.locator("#projectFileInput").setInputFiles({
        name: "test.gridproject",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project))
    });

    await expect(page.locator("#rows")).toHaveValue("2");
    await expect(page.locator("#columns")).toHaveValue("2");
    await expect(page.locator("#imageRatio")).toHaveValue("16:9");
    await expect(page.locator("#spacing")).toHaveValue("7");
    await expect(page.locator("#outerPadding")).toHaveValue("18");
    await expect(page.locator("#backgroundColor")).toHaveValue("#123456");
    await expect(page.locator("#borderEnabled")).not.toBeChecked();
    await expect(page.locator("#borderSize")).toHaveValue("4");
    await expect(page.locator("#borderColor")).toHaveValue("#654321");
    await expect(page.locator("#board .image")).toHaveCount(4);
    await expect(page.locator('#board .image[data-index="0"] img')).toHaveCount(1);

    const importedId = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.currentGridId;
    });
    expect(importedId).not.toBe(beforeId);

    page.once("dialog", dialog => dialog.accept());
    await page.locator("#importProjectButton").click();
    await page.locator("#projectFileInput").setInputFiles({
        name: "invalid.gridproject",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ format: "wrong", version: 1, grid: {} }))
    });
    await expect(page.locator("#rows")).toHaveValue("2");
    await expect(page.locator("#columns")).toHaveValue("2");
    expect(await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return appState.currentGridId;
    })).toBe(importedId);
});


test("import rejects invalid dimensions and image payloads without changing the active grid", async ({ page }) => {
    await enableImportButtonForTest(page);
    await page.goto("/");
    const before = await page.evaluate(async () => {
        const { appState } = await import("/js/state.js");
        return {
            id: appState.currentGridId,
            rows: document.querySelector("#rows").value,
            columns: document.querySelector("#columns").value
        };
    });

    const invalidProjects = [
        {
            format: "grid-generator-project",
            version: 1,
            grid: { name: "Invalid Dimensions", rows: 11, columns: 2, ratio: "1:1", images: [] }
        },
        {
            format: "grid-generator-project",
            version: 1,
            grid: { name: "Invalid Image", rows: 1, columns: 1, ratio: "1:1", images: ["https://example.com/image.png"] }
        }
    ];

    for (const [index, project] of invalidProjects.entries()) {
        page.once("dialog", dialog => dialog.accept());
        await page.locator("#importProjectButton").click();
        await page.locator("#projectFileInput").setInputFiles({
            name: `invalid-${index}.gridproject`,
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(project))
        });

        await expect.poll(async () => page.evaluate(async () => {
            const { appState } = await import("/js/state.js");
            return appState.currentGridId;
        })).toBe(before.id);
    }

    await expect(page.locator("#rows")).toHaveValue(String(before.rows));
    await expect(page.locator("#columns")).toHaveValue(String(before.columns));
});
