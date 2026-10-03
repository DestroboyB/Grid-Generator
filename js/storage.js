
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

    /*
     * IMPORTANT:
     *
     * Do NOT save undoStack or redoStack here.
     *
     * Those stacks can contain multiple copies of
     * large base64 image strings. This can very
     * quickly exceed the browser's localStorage
     * quota, especially with images imported from
     * MyAnimeList.
     *
     * Undo/redo still works during the current
     * session. The stacks simply aren't persisted
     * across a page refresh.
     */

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


    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(boardData)
        );


        return true;

    } catch (error) {

        /*
         * If the images themselves are too large,
         * localStorage may still exceed its quota.
         *
         * Do not allow this error to break actions
         * such as Apply/Crop.
         */

        if (
            error instanceof DOMException &&
            (
                error.name === "QuotaExceededError" ||
                error.code === 22 ||
                error.code === 1014
            )
        ) {

            console.warn(
                "Board could not be saved because browser storage is full."
            );


            /*
             * Try one more time with a lightweight
             * version of the image data.
             *
             * originalSource is only needed to restore
             * the completely original image after a
             * page reload. The current edited source
             * remains available.
             */

            try {

                const lightweightImages =
                    appState.savedImages.map(
                        (image) => {

                            if (!image) {
                                return image;
                            }


                            const {
                                originalSource,
                                ...rest
                            } = image;


                            return rest;
                        }
                    );


                const lightweightBoardData = {

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
                        lightweightImages
                };


                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(
                        lightweightBoardData
                    )
                );


                console.warn(
                    "Board saved without original image sources to reduce storage usage."
                );


                return true;

            } catch (fallbackError) {

                /*
                 * The browser storage is completely full
                 * or the images themselves are too large.
                 *
                 * Remove the saved board so that the
                 * application can continue functioning.
                 */

                console.error(
                    "Unable to save board to browser storage:",
                    fallbackError
                );


                try {

                    localStorage.removeItem(
                        STORAGE_KEY
                    );

                } catch (removeError) {

                    console.error(
                        "Unable to clear full board storage:",
                        removeError
                    );
                }


                return false;
            }

        }


        console.error(
            "Could not save board:",
            error
        );


        return false;
    }
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


        /*
         * Undo/redo history is intentionally reset
         * when the board is loaded.
         *
         * History is session-based rather than
         * persistent because storing image-heavy
         * history can exceed localStorage limits.
         */

        appState.undoStack =
            [];

        appState.redoStack =
            [];


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


    appState.undoStack =
        [];


    appState.redoStack =
        [];
}