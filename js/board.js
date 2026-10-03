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

        renderAllImages();
}


export function renderImage(div, imageData) {

    div.innerHTML = "";

    div.classList.add("has-image");

    div.style.position = "relative";
    div.style.overflow = "hidden";


    const img =
        document.createElement("img");


    // ========================================
    // New Image Data Model
    // ========================================

    if (typeof imageData === "object") {

        img.src =
            imageData.source;


        img.style.position =
            "absolute";


        img.style.maxWidth =
            "none";


        img.style.maxHeight =
            "none";


        img.onload = () => {

            applyImageCrop(
                div,
                img,
                imageData
            );

        };


        if (img.complete) {

            applyImageCrop(
                div,
                img,
                imageData
            );

        }

    }


    // ========================================
    // Legacy Image Data
    // ========================================

    else {

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


    div.appendChild(img);

    div.draggable = true;
}

function applyImageCrop(
    div,
    img,
    imageData
) {

    const crop =
        imageData.crop;


    if (!crop) {
        return;
    }


    const naturalWidth =
        img.naturalWidth;

    const naturalHeight =
        img.naturalHeight;


    if (
        !naturalWidth ||
        !naturalHeight
    ) {
        return;
    }


    // ========================================
    // Calculate Image Scale
    // ========================================

    const scaleX =
        div.clientWidth /
        crop.width;

    const scaleY =
        div.clientHeight /
        crop.height;


    const scale =
        Math.max(
            scaleX,
            scaleY
        );


    const displayWidth =
        naturalWidth * scale;

    const displayHeight =
        naturalHeight * scale;


    img.style.width =
        `${displayWidth}px`;

    img.style.height =
        `${displayHeight}px`;


    // ========================================
    // Position Image
    // ========================================

    const cropCenterX =
        crop.x +
        (crop.width / 2);

    const cropCenterY =
        crop.y +
        (crop.height / 2);


    const boxCenterX =
        div.clientWidth / 2;

    const boxCenterY =
        div.clientHeight / 2;


    img.style.left =
        `${boxCenterX - (cropCenterX * scale)}px`;

    img.style.top =
        `${boxCenterY - (cropCenterY * scale)}px`;


    // ========================================
    // Transform
    // ========================================

    const rotation =
        imageData.rotation ?? 0;

    const flipX =
        imageData.flipX
            ? -1
            : 1;

    const flipY =
        imageData.flipY
            ? -1
            : 1;


    img.style.transform =
        `rotate(${rotation}deg) scale(${flipX}, ${flipY})`;


    img.style.transformOrigin =
        "center center";
}


// ========================================
// Clear Single Image Box
// ========================================

export function clearImageBox(
    div,
    index
) {

    div.innerHTML =
        "";

       div.classList.remove(
        "has-image"
    );
    div.style.position =
        "";

    div.style.overflow =
        "";

    div.textContent =
        index + 1;

    div.draggable =
        false;
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
        rows * columns;


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
        }


        board.appendChild(
            div
        );
    }


    // ========================================
    // Apply Dimensions / Styling
    // ========================================

    updateBoardStyle();
}