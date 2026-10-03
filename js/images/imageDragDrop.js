import { appState } from "../state.js";

import {
    saveHistoryState
} from "../history.js";

import {
    openCropForFile,
    openCropForURL
} from "../cropper/cropper.js";

import {
    renderImage,
    clearImageBox
} from "../board.js";

// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");


// ========================================
// Drag State
// ========================================

let draggedDiv = null;


// ========================================
// Drag Start
// ========================================

board.addEventListener(
    "dragstart",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );

        if (!div) {
            return;
        }

        // Only images already in the board
        // can be dragged for reordering
        if (
            !div.querySelector("img")
        ) {

            event.preventDefault();

            return;
        }

        draggedDiv =
            div;

        event.dataTransfer.effectAllowed =
            "move";

        event.dataTransfer.setData(
            "text/plain",
            "grid-image"
        );

        div.classList.add(
            "dragging"
        );
    }
);


// ========================================
// Drag Over
// ========================================

board.addEventListener(
    "dragover",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );

        if (!div) {
            return;
        }

        // ========================================
        // Existing Image Being Moved
        // ========================================

        if (draggedDiv) {

            // Don't highlight source box
            if (
                div === draggedDiv
            ) {
                return;
            }

            event.preventDefault();

            event.dataTransfer.dropEffect =
                "move";

            clearDragHighlights();

            div.classList.add(
                "drag-over"
            );

            return;
        }


        // ========================================
        // External File / URL
        // ========================================

        const types =
            event.dataTransfer.types;

        if (
            types.includes("Files") ||
            types.includes("text/uri-list")
        ) {

            event.preventDefault();

            clearDragHighlights();

            div.classList.add(
                "drag-over"
            );
        }
    }
);


// ========================================
// Drag Leave
// ========================================

board.addEventListener(
    "dragleave",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );

        if (!div) {
            return;
        }

        // Only remove highlight when actually
        // leaving the box
        if (
            !div.contains(
                event.relatedTarget
            )
        ) {

            div.classList.remove(
                "drag-over"
            );
        }
    }
);


// ========================================
// Drop
// ========================================

board.addEventListener(
    "drop",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );

        if (!div) {
            return;
        }

        event.preventDefault();


        // ========================================
        // Internal Image Reordering
        // ========================================

        if (draggedDiv) {

            if (
                div !== draggedDiv
            ) {

                swapImages(
                    draggedDiv,
                    div
                );
            }

            clearDragState();

            return;
        }


        // ========================================
        // External Image
        // ========================================

        div.classList.remove(
            "drag-over"
        );


        // ========================================
        // Dropped File
        // ========================================

        const files =
            Array.from(
                event.dataTransfer.files
            );

        if (
            files.length > 0
        ) {

            const imageFile =
                files.find(
                    file =>
                        file.type.startsWith(
                            "image/"
                        )
                );

            if (imageFile) {

                openCropForFile(
                    imageFile,
                    div
                );

                return;
            }
        }


        // ========================================
        // Image From Browser Tab
        // ========================================

        const imageURL =
            event.dataTransfer.getData(
                "text/uri-list"
            );

        if (imageURL) {

            openCropForURL(
                imageURL,
                div
            );
        }
    }
);


// ========================================
// Drag End
// ========================================

board.addEventListener(
    "dragend",
    () => {

        clearDragState();
    }
);


// ========================================
// Clear Drag Highlights
// ========================================

function clearDragHighlights() {

    board
        .querySelectorAll(
            ".image"
        )
        .forEach(
            div => {

                div.classList.remove(
                    "drag-over"
                );
            }
        );
}


// ========================================
// Clear Drag State
// ========================================

function clearDragState() {

    board
        .querySelectorAll(
            ".image"
        )
        .forEach(
            div => {

                div.classList.remove(
                    "dragging"
                );

                div.classList.remove(
                    "drag-over"
                );
            }
        );

    draggedDiv =
        null;
}


// ========================================
// Update Image Border State
// ========================================

function updateImageBorder(div) {

    if (
        div.querySelector("img")
    ) {

        div.classList.add(
            "has-image"
        );

    } else {

        div.classList.remove(
            "has-image"
        );
    }
}


// ========================================
// Swap / Move Images
// ========================================

function swapImages(
    firstDiv,
    secondDiv
) {

    const boxes =
        Array.from(
            board.children
        );

    const firstIndex =
        boxes.indexOf(
            firstDiv
        );

    const secondIndex =
        boxes.indexOf(
            secondDiv
        );

    if (
        firstIndex === -1 ||
        secondIndex === -1
    ) {
        return;
    }


    // ========================================
    // Swap Saved Images
    // ========================================

    const temp =
        appState.savedImages[
            firstIndex
        ];

    appState.savedImages[
        firstIndex
    ] =
        appState.savedImages[
            secondIndex
        ];

    appState.savedImages[
        secondIndex
    ] =
        temp;


    // ========================================
    // Update First Box
    // ========================================

    const firstImage =
        appState.savedImages[
            firstIndex
        ];

    if (firstImage) {

        renderImage(
            firstDiv,
            firstImage
        );

    } else {

        clearImageBox(
            firstDiv,
            firstIndex
        );
    }


    // ========================================
    // Update Second Box
    // ========================================

    const secondImage =
        appState.savedImages[
            secondIndex
        ];

    if (secondImage) {

        renderImage(
            secondDiv,
            secondImage
        );

    } else {

        clearImageBox(
            secondDiv,
            secondIndex
        );
    }


    // ========================================
    // Update Border State
    // ========================================

    updateImageBorder(
        firstDiv
    );

    updateImageBorder(
        secondDiv
    );


    // ========================================
    // Save Completed State
    // ========================================

    saveHistoryState();
}