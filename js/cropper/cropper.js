import { appState } from "../state.js";

import {
    cropperState,
    resetCropperState
} from "./cropperState.js";

import {
    getCropRatio,
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
        !imageData.source
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


    cleanupObjectURL();


    cropImage.crossOrigin =
        null;

    cropImage.src =
        imageData.source;


    cropModal.style.display =
        "flex";


    createCropper(
        cropImage,
        imageRatioInput
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