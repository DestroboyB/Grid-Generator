import { appState } from "./state.js";

import {
    saveHistoryState
} from "./history.js";

import {
    openCropForFile,
    openCropForExistingImage
} from "./cropper.js";

import {
    clearImageBox
} from "./board.js";

// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");

const imageMenu =
    document.getElementById("imageMenu");

const updateImageButton =
    document.getElementById("updateImageButton");

const replaceImageButton =
    document.getElementById("replaceImageButton");

const deleteImageButton =
    document.getElementById("deleteImageButton");

const closeMenuButton =
    document.getElementById("closeMenuButton");


// ========================================
// Open File Selector
// ========================================

export function openFileSelector(element) {

    appState.selectedDiv =
        element;

    const fileInput =
        document.createElement("input");

    fileInput.type =
        "file";

    fileInput.accept =
        "image/jpeg, image/png, image/webp";

    fileInput.addEventListener(
        "change",
        () => {

            const file =
                fileInput.files[0];

            if (!file) {
                return;
            }

            openCropForFile(
                file,
                element
            );
        }
    );

    fileInput.click();
}


// ========================================
// Show Image Menu
// ========================================

export function showImageMenu(element) {

    appState.menuDiv =
        element;

    imageMenu.style.display =
        "flex";

    imageMenu.style.left =
        "50%";

    imageMenu.style.top =
        "50%";

    imageMenu.style.transform =
        "translate(-50%, -50%)";
}
// ========================================
// Update Existing Image
// ========================================

updateImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }


        const div =
            appState.menuDiv;


        const boxIndex =
            Array.from(
                board.children
            ).indexOf(div);


        if (boxIndex === -1) {
            return;
        }


        const imageData =
            appState.savedImages[boxIndex];


        if (
            !imageData ||
            typeof imageData !== "object"
        ) {
            return;
        }


        // Close the image menu
        imageMenu.style.display =
            "none";


        appState.menuDiv =
            null;


        // Open existing image in Cropper
        openCropForExistingImage(
            imageData,
            div
        );
    }
);

// ========================================
// Replace Image
// ========================================

replaceImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;

        openFileSelector(div);
    }
);


// ========================================
// Delete Image
// ========================================

deleteImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        const boxIndex =
            Array.from(
                board.children
            ).indexOf(div);

        if (boxIndex === -1) {
            return;
        }

        // Remove saved image
        appState.savedImages[
            boxIndex
        ] = null;

        // Clear the visual box
        clearImageBox(
            div,
            boxIndex
        );

        // Save completed state
        saveHistoryState();

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;
    }
);


// ========================================
// Close Image Menu
// ========================================

closeMenuButton.addEventListener(
    "click",
    () => {

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;
    }
);


// ========================================
// Click On Board
// ========================================

board.addEventListener(
    "click",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );

        if (!div) {
            return;
        }

        // Don't process clicks on buttons
        if (
            event.target.closest("button")
        ) {
            return;
        }

        // Image already exists
        if (
            div.querySelector("img")
        ) {

            showImageMenu(div);

        } else {

            openFileSelector(div);
        }
    }
);