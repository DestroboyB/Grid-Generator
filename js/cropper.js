import { appState } from "./state.js";

import {
    saveBoard
} from "./storage.js";


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


    // Clean up previous URL
    cleanupObjectURL();


    // Create temporary URL
    appState.currentObjectURL =
        URL.createObjectURL(file);


    cropImage.crossOrigin =
        null;


    cropImage.src =
        appState.currentObjectURL;


    cropModal.style.display =
        "flex";


    createCropper();
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

    // Destroy previous cropper
    if (appState.cropper) {

        appState.cropper.destroy();

        appState.cropper =
            null;
    }


    // ========================================
    // Get Selected Ratio
    // ========================================

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


    // ========================================
    // Create Cropper
    // ========================================

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
        // Get Ratio
        // ========================================

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


        // ========================================
        // Output Size
        // ========================================

        const outputWidth =
            500;


        const outputHeight =
            Math.round(
                outputWidth /
                cropRatio
            );


        // ========================================
        // Get Cropped Canvas
        // ========================================

        const canvas =
            appState.cropper
                .getCroppedCanvas(
                    {

                        width:
                            outputWidth,

                        height:
                            outputHeight

                    }
                );


        if (!canvas) {
            return;
        }


        // ========================================
        // Convert To Image
        // ========================================

        const imageURL =
            canvas.toDataURL(
                "image/png"
            );


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
        // Save Image
        // ========================================

        appState.savedImages[
            boxIndex
        ] =
            imageURL;


        saveBoard();


        // ========================================
        // Display Image
        // ========================================

        appState.selectedDiv.innerHTML =
            "";


        const img =
            document.createElement(
                "img"
            );


        img.src =
            imageURL;


        appState.selectedDiv.appendChild(
            img
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