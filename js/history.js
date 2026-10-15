import { appState } from "./state.js";

import {
    saveBoard
} from "./storage/grids.js";

import {
    generateBoard,
    updateBoardStyle,
    renderAllImages
} from "./board.js";

// History snapshots include image data URLs, which can be large. Limit both
// the number of snapshots and their serialized size to avoid unbounded memory
// and IndexedDB pressure on mobile browsers.
const MAX_HISTORY_STATES = 10;
const MAX_HISTORY_DATA_CHARS = 16 * 1024 * 1024;

// Keep at least two states so Undo remains available after an edit, even if
// a single image is larger than the preferred history budget. Export the pure
// helper so the size/count policy can be tested without writing large records
// into IndexedDB.
export function trimHistoryStack(
    stack,
    maxStates = MAX_HISTORY_STATES,
    maxDataChars = MAX_HISTORY_DATA_CHARS
) {
    const stateSizes = stack.map(
        state => JSON.stringify(state).length
    );
    let totalChars = stateSizes.reduce(
        (total, size) => total + size,
        0
    );

    while (
        stack.length > maxStates ||
        (
            stack.length > 2 &&
            totalChars > maxDataChars
        )
    ) {
        stack.shift();
        totalChars -= stateSizes.shift();
    }

    return stack;
}

function trimHistory() {
    trimHistoryStack(appState.undoStack);
}

const rowsInput =
    document.getElementById(
        "rows"
    );

const columnsInput =
    document.getElementById(
        "columns"
    );

const imageRatioInput =
    document.getElementById(
        "imageRatio"
    );

function cloneState(
    state
) {

    return JSON.parse(
        JSON.stringify(state)
    );
}

export function getCurrentState() {

    return {

        rows:
            rowsInput.value,

        columns:
            columnsInput.value,

        ratio:
            imageRatioInput.value,

        images:
            cloneState(
                appState.savedImages
            ),

        spacing:
            appState.spacing,

        backgroundColor:
            appState.backgroundColor,

        borderEnabled:
            appState.borderEnabled,

        borderSize:
            appState.borderSize,

        borderColor:
            appState.borderColor
    };
}

export function saveHistoryState() {

    const currentState =
        getCurrentState();

    const lastState =
        appState.undoStack[
            appState.undoStack.length - 1
        ];

    /*
     * Don't create a history entry if
     * nothing actually changed.
     */
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

    /*
     * A new action invalidates the
     * redo history.
     */
    appState.redoStack =
        [];

    // Bound history by both count and image-data size.
    trimHistory();

    updateHistoryButtons();

    /*
     * Persist the current board AND
     * the updated history to IndexedDB.
     */
    saveBoard();
}

export function undo() {

    if (
        appState.undoStack.length <= 1
    ) {
        return;
    }

    const currentState =
        appState.undoStack.pop();

    appState.redoStack.push(
        currentState
    );

    const previousState =
        appState.undoStack[
            appState.undoStack.length - 1
        ];

    restoreState(
        previousState
    );
}

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

function restoreState(
    state
) {

    const previousRows =
        rowsInput.value;

    const previousColumns =
        columnsInput.value;

    const previousRatio =
        imageRatioInput.value;

    rowsInput.value =
        state.rows;

    columnsInput.value =
        state.columns;

    imageRatioInput.value =
        state.ratio;

    appState.savedImages =
        cloneState(
            state.images
        );

    appState.spacing =
        state.spacing;

    appState.backgroundColor =
        state.backgroundColor;

    appState.borderEnabled =
        state.borderEnabled ??
        true;

    appState.borderSize =
        state.borderSize ??
        2;

    appState.borderColor =
        state.borderColor ??
        "#9ca3af";


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

    const borderEnabledInput =
        document.getElementById(
            "borderEnabled"
        );

    const borderColorInput =
        document.getElementById(
            "borderColor"
        );

    const borderSizeInput =
        document.getElementById(
            "borderSize"
        );

    const borderSizeValue =
        document.getElementById(
            "borderSizeValue"
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

    if (borderEnabledInput) {

        borderEnabledInput.checked =
            appState.borderEnabled;
    }

    if (borderColorInput) {

        borderColorInput.value =
            appState.borderColor;
    }

    if (borderSizeInput) {

        borderSizeInput.value =
            appState.borderSize;
    }

    if (borderSizeValue) {

        borderSizeValue.textContent =
            `${appState.borderSize} px`;
    }


    const gridChanged =
        previousRows !==
            String(state.rows) ||

        previousColumns !==
            String(state.columns) ||

        previousRatio !==
            state.ratio;

    if (gridChanged) {

        generateBoard();

    } else {

        updateBoardStyle();
        renderAllImages();
    }

    /*
     * Important:
     *
     * We intentionally do NOT call
     * saveHistoryState() here because
     * undo/redo should move through the
     * existing history rather than create
     * a new history entry.
     *
     * saveBoard() DOES save the current
     * undo/redo stacks to IndexedDB.
     */
    saveBoard();

    updateHistoryButtons();
}

export function initializeHistory() {

    /*
     * If history was loaded from IndexedDB,
     * keep it.
     */
    if (
        appState.undoStack.length > 0
    ) {

        // Also trim history saved by an older app version.
        trimHistory();

        updateHistoryButtons();

        /*
         * Save once so any trimmed history
         * is reflected in IndexedDB.
         */
        saveBoard();

        return;
    }

    /*
     * No saved history exists.
     * Create the initial state.
     */
    appState.undoStack = [
        getCurrentState()
    ];

    appState.redoStack =
        [];

    saveBoard();

    updateHistoryButtons();
}

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