import { appState } from "../state.js";

import {
    cropperState,
    resetCropperState
} from "./cropperState.js";

import {
    saveHistoryState
} from "../history.js";

import {
    saveBoard
} from "../storage.js";

import {
    renderImage
} from "../board.js";


// ========================================
// Apply Crop
// ========================================

export function applyCrop(
    cropImage,
    board,
    cropModal
) {

    if (
        !appState.cropper ||
        !appState.selectedDiv
    ) {
        console.error(
            "Cannot apply crop: cropper or selected image is missing."
        );

        return;
    }


    // ========================================
// Determine Box Index
// ========================================

let boxIndex = -1;


// ========================================
// Use Stored Board Index
// ========================================

if (
    appState.selectedDiv &&
    appState.selectedDiv.dataset.index !== undefined
) {

    boxIndex =
        Number(
            appState.selectedDiv.dataset.index
        );

}


// ========================================
// Fallback To DOM Lookup
// ========================================

if (
    boxIndex === -1 &&
    appState.selectedDiv
) {

    boxIndex =
        Array.from(
            board.children
        ).indexOf(
            appState.selectedDiv
        );

}


// ========================================
// Validate Index
// ========================================

if (
    boxIndex < 0 ||
    boxIndex >= board.children.length
) {

    console.error(
        "Cannot apply crop: selected board element was not found.",
        {
            selectedDiv:
                appState.selectedDiv,

            boxIndex,

            boardChildren:
                board.children.length
        }
    );

    return;
}


    // ========================================
    // Get Crop Data
    // ========================================

    const cropData =
        appState.cropper.getData();


    // ========================================
    // Generate Final Cropped Image
    // ========================================

    let canvas;

    let source;


    try {

        canvas =
            appState.cropper.getCroppedCanvas({
                imageSmoothingEnabled: true,
                imageSmoothingQuality: "high"
            });


        if (!canvas) {

            console.error(
                "CropperJS did not return a canvas."
            );

            return;
        }


        source =
            canvas.toDataURL(
                "image/png"
            );

    } catch (error) {

        console.error(
            "Unable to create cropped image:",
            error
        );


        if (
            error.name ===
            "SecurityError"
        ) {

            alert(
                "This MyAnimeList image cannot be edited because the image server does not allow browser image editing. Please try another image."
            );

        } else {

            alert(
                "Unable to apply the crop. Please try another image."
            );

        }


        return;
    }


    // ========================================
    // Preserve Full Original Image
    // ========================================

    let originalSource;


    if (
        cropperState.editingImageData
    ) {

        originalSource =
            cropperState.editingImageData.originalSource ||
            cropperState.editingImageData.source;

    } else {

        originalSource =
            cropImage.src;

    }


    // ========================================
    // Preserve Existing Position Data
    // ========================================

    const oldImage =
        cropperState.editingImageData;


    // ========================================
    // Save Image Data
    // ========================================

    appState.savedImages[
        boxIndex
    ] = {

        source,

        originalSource,

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

        rotation:
            cropperState.rotation,

        flipX:
            cropperState.flipX,

        flipY:
            cropperState.flipY,

        filterName:
            cropperState.filterName ?? "none",

        brightness:
            cropperState.brightness,

        contrast:
            cropperState.contrast,

        saturation:
            cropperState.saturation,

        blur:
            cropperState.blur,

        grayscale:
            cropperState.grayscale,

        sepia:
            cropperState.sepia,

        hueRotate:
            cropperState.hueRotate,

        x:
            oldImage?.x ?? 0,

        y:
            oldImage?.y ?? 0,

        zoom:
            oldImage?.zoom ?? 1

    };


    // ========================================
    // Save History
    // ========================================

    saveHistoryState();


    // ========================================
    // Save Board
    // ========================================

    saveBoard();


    // ========================================
    // Update Board Image
    // ========================================

    const currentBoardElement =
    board.children[boxIndex];


renderImage(
    currentBoardElement,
    appState.savedImages[boxIndex]
);


    // ========================================
    // Close Cropper
    // ========================================

    closeCropper(
        cropModal,
        cropImage
    );
}


// ========================================
// Close Cropper
// ========================================

export function closeCropper(
    cropModal,
    cropImage
) {

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


    resetCropperState();


    cropImage.src =
        "";

}


// ========================================
// Cleanup Object URL
// ========================================

export function cleanupObjectURL() {

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