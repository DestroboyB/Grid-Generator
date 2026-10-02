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


    // Higher resolution export
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


    // ========================================
    // Background
    // ========================================

    ctx.fillStyle =
        "white";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // Work in normal board coordinates
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
    // Draw Each Box
    // ========================================

    for (const box of boxes) {

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
        // Draw Border
        // ========================================

        ctx.strokeStyle =
            "black";


        ctx.lineWidth =
            2;


        ctx.strokeRect(
            x,
            y,
            width,
            height
        );


        // ========================================
        // Empty Box
        // ========================================

        if (!img) {
            continue;
        }


        // ========================================
        // Image Dimensions
        // ========================================

        const imageWidth =
            img.naturalWidth;


        const imageHeight =
            img.naturalHeight;


        const imageRatio =
            imageWidth /
            imageHeight;


        const boxRatio =
            width /
            height;


        // ========================================
        // Calculate Cover Crop
        // ========================================

        let sourceX =
            0;

        let sourceY =
            0;

        let sourceWidth =
            imageWidth;

        let sourceHeight =
            imageHeight;


        // Image is wider than box
        if (
            imageRatio >
            boxRatio
        ) {

            sourceWidth =
                imageHeight *
                boxRatio;


            sourceX =
                (
                    imageWidth -
                    sourceWidth
                ) / 2;

        }

        // Image is taller than box
        else {

            sourceHeight =
                imageWidth /
                boxRatio;


            sourceY =
                (
                    imageHeight -
                    sourceHeight
                ) / 2;
        }


        // ========================================
        // Draw Image
        // ========================================

        ctx.drawImage(

            img,

            sourceX,
            sourceY,

            sourceWidth,
            sourceHeight,

            x,
            y,

            width,
            height
        );
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
        document.createElement("a");


    link.download =
        `grid-board.${extension}`;


    link.href =
        image;


    link.click();
}