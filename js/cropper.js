import { appState } from "./state.js";

import {
    saveBoard
} from "./storage.js";

import {
    saveHistoryState
} from "./history.js";

import {
    renderImage
} from "./board.js";
// ========================================
// Elements
// ========================================

const cropModal =
    document.getElementById("cropModal");

const cropImage =
    document.getElementById("cropImage");

const cropButton =
    document.getElementById("cropButton");

const cancelButton =
    document.getElementById("cancelButton");

const board =
    document.getElementById("board");

const imageRatioInput =
    document.getElementById("imageRatio");


// ========================================
// Open Cropper For Local File
// ========================================

export function openCropForFile(
    file,
    element
) {

    appState.selectedDiv =
        element;


    cleanupObjectURL();


    // ========================================
    // Read Original File
    // ========================================

    const reader =
        new FileReader();


    reader.onload = () => {

        // Store the original image
        // as persistent data.
        cropImage.crossOrigin =
            null;

        cropImage.src =
            reader.result;


        cropModal.style.display =
            "flex";


        createCropper();
    };


    reader.readAsDataURL(
        file
    );
}


// ========================================
// Open Cropper For URL
// ========================================

export function openCropForURL(
    imageURL,
    element
) {

    appState.selectedDiv =
        element;


    cleanupObjectURL();


    cropImage.crossOrigin =
        "anonymous";


    cropImage.src =
        imageURL;


    cropModal.style.display =
        "flex";


    createCropper();
}


// ========================================
// Create Cropper
// ========================================

function createCropper() {

    if (appState.cropper) {

        appState.cropper.destroy();

        appState.cropper =
            null;
    }


    const [
        ratioWidth,
        ratioHeight
    ] =
        imageRatioInput.value
            .split(":")
            .map(Number);


    const cropRatio =
        ratioWidth /
        ratioHeight;


    appState.cropper =
        new Cropper(
            cropImage,
            {

                aspectRatio:
                    cropRatio,

                viewMode:
                    1,

                autoCropArea:
                    1,

                responsive:
                    true

            }
        );
}


// ========================================
// Crop Button
// ========================================

cropButton.addEventListener(
    "click",
    () => {

        if (
            !appState.cropper ||
            !appState.selectedDiv
        ) {
            return;
        }


        // ========================================
        // Find Box
        // ========================================

        const boxIndex =
            Array.from(
                board.children
            ).indexOf(
                appState.selectedDiv
            );


        if (boxIndex === -1) {
            return;
        }


        // ========================================
        // Get Original Image
        // ========================================

        const source =
            cropImage.src;


        if (!source) {
            return;
        }


        // ========================================
        // Get Crop Data
        // ========================================

        const cropData =
            appState.cropper.getData();


        // ========================================
        // Save Image Data
        // ========================================

        appState.savedImages[
            boxIndex
        ] = {

            source:
                source,

            crop: {

                x:
                    cropData.x,

                y:
                    cropData.y,

                width:
                    cropData.width,

                height:
                    cropData.height
            },

            x:
                0,

            y:
                0,

            zoom:
                1
        };


       // ========================================
// Save History
// ========================================

saveHistoryState();


// ========================================
// Display Image
// ========================================

renderImage(
    appState.selectedDiv,
    appState.savedImages[boxIndex]
);


// ========================================
// Close
// ========================================

closeCropper();
    }
);


// ========================================
// Cancel Button
// ========================================

cancelButton.addEventListener(
    "click",
    () => {

        closeCropper();
    }
);


// ========================================
// Close Cropper
// ========================================

function closeCropper() {

    cropModal.style.display =
        "none";


    if (appState.cropper) {

        appState.cropper.destroy();

        appState.cropper =
            null;
    }


    cleanupObjectURL();


    appState.selectedDiv =
        null;


    cropImage.src =
        "";
}


// ========================================
// Cleanup Temporary Object URL
// ========================================

function cleanupObjectURL() {

    if (
        appState.currentObjectURL
    ) {

        URL.revokeObjectURL(
            appState.currentObjectURL
        );


        appState.currentObjectURL =
            null;
    }
}


// ========================================
// Change Crop Ratio While Open
// ========================================

imageRatioInput.addEventListener(
    "change",
    () => {

        if (!appState.cropper) {
            return;
        }


        const [
            ratioWidth,
            ratioHeight
        ] =
            imageRatioInput.value
                .split(":")
                .map(Number);


        const cropRatio =
            ratioWidth /
            ratioHeight;


        appState.cropper.setAspectRatio(
            cropRatio
        );
    }
);