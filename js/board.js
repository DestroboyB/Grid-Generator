import { appState } from "./state.js";


// ========================================
// Board Elements
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
// Generate Board
// ========================================

export function generateBoard() {

    const rows =
        Number(rowsInput.value);

    const columns =
        Number(columnsInput.value);


    // ========================================
    // Image Ratio
    // ========================================

    const [
        ratioWidth,
        ratioHeight
    ] =
        imageRatioInput.value
            .split(":")
            .map(Number);


    const boxRatio =
        ratioWidth / ratioHeight;


    const totalBoxes =
        rows * columns;


    // ========================================
    // Remove Images That No Longer Fit
    // ========================================

    if (
        appState.savedImages.length >
        totalBoxes
    ) {

        appState.savedImages.length =
            totalBoxes;
    }


    // ========================================
    // Board Limits
    // ========================================

    const maxBoardWidth =
        Math.min(
            window.innerWidth * 0.90,
            1200
        );


    const maxBoardHeight =
        window.innerHeight * 0.80;


    const boardPadding =
        20;


    // ========================================
    // User Spacing
    // ========================================

    const spacing =
        Number(
            appState.spacing
        );


    // ========================================
    // Available Dimensions
    // ========================================

    const availableWidth =
        maxBoardWidth -
        (boardPadding * 2);


    const availableHeight =
        maxBoardHeight -
        (boardPadding * 2);


    // ========================================
    // Start By Fitting Width
    // ========================================

    let boxWidth =
        (
            availableWidth -
            (spacing * (columns - 1))
        ) / columns;


    let boxHeight =
        boxWidth / boxRatio;


    // ========================================
    // Check Height
    // ========================================

    let requiredHeight =
        (boxHeight * rows) +
        (spacing * (rows - 1));


    if (
        requiredHeight >
        availableHeight
    ) {

        // Height is limiting factor
        boxHeight =
            (
                availableHeight -
                (spacing * (rows - 1))
            ) / rows;


        boxWidth =
            boxHeight * boxRatio;


        // Make sure width still fits
        const totalWidth =
            (boxWidth * columns) +
            (spacing * (columns - 1));


        if (
            totalWidth >
            availableWidth
        ) {

            boxWidth =
                (
                    availableWidth -
                    (spacing * (columns - 1))
                ) / columns;


            boxHeight =
                boxWidth / boxRatio;
        }
    }


    // ========================================
    // Final Dimensions
    // ========================================

    const finalWidth =
        (boxWidth * columns) +
        (spacing * (columns - 1));


    const finalHeight =
        (boxHeight * rows) +
        (spacing * (rows - 1));


    // ========================================
    // Board Size
    // ========================================

    const boardWidth =
        finalWidth +
        (boardPadding * 2);


    const boardHeight =
        finalHeight +
        (boardPadding * 2);


    board.style.width =
        `${boardWidth}px`;


    board.style.height =
        `${boardHeight}px`;


    // ========================================
    // Grid
    // ========================================

    board.style.gridTemplateColumns =
        `repeat(${columns}, ${boxWidth}px)`;


    board.style.gridTemplateRows =
        `repeat(${rows}, ${boxHeight}px)`;


    board.style.gap =
        `${spacing}px`;


    // ========================================
    // Background
    // ========================================

    board.style.backgroundColor =
        appState.backgroundColor;


    // ========================================
    // Create Boxes
    // ========================================

    board.innerHTML = "";


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
        div.draggable =
    Boolean(
        appState.savedImages[i]
    );

        div.textContent =
            i + 1;


        // ========================================
        // Restore Image
        // ========================================

        if (
            appState.savedImages[i]
        ) {

            div.innerHTML =
                "";


            const img =
                document.createElement(
                    "img"
                );


            img.src =
                appState.savedImages[i];


            div.appendChild(
                img
            );

            div.draggable = true;
        }


        // ========================================
        // Add Box
        // ========================================

        board.appendChild(
            div
        );
    }
}