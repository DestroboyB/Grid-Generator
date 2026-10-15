import { test, expect } from "@playwright/test";

test("board download exports the requested image format and filename", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const board = document.getElementById("board");
        board.replaceChildren();
        board.style.width = "240px";
        board.style.height = "160px";
        board.style.display = "block";

        const box = document.createElement("div");
        box.className = "image";
        box.style.width = "240px";
        box.style.height = "160px";
        board.append(box);

        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalAnchorClick = HTMLAnchorElement.prototype.click;
        const exports = [];

        HTMLCanvasElement.prototype.toDataURL = function (mimeType, quality) {
            exports.push({ mimeType, quality, width: this.width, height: this.height });
            return `data:${mimeType};base64,dGVzdA==`;
        };

        HTMLAnchorElement.prototype.click = function () {
            exports[exports.length - 1].filename = this.download;
            exports[exports.length - 1].href = this.href;
        };

        try {
            const { downloadBoard } = await import(
                `/js/download.js?download-format-test=${Date.now()}`
            );

            for (const format of ["png", "jpg", "webp"]) {
                await downloadBoard(format);
            }
        } finally {
            HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
            HTMLAnchorElement.prototype.click = originalAnchorClick;
        }

        return exports;
    });

    expect(result).toHaveLength(3);
    expect(result.map(item => item.mimeType)).toEqual([
        "image/png",
        "image/jpeg",
        "image/webp"
    ]);
    expect(result.map(item => item.filename)).toEqual([
        "grid-board.png",
        "grid-board.jpg",
        "grid-board.webp"
    ]);
    expect(result.every(item => item.href.startsWith(`data:${item.mimeType};`))).toBe(true);
    expect(result.every(item => item.width === 480 && item.height === 320)).toBe(true);
    expect(result.every(item => item.quality === 0.95)).toBe(true);
});

test("unsupported download formats do not trigger a download", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const board = document.getElementById("board");
        board.replaceChildren();

        const box = document.createElement("div");
        box.className = "image";
        board.append(box);

        let clicked = false;
        const originalAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            clicked = true;
        };

        try {
            const { downloadBoard } = await import(
                `/js/download.js?download-invalid-format-test=${Date.now()}`
            );
            await downloadBoard("bmp");
        } finally {
            HTMLAnchorElement.prototype.click = originalAnchorClick;
        }

        return { clicked };
    });

    expect(result.clicked).toBe(false);
});

test("an empty board does not create a download", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
        const board = document.getElementById("board");
        board.replaceChildren();

        let clicked = false;
        const originalAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            clicked = true;
        };

        try {
            const { downloadBoard } = await import(
                `/js/download.js?download-empty-board-test=${Date.now()}`
            );
            await downloadBoard("png");
        } finally {
            HTMLAnchorElement.prototype.click = originalAnchorClick;
        }

        return { clicked };
    });

    expect(result.clicked).toBe(false);
});
