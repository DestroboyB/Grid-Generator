import {
    appState
} from "./state.js";


// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");


// ========================================
// Download Board
// ========================================

export async function downloadBoard(format) {

    const boxes =
        Array.from(
            board.querySelectorAll(".image")
        );


    if (boxes.length === 0) {
        return;
    }


    // ========================================
    // Get Board Dimensions
    // ========================================

    const boardRect =
        board.getBoundingClientRect();


    // ========================================
    // Export Resolution
    // ========================================

    const scale = 2;


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        Math.round(
            boardRect.width * scale
        );


    canvas.height =
        Math.round(
            boardRect.height * scale
        );


    const ctx =
        canvas.getContext("2d");


    if (!ctx) {
        return;
    }


    // ========================================
    // Background
    // ========================================

    ctx.fillStyle =
        getComputedStyle(
            board
        ).backgroundColor;


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // ========================================
    // Work In Board Coordinates
    // ========================================

    ctx.scale(
        scale,
        scale
    );


    // ========================================
    // Board Position
    // ========================================

    const boardLeft =
        boardRect.left;

    const boardTop =
        boardRect.top;


    // ========================================
    // Border Settings
    // ========================================

    const borderSize =
        Number(
            appState.borderSize
        ) || 0;


    const borderColor =
        appState.borderColor ||
        "#9ca3af";


    const bordersEnabled =
        appState.borderEnabled !== false;


    // ========================================
    // Draw Each Box
    // ========================================

    for (
        let index = 0;
        index < boxes.length;
        index++
    ) {

        const box =
            boxes[index];


        const img =
            box.querySelector("img");


        const boxRect =
            box.getBoundingClientRect();


        const x =
            boxRect.left -
            boardLeft;


        const y =
            boxRect.top -
            boardTop;


        const width =
            boxRect.width;


        const height =
            boxRect.height;


        // ========================================
        // Determine Border Visibility
        // ========================================

        const isImageBox =
            !!img;


        /*
         * Empty boxes always have borders.
         *
         * Image boxes only have borders when
         * Borders are enabled.
         *
         * A border size of 0 disables all borders.
         */

        const shouldDrawBorder =
            borderSize > 0 &&
            (
                !isImageBox ||
                bordersEnabled
            );


        // ========================================
        // Empty Box
        // ========================================

        if (!img) {

            if (shouldDrawBorder) {

                ctx.save();

                ctx.strokeStyle =
                    borderColor;

                ctx.lineWidth =
                    borderSize;

                ctx.strokeRect(
                    x +
                    borderSize / 2,

                    y +
                    borderSize / 2,

                    width -
                    borderSize,

                    height -
                    borderSize
                );

                ctx.restore();
            }

            continue;
        }


        // ========================================
        // Get Saved Image Data
        // ========================================

        const imageData =
            appState.savedImages[index];


        if (
            !imageData ||
            typeof imageData !== "object"
        ) {
            continue;
        }


        // ========================================
        // Make Sure Image Is Loaded
        // ========================================

        if (
            !img.complete ||
            !img.naturalWidth ||
            !img.naturalHeight
        ) {
            continue;
        }


        const imageWidth =
            img.naturalWidth;


        const imageHeight =
            img.naturalHeight;


        // ========================================
        // Save Canvas State
        // ========================================

        ctx.save();


        // ========================================
        // Clip To Image Box
        // ========================================

        ctx.beginPath();

        ctx.rect(
            x,
            y,
            width,
            height
        );

        ctx.clip();


        // ========================================
        // Apply Saved Filters
        // ========================================

        const brightness =
            imageData.brightness ??
            100;

        const contrast =
            imageData.contrast ??
            100;

        const saturation =
            imageData.saturation ??
            100;

        const blur =
            imageData.blur ??
            0;

        const grayscale =
            imageData.grayscale ??
            0;

        const sepia =
            imageData.sepia ??
            0;

        const hueRotate =
            imageData.hueRotate ??
            0;


        ctx.filter =
            `
                brightness(${brightness}%)
                contrast(${contrast}%)
                saturate(${saturation}%)
                blur(${blur}px)
                grayscale(${grayscale}%)
                sepia(${sepia}%)
                hue-rotate(${hueRotate}deg)
            `
            .replace(/\s+/g, " ")
            .trim();


        // ========================================
        // Calculate Cover Crop
        // ========================================

        const imageRatio =
            imageWidth /
            imageHeight;


        const boxRatio =
            width /
            height;


        let drawWidth =
            width;

        let drawHeight =
            height;


        if (
            imageRatio >
            boxRatio
        ) {

            // Image is wider than the box

            drawHeight =
                height;

            drawWidth =
                height *
                imageRatio;

        } else {

            // Image is taller than the box

            drawWidth =
                width;

            drawHeight =
                width /
                imageRatio;
        }


        // ========================================
        // Center Image In Box
        // ========================================

        const drawX =
            x +
            (
                width -
                drawWidth
            ) / 2;


        const drawY =
            y +
            (
                height -
                drawHeight
            ) / 2;


        // ========================================
        // Draw Final Saved Image
        // ========================================

        ctx.drawImage(

            img,

            0,
            0,
            imageWidth,
            imageHeight,

            drawX,
            drawY,
            drawWidth,
            drawHeight

        );


        // ========================================
        // Restore Canvas State
        // ========================================

        ctx.restore();


        // ========================================
        // Draw Border On Top Of Image
        // ========================================

        if (shouldDrawBorder) {

            ctx.save();

            ctx.strokeStyle =
                borderColor;

            ctx.lineWidth =
                borderSize;

            ctx.strokeRect(
                x +
                borderSize / 2,

                y +
                borderSize / 2,

                width -
                borderSize,

                height -
                borderSize
            );

            ctx.restore();
        }

    }


    // ========================================
    // Determine Format
    // ========================================

    let mimeType;

    let extension;


    switch (format) {

        case "png":

            mimeType =
                "image/png";

            extension =
                "png";

            break;


        case "jpg":

            mimeType =
                "image/jpeg";

            extension =
                "jpg";

            break;


        case "webp":

            mimeType =
                "image/webp";

            extension =
                "webp";

            break;


        default:

            console.error(
                "Unsupported download format:",
                format
            );

            return;
    }


    // ========================================
    // Convert Canvas
    // ========================================

    const image =
        canvas.toDataURL(
            mimeType,
            0.95
        );


    // ========================================
    // Download
    // ========================================

    const link =
        document.createElement(
            "a"
        );


    link.download =
        `grid-board.${extension}`;


    link.href =
        image;


    link.click();
}