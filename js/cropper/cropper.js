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
    createCropper,
    centerCropperCanvas
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
    document.getElementById(
        "cropModal"
    );

const cropImage =
    document.getElementById(
        "cropImage"
    );

const cropButton =
    document.getElementById(
        "cropButton"
    );

const cancelButton =
    document.getElementById(
        "cancelButton"
    );

const editorCloseButton =
    document.querySelector(
        ".editor-close"
    );

const board =
    document.getElementById(
        "board"
    );

const imageRatioInput =
    document.getElementById(
        "imageRatio"
    );


// ========================================
// Adjustment Controls
// ========================================

setupAdjustments();

setupFilters();

const cropOutsideImageToggle = document.getElementById("cropOutsideImageToggle");
cropOutsideImageToggle?.addEventListener("change", () => {
    cropperState.allowOutsideImage = cropOutsideImageToggle.checked;

    if (!appState.cropper) {
        return;
    }

    // CropperJS applies viewMode constraints while initializing its crop box.
    // Recreate it with the new mode while restoring the current crop geometry.
    const currentCropper = appState.cropper;
    const crop = currentCropper.getData();
    const cropBox = currentCropper.getCropBoxData();
    const editingImageData = cropperState.editingImageData ?? {};

    cropperState.editingImageData = {
        ...editingImageData,
        source: editingImageData.source ?? cropImage.src,
        originalSource: editingImageData.originalSource ?? editingImageData.source ?? cropImage.src,
        crop: {
            x: crop.x,
            y: crop.y,
            width: crop.width,
            height: crop.height
        },
        cropBox
    };

    cropModal.style.visibility = "hidden";
    currentCropper.destroy();
    appState.cropper = null;

    createCropper(cropImage, imageRatioInput, () => {
        cropModal.style.visibility = "visible";
    });
});

// Fine crop movement is useful for small alignment corrections that are
// difficult to make reliably by dragging with a mouse or touch.
function moveCropBox(dx, dy) {
    if (!appState.cropper || cropModal.style.display === "none" ||
        cropModal.style.visibility === "hidden") return;

    const cropBox = appState.cropper.getCropBoxData();
    if (!cropBox) return;

    appState.cropper.setCropBoxData({
        left: cropBox.left + dx,
        top: cropBox.top + dy
    });
}

const cropNudgeButtons = [
    ["cropNudgeUp", 0, -1],
    ["cropNudgeLeft", -1, 0],
    ["cropNudgeDown", 0, 1],
    ["cropNudgeRight", 1, 0]
];

for (const [id, dx, dy] of cropNudgeButtons) {
    document.getElementById(id)?.addEventListener("click", () => moveCropBox(dx, dy));
}

document.addEventListener("keydown", event => {
    if (!appState.cropper || cropModal.style.display === "none" ||
        cropModal.style.visibility === "hidden" || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target;
    if (target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

    const step = event.shiftKey ? 10 : 1;
    const moves = {
        ArrowUp: [0, -step],
        ArrowLeft: [-step, 0],
        ArrowDown: [0, step],
        ArrowRight: [step, 0]
    };
    const movement = moves[event.key];
    if (!movement) return;

    event.preventDefault();
    moveCropBox(...movement);
});


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
// Keep Cropper Centered During Resize
// ========================================
//
// responsive: false prevents CropperJS from
// changing the image/crop scale when the
// browser window changes size.
//
// We still need to reposition the existing
// canvas after the editor container changes
// size.
//

let resizeFrame = null;

function handleEditorResize() {

    if (
        resizeFrame
    ) {

        cancelAnimationFrame(
            resizeFrame
        );

    }


    resizeFrame =
        requestAnimationFrame(
            () => {

                resizeFrame =
                    null;


                // ========================================
                // Only Recenter When Editor Is Open
                // ========================================

                if (
                    !cropModal ||
                    cropModal.style.display === "none" ||
                    cropModal.style.visibility === "hidden"
                ) {

                    return;

                }


                if (
                    !appState.cropper
                ) {

                    return;

                }


                centerCropperCanvas();

            }
        );

}

window.addEventListener(
    "resize",
    handleEditorResize
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


    reader.onload =
        () => {

            cropImage.crossOrigin =
                null;

            cropImage.src =
                reader.result;


            cropModal.style.display =
                "flex";

            cropModal.style.visibility =
                "hidden";


            // ========================================
            // Create Cropper
            // ========================================

            createCropper(
                cropImage,
                imageRatioInput,
                () => {

                    // ========================================
                    // Restore Default Adjustments
                    // ========================================

                    restoreAdjustments();

                    applyAdjustments();


                    // ========================================
                    // Show Editor
                    // ========================================

                    cropModal.style.visibility =
                        "visible";

                }
            );

        };


    reader.readAsDataURL(
        file
    );

}


// ========================================
// Open Cropper For URL
// ========================================

// ========================================
// Open Cropper For URL
// ========================================

export function openCropForURL(
    imageURL,
    element,
    onReady
) {

    appState.selectedDiv =
        element;

    resetCropperState();

    cleanupObjectURL();


    // ========================================
    // Destroy Existing Cropper
    // ========================================

    if (
        appState.cropper
    ) {

        appState.cropper.destroy();

        appState.cropper =
            null;

    }


    // ========================================
    // Clear Previous Image
    // ========================================

    cropImage.onload =
        null;

    cropImage.onerror =
        null;

    cropImage.removeAttribute(
        "src"
    );


    // ========================================
    // CORS
    // ========================================

    cropImage.crossOrigin =
        "anonymous";


    // ========================================
    // Keep Editor Hidden While Loading
    // ========================================

    cropModal.style.display =
        "flex";

    cropModal.style.visibility =
        "hidden";


    // ========================================
    // Wait For Remote Image
    // ========================================

    cropImage.onload =
        () => {

            cropImage.onload =
                null;

            cropImage.onerror =
                null;


            // ========================================
            // Create Cropper
            // ========================================

            createCropper(
                cropImage,
                imageRatioInput,
                () => {

                    // ========================================
                    // Restore Default Adjustments
                    // ========================================

                    restoreAdjustments();

                    applyAdjustments();


                    // ========================================
                    // Cropper Is Now Ready
                    // ========================================

                    if (
                        onReady
                    ) {

                        onReady();

                    }


                    // ========================================
                    // Show Editor
                    // ========================================

                    cropModal.style.visibility =
                        "visible";

                }
            );

        };


    // ========================================
    // Image Load Error
    // ========================================

    cropImage.onerror =
        () => {

            cropImage.onload =
                null;

            cropImage.onerror =
                null;

            console.error(
                "Unable to load searched image:",
                imageURL
            );

            alert(
                "Unable to load this image. Please try another image."
            );

            closeCropper(
                cropModal,
                cropImage
            );

        };


    // ========================================
    // IMPORTANT:
    // Set crossOrigin BEFORE src
    // ========================================

    cropImage.src =
        imageURL;

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

    // Start each editing session constrained to the image; users can opt out
    // from the Transform panel when they need extra crop area.
    cropperState.allowOutsideImage = false;

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
        imageData.filterName ??
        "none";


    // ========================================
    // Restore Adjustment State
    // ========================================

    cropperState.brightness =
        imageData.brightness ??
        100;

    cropperState.contrast =
        imageData.contrast ??
        100;

    cropperState.saturation =
        imageData.saturation ??
        100;

    cropperState.blur =
        imageData.blur ??
        0;

    cropperState.grayscale =
        imageData.grayscale ??
        0;

    cropperState.sepia =
        imageData.sepia ??
        0;

    cropperState.hueRotate =
        imageData.hueRotate ??
        0;


    cleanupObjectURL();


    // ========================================
    // Use Full Original Image
    // ========================================

    cropImage.crossOrigin =
        null;

    cropImage.src =
        imageData.originalSource ||
        imageData.source;


    // ========================================
    // Keep Editor Hidden Until Ready
    // ========================================

    cropModal.style.display =
        "flex";

    cropModal.style.visibility =
        "hidden";


    // ========================================
    // Create Cropper
    // ========================================

    createCropper(
        cropImage,
        imageRatioInput,
        () => {

            // ========================================
            // Restore Adjustment Controls
            // ========================================

            restoreAdjustments();

            applyAdjustments();


            // ========================================
            // Show Editor
            // ========================================

            cropModal.style.visibility =
                "visible";

        }
    );

}


// ========================================
// Restore Original Image
// ========================================

function restoreOriginalImage() {

    // ========================================
    // Determine Original Image
    // ========================================

    const originalSource =
        cropperState
            .editingImageData
            ?.originalSource ||

        cropperState
            .editingImageData
            ?.source ||

        cropImage.src;


    if (
        !originalSource
    ) {

        return;

    }


    // ========================================
    // Reset All Editing State
    // ========================================

    resetCropperState();


    // ========================================
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

    if (
        appState.cropper
    ) {

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

if (
    restoreOriginalButton
) {

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

if (
    rotateLeftButton
) {

    rotateLeftButton.addEventListener(
        "click",
        () => {

            handleRotate(
                -90
            );

        }
    );

}


// ========================================
// Rotate Right
// ========================================

if (
    rotateRightButton
) {

    rotateRightButton.addEventListener(
        "click",
        () => {

            handleRotate(
                90
            );

        }
    );

}


// ========================================
// Flip Horizontal
// ========================================

if (
    flipHorizontalButton
) {

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

if (
    flipVerticalButton
) {

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
// Editor Close Button
// ========================================

if (
    editorCloseButton
) {

    editorCloseButton.addEventListener(
        "click",
        () => {

            closeCropper(
                cropModal,
                cropImage
            );

        }
    );

}


// ========================================
// Change Crop Ratio While Open
// ========================================

imageRatioInput.addEventListener(
    "change",
    () => {

        if (
            !appState.cropper
        ) {

            return;

        }


        const [
            ratioWidth,
            ratioHeight
        ] =
            imageRatioInput.value
                .split(":")
                .map(
                    Number
                );


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


                if (
                    panel
                ) {

                    panel.classList.add(
                        "active"
                    );

                }

            }
        );

    }
);