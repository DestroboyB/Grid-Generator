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


    // Nothing saved
    if (!savedData) {
        return false;
    }


    try {

        const boardData =
            JSON.parse(savedData);


        // ========================================
        // Restore Board Settings
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
        // Restore Images
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
}