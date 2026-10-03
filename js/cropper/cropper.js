import { appState } from "../state.js";

import {
    cropperState,
    resetCropperState
} from "./cropperState.js";

import {
    rotateImage,
    fitRotatedImage,
    toggleFlipX,
    toggleFlipY
} from "./cropperTransforms.js";

import {
    createCropper
} from "./cropperCore.js";

import {
    applyCrop,
    closeCropper,
    cleanupObjectURL
} from "./cropperActions.js";

import {
    setupAdjustments,
    restoreAdjustments,
    applyAdjustments,
    setupFilters
} from "./cropperAdjust.js";


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
// Adjustment Controls
// ========================================

setupAdjustments();

setupFilters();


// ========================================
// Transform Buttons
// ========================================

const rotateLeftButton =
    document.getElementById(
        "rotateLeftButton"
    );

const rotateRightButton =
    document.getElementById(
        "rotateRightButton"
    );

const flipHorizontalButton =
    document.getElementById(
        "flipHorizontalButton"
    );

const flipVerticalButton =
    document.getElementById(
        "flipVerticalButton"
    );


// ========================================
// Restore Original Button
// ========================================

const restoreOriginalButton =
    document.getElementById(
        "restoreOriginalButton"
    );


// ========================================
// Open Cropper For Local File
// ========================================

export function openCropForFile(
    file,
    element
) {

    appState.selectedDiv =
        element;

    resetCropperState();

    cleanupObjectURL();


    // ========================================
    // Read Original File
    // ========================================

    const reader =
        new FileReader();


    reader.onload = () => {

        cropImage.crossOrigin =
            null;

        cropImage.src =
            reader.result;


        cropModal.style.display =
            "flex";


        createCropper(
            cropImage,
            imageRatioInput
        );


        // ========================================
        // Restore Default Adjustments
        // ========================================

        restoreAdjustments();

        applyAdjustments();

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

    resetCropperState();

    cleanupObjectURL();


    cropImage.crossOrigin =
        "anonymous";


    cropImage.src =
        imageURL;


    cropModal.style.display =
        "flex";


    createCropper(
        cropImage,
        imageRatioInput
    );


    // ========================================
    // Restore Default Adjustments
    // ========================================

    restoreAdjustments();

    applyAdjustments();

}


// ========================================
// Open Cropper For Existing Image
// ========================================

export function openCropForExistingImage(
    imageData,
    element
) {

    if (
        !imageData ||
        !(
            imageData.originalSource ||
            imageData.source
        )
    ) {
        return;
    }


    appState.selectedDiv =
        element;


    // ========================================
    // Restore Editing State
    // ========================================

    cropperState.editingImageData =
        imageData;


    cropperState.rotation =
        imageData.rotation ?? 0;

    cropperState.flipX =
        imageData.flipX ?? false;

    cropperState.flipY =
        imageData.flipY ?? false;


    // ========================================
    // Restore Filter State
    // ========================================

    cropperState.filterName =
        imageData.filterName ?? "none";


    // ========================================
    // Restore Adjustment State
    // ========================================

    cropperState.brightness =
        imageData.brightness ?? 100;

    cropperState.contrast =
        imageData.contrast ?? 100;

    cropperState.saturation =
        imageData.saturation ?? 100;

    cropperState.blur =
        imageData.blur ?? 0;

    cropperState.grayscale =
        imageData.grayscale ?? 0;

    cropperState.sepia =
        imageData.sepia ?? 0;

    cropperState.hueRotate =
        imageData.hueRotate ?? 0;


    cleanupObjectURL();


    // ========================================
    // Use Full Original Image When Available
    // ========================================

    cropImage.crossOrigin =
        null;

    cropImage.src =
        imageData.originalSource ||
        imageData.source;


    cropModal.style.display =
        "flex";


    createCropper(
        cropImage,
        imageRatioInput
    );


    // ========================================
    // Restore Adjustment Controls
    // ========================================

    restoreAdjustments();

    applyAdjustments();

}


// ========================================
// Restore Original Image
// ========================================

function restoreOriginalImage() {

    // ========================================
    // Make Sure We Have An Existing Image
    // ========================================

    if (
        !cropperState.editingImageData
    ) {
        return;
    }


    const originalSource =
        cropperState.editingImageData.originalSource ||
        cropperState.editingImageData.source;


    if (!originalSource) {
        return;
    }


    // ========================================
    // Reset All Editing State
    // ========================================

    resetCropperState();


    // ========================================
    // IMPORTANT:
    // Clear Editing Image Data
    // ========================================
    //
    // This prevents cropperCore.js from
    // restoring the previous crop/rotation.
    //

    cropperState.editingImageData =
        null;


    // ========================================
    // Replace With Original Image
    // ========================================

    if (appState.cropper) {

        appState.cropper.replace(
            originalSource
        );

    } else {

        cropImage.crossOrigin =
            null;

        cropImage.src =
            originalSource;

        createCropper(
            cropImage,
            imageRatioInput
        );

    }


    // ========================================
    // Restore Default Controls
    // ========================================

    restoreAdjustments();

    applyAdjustments();

}


// ========================================
// Restore Original Button
// ========================================

if (restoreOriginalButton) {

    restoreOriginalButton.addEventListener(
        "click",
        () => {

            restoreOriginalImage();

        }
    );

}


// ========================================
// Rotate Helper
// ========================================

function handleRotate(
    degrees
) {

    rotateImage(
        appState.cropper,
        degrees,
        imageRatioInput,
        () => {

            fitRotatedImage(
                appState.cropper,
                imageRatioInput
            );

        }
    );

}


// ========================================
// Rotate Left
// ========================================

if (rotateLeftButton) {

    rotateLeftButton.addEventListener(
        "click",
        () => {

            handleRotate(-90);

        }
    );

}


// ========================================
// Rotate Right
// ========================================

if (rotateRightButton) {

    rotateRightButton.addEventListener(
        "click",
        () => {

            handleRotate(90);

        }
    );

}


// ========================================
// Flip Horizontal
// ========================================

if (flipHorizontalButton) {

    flipHorizontalButton.addEventListener(
        "click",
        () => {

            toggleFlipX(
                appState.cropper
            );

        }
    );

}


// ========================================
// Flip Vertical
// ========================================

if (flipVerticalButton) {

    flipVerticalButton.addEventListener(
        "click",
        () => {

            toggleFlipY(
                appState.cropper
            );

        }
    );

}


// ========================================
// Crop / Apply Button
// ========================================

cropButton.addEventListener(
    "click",
    () => {

        applyCrop(
            cropImage,
            board,
            cropModal
        );

    }
);


// ========================================
// Cancel Button
// ========================================

cancelButton.addEventListener(
    "click",
    () => {

        closeCropper(
            cropModal,
            cropImage
        );

    }
);


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


// ========================================
// Editor Tool Navigation
// ========================================

const editorTools =
    document.querySelectorAll(
        ".editor-tool"
    );


const editorPanels =
    document.querySelectorAll(
        ".editor-panel"
    );


editorTools.forEach(
    tool => {

        tool.addEventListener(
            "click",
            () => {

                const toolName =
                    tool.dataset.tool;


                editorTools.forEach(
                    button => {

                        button.classList.remove(
                            "active"
                        );

                    }
                );


                editorPanels.forEach(
                    panel => {

                        panel.classList.remove(
                            "active"
                        );

                    }
                );


                tool.classList.add(
                    "active"
                );


                const panel =
                    document.querySelector(
                        `.editor-panel[data-panel="${toolName}"]`
                    );


                if (panel) {

                    panel.classList.add(
                        "active"
                    );

                }

            }
        );

    }
);