import { appState } from "./state.js";


// ========================================
// Elements
// ========================================

const rowsInput =
    document.getElementById("rows");

const columnsInput =
    document.getElementById("columns");

const imageRatioInput =
    document.getElementById("imageRatio");

const spacingInput =
    document.getElementById("spacing");

const backgroundColorInput =
    document.getElementById(
        "backgroundColor"
    );


// ========================================
// Storage Key
// ========================================

const STORAGE_KEY =
    "gridBoardData";


// ========================================
// Save Board
// ========================================

export function saveBoard() {

    const boardData = {

        rows:
            rowsInput.value,

        columns:
            columnsInput.value,

        ratio:
            imageRatioInput.value,

        spacing:
            appState.spacing,

        backgroundColor:
            appState.backgroundColor,

        images:
            appState.savedImages
    };


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(boardData)
    );
}


// ========================================
// Load Board
// ========================================

export function loadBoard() {

    const savedData =
        localStorage.getItem(
            STORAGE_KEY
        );


    if (!savedData) {
        return false;
    }


    try {

        const boardData =
            JSON.parse(savedData);


        // ========================================
        // Board Settings
        // ========================================

        if (
            boardData.rows !== undefined
        ) {

            rowsInput.value =
                boardData.rows;
        }


        if (
            boardData.columns !== undefined
        ) {

            columnsInput.value =
                boardData.columns;
        }


        if (
            boardData.ratio !== undefined
        ) {

            imageRatioInput.value =
                boardData.ratio;
        }


        // ========================================
        // Spacing
        // ========================================

        appState.spacing =
            Number(
                boardData.spacing ?? 0
            );


        spacingInput.value =
            appState.spacing;


        // ========================================
        // Background
        // ========================================

        appState.backgroundColor =
            boardData.backgroundColor ||
            "#ffffff";


        backgroundColorInput.value =
            appState.backgroundColor;


        // ========================================
        // Images
        // ========================================

        appState.savedImages =
            Array.isArray(
                boardData.images
            )
                ? boardData.images
                : [];


        return true;

    } catch (error) {

        console.error(
            "Could not load saved board:",
            error
        );


        return false;
    }
}


// ========================================
// Clear Saved Board
// ========================================

export function clearSavedBoard() {

    localStorage.removeItem(
        STORAGE_KEY
    );


    appState.savedImages =
        [];


    appState.spacing =
        0;


    appState.backgroundColor =
        "#ffffff";
}