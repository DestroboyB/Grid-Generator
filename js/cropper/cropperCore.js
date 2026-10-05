import { appState } from "../state.js";

import {
    cropperState
} from "./cropperState.js";

import {
    getCropRatio,
    fitRotatedImage
} from "./cropperTransforms.js";

import {
    applyAdjustments
} from "./cropperAdjust.js";


// ========================================
// Center Existing Cropper Canvas
// ========================================
//
// Repositions the current canvas inside the
// Cropper container without changing its
// width or height.
//
// This is used when the browser window is
// resized while the editor is open.
//

export function centerCropperCanvas() {
    if (!appState.cropper) {
        return;
    }

    const preview = document.querySelector(".editor-preview");

    if (!preview) {
        return;
    }

    const canvasData = appState.cropper.getCanvasData();
    const cropBoxData = appState.cropper.getCropBoxData();

    if (!canvasData || !cropBoxData) {
        return;
    }

    const containerWidth = preview.clientWidth;
    const containerHeight = preview.clientHeight;

    const centeredLeft =
        (containerWidth - canvasData.width) / 2;

    const centeredTop =
        (containerHeight - canvasData.height) / 2;

    // How far the canvas is moving.
    const deltaX =
        centeredLeft - canvasData.left;

    const deltaY =
        centeredTop - canvasData.top;

    // Move the canvas without changing its size.
    appState.cropper.setCanvasData({
        left: centeredLeft,
        top: centeredTop,
        width: canvasData.width,
        height: canvasData.height
    });

    // Move the crop box by the exact same amount.
    // This keeps it attached to the same part of the image.
    appState.cropper.setCropBoxData({
        left: cropBoxData.left + deltaX,
        top: cropBoxData.top + deltaY,
        width: cropBoxData.width,
        height: cropBoxData.height
    });
}


// ========================================
// Create Cropper
// ========================================

export function createCropper(
    cropImage,
    imageRatioInput,
    onReady = null
) {

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
    // Determine Crop Ratio
    // ========================================

    const cropRatio =
        getCropRatio(
            imageRatioInput
        );


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
                    0,

                autoCropArea:
                    1,

                /*
                 * Keep this disabled.
                 *
                 * CropperJS will otherwise recalculate
                 * the image/canvas when the editor
                 * container changes size.
                 */
                responsive:
                    false,


                // ========================================
                // Cropper Ready
                // ========================================

                ready() {

                    // ========================================
                    // Restore Saved Editing State
                    // ========================================

                    if (
                        cropperState.editingImageData
                    ) {

                        const imageData =
                            cropperState.editingImageData;


                        // ========================================
                        // Restore Crop Data
                        // ========================================

                        if (
                            imageData.crop
                        ) {

                            const crop =
                                imageData.crop;


                            this.cropper.setData(
                                {
                                    x:
                                        crop.x,

                                    y:
                                        crop.y,

                                    width:
                                        crop.width,

                                    height:
                                        crop.height
                                }
                            );

                        }


                        // ========================================
                        // Restore Crop Box
                        // ========================================

                        if (
                            imageData.cropBox
                        ) {

                            this.cropper.setCropBoxData(
                                {
                                    left:
                                        imageData.cropBox.left,

                                    top:
                                        imageData.cropBox.top,

                                    width:
                                        imageData.cropBox.width,

                                    height:
                                        imageData.cropBox.height
                                }
                            );

                        }


                        // ========================================
                        // Restore Rotation
                        // ========================================

                        if (
                            cropperState.rotation
                        ) {

                            this.cropper.reset();

                            this.cropper.rotate(
                                cropperState.rotation
                            );

                            this.cropper.setAspectRatio(
                                cropRatio
                            );


                            requestAnimationFrame(
                                () => {

                                    fitRotatedImage(
                                        appState.cropper,
                                        imageRatioInput
                                    );

                                }
                            );

                        }


                        // ========================================
                        // Restore Horizontal Flip
                        // ========================================

                        if (
                            cropperState.flipX
                        ) {

                            this.cropper.scaleX(
                                -1
                            );

                        }


                        // ========================================
                        // Restore Vertical Flip
                        // ========================================

                        if (
                            cropperState.flipY
                        ) {

                            this.cropper.scaleY(
                                -1
                            );

                        }

                    }


                    // ========================================
                    // Apply Adjustments
                    // ========================================

                    applyAdjustments();


                    // ========================================
                    // Tell Caller Cropper Is Ready
                    // ========================================

                    if (
                        onReady
                    ) {

                        onReady();

                    }

                }

            }
        );

}