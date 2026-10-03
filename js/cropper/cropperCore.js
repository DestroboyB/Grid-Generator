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
// Create Cropper
// ========================================

export function createCropper(
    cropImage,
    imageRatioInput
) {

    // ========================================
    // Destroy Existing Cropper
    // ========================================

    if (appState.cropper) {

        appState.cropper.destroy();

        appState.cropper =
            null;

    }


    // ========================================
    // Get Crop Ratio
    // ========================================

    const cropRatio =
        getCropRatio(
            imageRatioInput
        );


    // ========================================
    // Create CropperJS
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

                responsive:
                    true,


                // ========================================
                // Cropper Ready
                // ========================================

                ready() {

                    // ========================================
                    // Restore Existing Image Data
                    // ========================================

                    if (
                        cropperState.editingImageData
                    ) {

                        const imageData =
                            cropperState.editingImageData;


                        // ========================================
                        // Restore Crop
                        // ========================================

                        if (
                            imageData.crop
                        ) {

                            const crop =
                                imageData.crop;


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

                        }


                        // ========================================
                        // Restore Crop Box
                        // ========================================

                        if (
                            imageData.cropBox
                        ) {

                            this.cropper.setCropBoxData({

                                left:
                                    imageData.cropBox.left,

                                top:
                                    imageData.cropBox.top,

                                width:
                                    imageData.cropBox.width,

                                height:
                                    imageData.cropBox.height

                            });

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
                    // Apply Saved Adjustments
                    // ========================================

                    applyAdjustments();

                }

            }
        );

}