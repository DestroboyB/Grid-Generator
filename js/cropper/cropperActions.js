import { appState } from "../state.js";

import {
    saveHistoryState
} from "../history.js";

import {
    renderImage
} from "../board.js";

import {
    cropperState,
    resetCropperState
} from "./cropperState.js";


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
    // Get Crop Data
    // ========================================

    const cropData =
        appState.cropper.getData();


    // ========================================
    // Get Crop Box Data
    // ========================================

    const cropBoxData =
        appState.cropper.getCropBoxData();


    // ========================================
    // Update Existing Image
    // ========================================

    if (
        cropperState.editingImageData
    ) {

        appState.savedImages[
            boxIndex
        ] = {

            source:
                cropperState
                    .editingImageData
                    .source,


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


            cropBox: {

                left:
                    cropBoxData.left,

                top:
                    cropBoxData.top,

                width:
                    cropBoxData.width,

                height:
                    cropBoxData.height

            },


            // ========================================
            // Transform
            // ========================================

            rotation:
                cropperState.rotation,

            flipX:
                cropperState.flipX,

            flipY:
                cropperState.flipY,


            // ========================================
            // Existing Position Data
            // ========================================

            x:
                cropperState
                    .editingImageData
                    .x ?? 0,

            y:
                cropperState
                    .editingImageData
                    .y ?? 0,

            zoom:
                cropperState
                    .editingImageData
                    .zoom ?? 1

        };

    }


    // ========================================
    // Create New Image
    // ========================================

    else {

        const source =
            cropImage.src;


        if (!source) {
            return;
        }


        appState.savedImages[
            boxIndex
        ] = {

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


            cropBox: {

                left:
                    cropBoxData.left,

                top:
                    cropBoxData.top,

                width:
                    cropBoxData.width,

                height:
                    cropBoxData.height

            },


            // ========================================
            // Transform
            // ========================================

            rotation:
                cropperState.rotation,

            flipX:
                cropperState.flipX,

            flipY:
                cropperState.flipY,


            // ========================================
            // Default Position Data
            // ========================================

            x:
                0,

            y:
                0,

            zoom:
                1

        };

    }


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

    closeCropper(
        cropModal,
        cropImage
    );

}


// ========================================
// Cancel / Close Cropper
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
// Cleanup Temporary Object URL
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