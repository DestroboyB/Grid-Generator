import { appState } from "./state.js";


// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");

const rowsInput =
    document.getElementById("rows");

const columnsInput =
    document.getElementById("columns");

const imageRatioInput =
    document.getElementById("imageRatio");


// ========================================
// Apply Cell Border
// ========================================

function applyCellBorder(div) {

    const borderSize =
        Number(appState.borderSize) || 0;

    const borderColor =
        appState.borderColor || "#9ca3af";

    // Empty boxes always use the configured border.
    // Image boxes can additionally be disabled by the Borders toggle.
    const isImageBox =
        div.classList.contains("has-image");

    const shouldShowBorder =
        borderSize > 0 &&
        (!isImageBox || appState.borderEnabled);

    div.style.setProperty(
        "--cell-border-size",
        shouldShowBorder
            ? `${borderSize}px`
            : "0px"
    );

    div.style.setProperty(
        "--cell-border-color",
        borderColor
    );
}


// ========================================
// Board Dimensions
// ========================================

function calculateBoardDimensions() {

    const rows =
        Number(rowsInput.value);

    const columns =
        Number(columnsInput.value);


    const [
        ratioWidth,
        ratioHeight
    ] =
        imageRatioInput.value
            .split(":")
            .map(Number);


    const boxRatio =
        ratioWidth /
        ratioHeight;


    const spacing =
        Number(
            appState.spacing
        );


    const maxBoardWidth =
        Math.min(
            window.innerWidth * 0.90,
            1200
        );


    const maxBoardHeight =
        window.innerHeight * 0.80;


    const boardPadding =
        20;


    const availableWidth =
        maxBoardWidth -
        (boardPadding * 2);


    const availableHeight =
        maxBoardHeight -
        (boardPadding * 2);


    let boxWidth =
        (
            availableWidth -
            (
                spacing *
                (columns - 1)
            )
        ) / columns;


    let boxHeight =
        boxWidth /
        boxRatio;


    const requiredHeight =
        (boxHeight * rows) +
        (
            spacing *
            (rows - 1)
        );


    if (
        requiredHeight >
        availableHeight
    ) {

        boxHeight =
            (
                availableHeight -
                (
                    spacing *
                    (rows - 1)
                )
            ) / rows;


        boxWidth =
            boxHeight *
            boxRatio;


        const totalWidth =
            (boxWidth * columns) +
            (
                spacing *
                (columns - 1)
            );


        if (
            totalWidth >
            availableWidth
        ) {

            boxWidth =
                (
                    availableWidth -
                    (
                        spacing *
                        (columns - 1)
                    )
                ) / columns;


            boxHeight =
                boxWidth /
                boxRatio;
        }
    }


    const finalWidth =
        (boxWidth * columns) +
        (
            spacing *
            (columns - 1)
        );


    const finalHeight =
        (boxHeight * rows) +
        (
            spacing *
            (rows - 1)
        );


    return {

        boardWidth:
            finalWidth +
            (boardPadding * 2),

        boardHeight:
            finalHeight +
            (boardPadding * 2),

        boxWidth:
            boxWidth,

        boxHeight:
            boxHeight
    };
}


// ========================================
// Apply Board Dimensions / Styling
// ========================================

export function updateBoardStyle() {

    const rows =
        Number(rowsInput.value);

    const columns =
        Number(columnsInput.value);


    const dimensions =
        calculateBoardDimensions();


    board.style.width =
        `${dimensions.boardWidth}px`;


    board.style.height =
        `${dimensions.boardHeight}px`;


    board.style.gridTemplateColumns =
        `repeat(${columns}, ${dimensions.boxWidth}px)`;


    board.style.gridTemplateRows =
        `repeat(${rows}, ${dimensions.boxHeight}px)`;


    board.style.gap =
        `${appState.spacing}px`;


    board.style.backgroundColor =
        appState.backgroundColor;


    /*
     * Re-rendering also reapplies
     * the current border state.
     *
     * Only image boxes receive
     * the configurable border.
     */

    renderAllImages();
}


// ========================================
// Render Image
// ========================================

export function renderImage(
    div,
    imageData
) {

    div.innerHTML = "";


    div.classList.add(
        "has-image"
    );


    div.style.position =
        "relative";


    div.style.overflow =
        "hidden";


    const img =
        document.createElement(
            "img"
        );


    // ========================================
    // Image Source
    // ========================================

    if (
        typeof imageData === "object"
    ) {

        img.src =
            imageData.source;


        // ====================================
        // Fill Board Box
        // ====================================

        img.style.position =
            "absolute";


        img.style.left =
            "0";


        img.style.top =
            "0";


        img.style.width =
            "100%";


        img.style.height =
            "100%";


        img.style.objectFit =
            "cover";


        img.style.objectPosition =
            "center";


        // ====================================
        // Apply Adjustments
        // ====================================

        const brightness =
            imageData.brightness ?? 100;

        const contrast =
            imageData.contrast ?? 100;

        const saturation =
            imageData.saturation ?? 100;

        const blur =
            imageData.blur ?? 0;

        const grayscale =
            imageData.grayscale ?? 0;

        const sepia =
            imageData.sepia ?? 0;

        const hueRotate =
            imageData.hueRotate ?? 0;


        img.style.filter =
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

    } else {

        // ====================================
        // Legacy Image
        // ====================================

        img.src =
            imageData;


        img.style.width =
            "100%";


        img.style.height =
            "100%";


        img.style.objectFit =
            "cover";


        img.style.objectPosition =
            "center";
    }


    // ========================================
    // Add Image
    // ========================================

    div.appendChild(
        img
    );


    div.draggable =
        true;


    // ========================================
    // Apply Border
    // ========================================

    /*
     * This is intentionally only called
     * when an image is being rendered.
     */

    applyCellBorder(
        div
    );
}


// ========================================
// Clear Single Image Box
// ========================================

export function clearImageBox(div, index) {

    div.innerHTML = "";

    div.classList.remove("has-image");

    div.style.position = "";
    div.style.overflow = "";

    div.textContent = index + 1;

    div.draggable = false;

    applyCellBorder(div);
}


// ========================================
// Render All Existing Images
// ========================================

export function renderAllImages() {

    const boxes =
        Array.from(
            board.children
        );


    boxes.forEach(
        (div, index) => {

            const imageData =
                appState.savedImages[index];


            if (imageData) {

                renderImage(
                    div,
                    imageData
                );

            } else {

                clearImageBox(
                    div,
                    index
                );
            }
        }
    );
}


// ========================================
// Generate Board
// ========================================

export function generateBoard() {

    const rows =
        Number(rowsInput.value);

    const columns =
        Number(columnsInput.value);


    const totalBoxes =
        rows *
        columns;


    // ========================================
    // Remove Images Beyond Board Size
    // ========================================

    if (
        appState.savedImages.length >
        totalBoxes
    ) {

        appState.savedImages.length =
            totalBoxes;
    }


    // ========================================
    // Rebuild Grid
    // ========================================

    board.innerHTML =
        "";


    for (
        let i = 0;
        i < totalBoxes;
        i++
    ) {

        const div =
            document.createElement(
                "div"
            );


        div.classList.add(
            "image"
        );


        div.dataset.index =
            i;


        const imageData =
            appState.savedImages[i];


        if (imageData) {

            renderImage(
                div,
                imageData
            );

        } else {

            div.textContent =
                i + 1;


            div.draggable =
                false;


            /*
             * Empty boxes intentionally
             * have no configurable border.
             */
        }


        board.appendChild(
            div
        );
    }


    // ========================================
    // Apply Dimensions / Styling
    // ========================================

    const dimensions =
        calculateBoardDimensions();


    board.style.width =
        `${dimensions.boardWidth}px`;


    board.style.height =
        `${dimensions.boardHeight}px`;


    board.style.gridTemplateColumns =
        `repeat(${columns}, ${dimensions.boxWidth}px)`;


    board.style.gridTemplateRows =
        `repeat(${rows}, ${dimensions.boxHeight}px)`;


    board.style.gap =
        `${appState.spacing}px`;


    board.style.backgroundColor =
        appState.backgroundColor;


    // ========================================
    // Final Render
    // ========================================

    renderAllImages();
}