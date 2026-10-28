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

// Share identical image entries across the whole history, regardless of
// their tile index. Reordering images changes their array positions, but not
// their image payloads; counting those payloads repeatedly exhausts the
// mobile history budget after only a few moves.
function shareUnchangedHistoryImages(stack) {
    const candidatesBySource = new Map();
    const candidatesWithoutSource = new Map();

    for (const state of stack) {
        if (!Array.isArray(state.images)) {
            continue;
        }

        for (let imageIndex = 0; imageIndex < state.images.length; imageIndex += 1) {
            const image = state.images[imageIndex];
            if (!image || typeof image !== "object") {
                continue;
            }

            if (typeof image.source === "string") {
                let candidates = candidatesBySource.get(image.source);
                if (!candidates) {
                    candidates = [];
                    candidatesBySource.set(image.source, candidates);
                }

                const metadata = JSON.stringify({
                    ...image,
                    source: undefined,
                    originalSource: undefined
                });
                const match = candidates.find(candidate =>
                    candidate.originalSource === image.originalSource &&
                    JSON.stringify({
                        ...candidate,
                        source: undefined,
                        originalSource: undefined
                    }) === metadata
                );

                if (match) {
                    state.images[imageIndex] = match;
                } else {
                    candidates.push(image);
                }
                continue;
            }

            const key = JSON.stringify(image);
            const match = candidatesWithoutSource.get(key);
            if (match) {
                state.images[imageIndex] = match;
            } else {
                candidatesWithoutSource.set(key, image);
            }
        }
    }

    // Reuse the entire array too when every entry is now shared in the same order.
    for (let index = 1; index < stack.length; index += 1) {
        const previousImages = stack[index - 1].images;
        const currentImages = stack[index].images;
        if (
            Array.isArray(previousImages) &&
            Array.isArray(currentImages) &&
            previousImages.length === currentImages.length &&
            previousImages.every((image, imageIndex) => image === currentImages[imageIndex])
        ) {
            stack[index].images = previousImages;
        }
    }
}

function measureHistorySize(stack) {
    const seenImageEntries = new WeakSet();
    let totalChars = 0;

    for (const state of stack) {
        const metadata = { ...state, images: undefined };
        totalChars += JSON.stringify(metadata).length;

        const images = Array.isArray(state.images) ? state.images : [];
        // Account for the array delimiters and separators without recounting
        // image objects shared with other snapshots.
        totalChars += 2 + Math.max(0, images.length - 1);

        for (const image of images) {
            if (image && typeof image === "object") {
                if (seenImageEntries.has(image)) {
                    continue;
                }
                seenImageEntries.add(image);
                totalChars += JSON.stringify(image).length;
            } else if (image !== null && image !== undefined) {
                totalChars += String(image).length;
            }
        }
    }

    return totalChars;
}

// Keep at least two states so Undo remains available after an edit, even if
// a single image is larger than the preferred history budget. Count each
// unique image payload once: changing one tile shouldn't count every unchanged
// tile again in every snapshot. Export the helper for focused budget tests.
export function trimHistoryStack(
    stack,
    maxStates = MAX_HISTORY_STATES,
    maxDataChars = MAX_HISTORY_DATA_CHARS
) {
    shareUnchangedHistoryImages(stack);

    while (
        stack.length > maxStates ||
        (
            stack.length > 2 &&
            measureHistorySize(stack) > maxDataChars
        )
    ) {
        stack.shift();
        shareUnchangedHistoryImages(stack);
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

        outerPadding:
            appState.outerPadding ?? 10,

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
     * Don't serialize the complete state to detect no-op edits: image sources
     * can be large data URLs, and serializing them as part of both full states
     * and then again as image arrays needlessly blocks the main thread.
     */
    if (lastState) {
        const imagesUnchanged =
            JSON.stringify(lastState.images ?? []) ===
            JSON.stringify(currentState.images ?? []);

        const settingsUnchanged =
            lastState.rows === currentState.rows &&
            lastState.columns === currentState.columns &&
            lastState.ratio === currentState.ratio &&
            lastState.spacing === currentState.spacing &&
            lastState.outerPadding === currentState.outerPadding &&
            lastState.backgroundColor === currentState.backgroundColor &&
            lastState.borderEnabled === currentState.borderEnabled &&
            lastState.borderSize === currentState.borderSize &&
            lastState.borderColor === currentState.borderColor;

        if (settingsUnchanged && imagesUnchanged) {
            return;
        }

        // Setting-only edits can reuse the prior image payload.
        if (imagesUnchanged) {
            currentState.images = lastState.images;
        }
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

    appState.outerPadding =
        state.outerPadding ?? 10;

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

    const outerPaddingInput = document.getElementById("outerPadding");
    const outerPaddingValue = document.getElementById("outerPaddingValue");

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

    if (outerPaddingInput) {
        outerPaddingInput.value = appState.outerPadding;
    }

    if (outerPaddingValue) {
        outerPaddingValue.textContent = `${appState.outerPadding} px`;
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