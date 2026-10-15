import { test, expect } from "@playwright/test";

test("detects rows and columns in a grid screenshot with gutters", async () => {
    const result = await (await import("../js/gridDetection.js")).detectGridDimensions(
        createSyntheticGrid(300, 300, 3, 3, 6),
        300,
        300
    );
    expect(result).toEqual({ rows: 3, columns: 3 });
});

test("detects a non-square grid with thick borders", async () => {
    const result = await (await import("../js/gridDetection.js")).detectGridDimensions(
        createSyntheticGrid(400, 240, 2, 4, 8),
        400,
        240
    );
    expect(result).toEqual({ rows: 2, columns: 4 });
});

function createSyntheticGrid(width, height, rows, columns, gutter) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    const colors = [
        [230, 60, 70], [45, 150, 220], [70, 190, 110], [220, 180, 40],
        [150, 80, 210], [30, 180, 170], [240, 120, 40], [100, 110, 130],
        [220, 80, 150], [80, 150, 80], [120, 90, 50], [60, 90, 220]
    ];

    pixels.fill(255);
    const cellWidth = Math.floor((width - gutter * (columns - 1)) / columns);
    const cellHeight = Math.floor((height - gutter * (rows - 1)) / rows);

    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const color = colors[(row * columns + column) % colors.length];
            const left = column * (cellWidth + gutter);
            const top = row * (cellHeight + gutter);
            for (let y = top; y < Math.min(height, top + cellHeight); y += 1) {
                for (let x = left; x < Math.min(width, left + cellWidth); x += 1) {
                    const offset = (y * width + x) * 4;
                    pixels[offset] = color[0];
                    pixels[offset + 1] = color[1];
                    pixels[offset + 2] = color[2];
                    pixels[offset + 3] = 255;
                }
            }
        }
    }
    return pixels;
}
