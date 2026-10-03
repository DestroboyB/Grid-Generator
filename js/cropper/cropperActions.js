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
        return;
    }


    // ========================================
    // Determine Box Index
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
    // Get Crop Data
    // ========================================

    const cropData =
        appState.cropper.getData();


    // ========================================
    // Generate Final Cropped Image
    // ========================================

    const canvas =
        appState.cropper.getCroppedCanvas({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high"
        });


    if (!canvas) {
        return;
    }


    const source =
        canvas.toDataURL(
            "image/png"
        );


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

        // ========================================
        // Final Display Image
        // ========================================

        source,


        // ========================================
        // Full Original Image
        // ========================================

        originalSource,


        // ========================================
        // Crop Information
        // ========================================

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


        // ========================================
        // Transform Information
        // ========================================

        rotation:
            cropperState.rotation,

        flipX:
            cropperState.flipX,

        flipY:
            cropperState.flipY,


        // ========================================
        // Filter Information
        // ========================================

        filterName:
            cropperState.filterName ?? "none",


        // ========================================
        // Adjustment Information
        // ========================================

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


        // ========================================
        // Existing Position / Zoom
        // ========================================

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

    renderImage(
        appState.selectedDiv,
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