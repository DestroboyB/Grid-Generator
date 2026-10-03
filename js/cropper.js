import { appState } from "./state.js";

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
// Cropper State
// ========================================

// Stores the image data when we are
// updating an existing image.
//
// null = creating/replacing an image
let editingImageData = null;


// ========================================
// Open Cropper For Local File
// ========================================

export function openCropForFile(
    file,
    element
) {

    appState.selectedDiv =
        element;

    editingImageData =
        null;

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

    editingImageData =
        null;

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

    editingImageData =
        imageData;

    cleanupObjectURL();


    cropImage.crossOrigin =
        null;

    cropImage.src =
        imageData.source;


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


    // ========================================
    // Determine Crop Ratio
    // ========================================

    let cropRatio;


    // When updating an existing image,
    // preserve the existing crop ratio.
    if (
        editingImageData &&
        editingImageData.crop
    ) {

        const crop =
            editingImageData.crop;

        cropRatio =
            crop.width /
            crop.height;

    }

    // When creating a new image,
    // use the currently selected board ratio.
    else {

        const [
            ratioWidth,
            ratioHeight
        ] =
            imageRatioInput.value
                .split(":")
                .map(Number);

        cropRatio =
            ratioWidth /
            ratioHeight;
    }


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
                    true,


                // ========================================
                // Restore Existing Crop
                // ========================================

                ready() {

                    if (
                        !editingImageData ||
                        !editingImageData.crop
                    ) {
                        return;
                    }


                    const crop =
                        editingImageData.crop;


                    // Restore the actual crop
                    // coordinates in the original image.
                    this.cropper.setData({

                        x:
                            crop.x,

                        y:
                            crop.y,

                        width:
                            crop.width,

                        height:
                            crop.height
                    });


                    // Restore the visual crop box
                    // position if this image was
                    // previously saved with one.
                    if (
                        editingImageData.cropBox
                    ) {

                        this.cropper.setCropBoxData({

                            left:
                                editingImageData.cropBox.left,

                            top:
                                editingImageData.cropBox.top,

                            width:
                                editingImageData.cropBox.width,

                            height:
                                editingImageData.cropBox.height
                        });
                    }
                }
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
        // Get Crop Data
        // ========================================

        const cropData =
            appState.cropper.getData();


        // Get the visual position and
        // dimensions of the crop box.
        const cropBoxData =
            appState.cropper.getCropBoxData();


        // ========================================
        // Update Existing Image
        // ========================================

        if (editingImageData) {

            appState.savedImages[
                boxIndex
            ] = {

                source:
                    editingImageData.source,


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


                x:
                    editingImageData.x ?? 0,

                y:
                    editingImageData.y ?? 0,

                zoom:
                    editingImageData.zoom ?? 1
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


    editingImageData =
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

// ========================================
// Editor Tool Navigation
// ========================================

const editorTools =
    document.querySelectorAll(".editor-tool");

const editorPanels =
    document.querySelectorAll(".editor-panel");


editorTools.forEach(tool => {

    tool.addEventListener("click", () => {

        const toolName =
            tool.dataset.tool;


        editorTools.forEach(button => {
            button.classList.remove("active");
        });


        editorPanels.forEach(panel => {
            panel.classList.remove("active");
        });


        tool.classList.add("active");


        const panel =
            document.querySelector(
                `.editor-panel[data-panel="${toolName}"]`
            );


        if (panel) {
            panel.classList.add("active");
        }

    });

});