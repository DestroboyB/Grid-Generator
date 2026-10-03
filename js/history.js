import { appState } from "./state.js";

import {
    saveBoard
} from "./storage.js";

import {
    generateBoard,
    updateBoardStyle,
    renderAllImages
} from "./board.js";


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
// Get Current State
// ========================================

export function getCurrentState() {

    return {

        rows:
            rowsInput.value,

        columns:
            columnsInput.value,

        ratio:
            imageRatioInput.value,

        images:
            JSON.parse(
                JSON.stringify(
                    appState.savedImages
                )
            ),

        spacing:
            appState.spacing,

        backgroundColor:
            appState.backgroundColor
    };
}


// ========================================
// Save History State
// ========================================

export function saveHistoryState() {

    const currentState =
        getCurrentState();

    const lastState =
        appState.undoStack[
            appState.undoStack.length - 1
        ];


    // Don't save duplicate states
    if (
        lastState &&
        JSON.stringify(lastState) ===
        JSON.stringify(currentState)
    ) {

        return;
    }


    appState.undoStack.push(
        currentState
    );


    // Any new action clears redo
    appState.redoStack =
        [];


    updateHistoryButtons();

    saveBoard();
}


// ========================================
// Undo
// ========================================

export function undo() {

    // Need at least the current state
    // and one previous state.
    if (
        appState.undoStack.length <= 1
    ) {

        return;
    }


    // Current state goes to redo
    const currentState =
        appState.undoStack.pop();


    appState.redoStack.push(
        currentState
    );


    // Previous state becomes current
    const previousState =
        appState.undoStack[
            appState.undoStack.length - 1
        ];


    restoreState(
        previousState
    );
}


// ========================================
// Redo
// ========================================

export function redo() {

    if (
        appState.redoStack.length === 0
    ) {

        return;
    }


    const nextState =
        appState.redoStack.pop();


    appState.undoStack.push(
        nextState
    );


    restoreState(
        nextState
    );
}


// ========================================
// Restore State
// ========================================

function restoreState(
    state
) {

    const previousRows =
        rowsInput.value;

    const previousColumns =
        columnsInput.value;

    const previousRatio =
        imageRatioInput.value;


    // ========================================
    // Restore Inputs
    // ========================================

    rowsInput.value =
        state.rows;

    columnsInput.value =
        state.columns;

    imageRatioInput.value =
        state.ratio;


    // ========================================
    // Restore Images
    // ========================================

    appState.savedImages =
        JSON.parse(
            JSON.stringify(
                state.images
            )
        );


    // ========================================
    // Restore Board Settings
    // ========================================

    appState.spacing =
        state.spacing;

    appState.backgroundColor =
        state.backgroundColor;


    const spacingInput =
        document.getElementById(
            "spacing"
        );

    const spacingValue =
        document.getElementById(
            "spacingValue"
        );

    const backgroundColorInput =
        document.getElementById(
            "backgroundColor"
        );


    if (spacingInput) {

        spacingInput.value =
            appState.spacing;
    }


    if (spacingValue) {

        spacingValue.textContent =
            `${appState.spacing} px`;
    }


    if (backgroundColorInput) {

        backgroundColorInput.value =
            appState.backgroundColor;
    }


    // ========================================
    // Determine If Grid Structure Changed
    // ========================================

    const gridChanged =
        previousRows !==
            String(state.rows) ||

        previousColumns !==
            String(state.columns) ||

        previousRatio !==
            state.ratio;


    // ========================================
    // Rebuild Only If Necessary
    // ========================================

    if (gridChanged) {

        generateBoard();

    } else {

        updateBoardStyle();

        renderAllImages();
    }


    // ========================================
    // Save
    // ========================================

    saveBoard();

    updateHistoryButtons();
}


// ========================================
// Initialize History
// ========================================

export function initializeHistory() {

    // Don't initialize twice
    if (
        appState.undoStack.length > 0
    ) {

        updateHistoryButtons();

        return;
    }


    appState.undoStack = [
        getCurrentState()
    ];

    appState.redoStack =
        [];


    saveBoard();

    updateHistoryButtons();
}


// ========================================
// Update Undo / Redo Buttons
// ========================================

export function updateHistoryButtons() {

    const undoButton =
        document.getElementById(
            "undoButton"
        );

    const redoButton =
        document.getElementById(
            "redoButton"
        );


    if (undoButton) {

        undoButton.disabled =
            appState.undoStack.length <= 1;
    }


    if (redoButton) {

        redoButton.disabled =
            appState.redoStack.length === 0;
    }
}