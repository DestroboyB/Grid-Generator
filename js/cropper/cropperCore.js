import { appState } from "../state.js";

import {
    cropperState
} from "./cropperState.js";

import {
    getCropRatio,
    fitRotatedImage
} from "./cropperTransforms.js";


// ========================================
// Create Cropper
// ========================================

export function createCropper(
    cropImage,
    imageRatioInput
) {

    if (appState.cropper) {

        appState.cropper.destroy();

        appState.cropper =
            null;
    }


    const cropRatio =
        getCropRatio(
            imageRatioInput
        );


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
                // Restore Existing Image
                // ========================================

                ready() {

                    if (
                        !cropperState.editingImageData ||
                        !cropperState.editingImageData.crop
                    ) {
                        return;
                    }


                    const crop =
                        cropperState.editingImageData.crop;


                    // ========================================
                    // Restore Crop
                    // ========================================

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


                    // ========================================
                    // Restore Crop Box
                    // ========================================

                    if (
                        cropperState.editingImageData.cropBox
                    ) {

                        this.cropper.setCropBoxData({

                            left:
                                cropperState
                                    .editingImageData
                                    .cropBox
                                    .left,

                            top:
                                cropperState
                                    .editingImageData
                                    .cropBox
                                    .top,

                            width:
                                cropperState
                                    .editingImageData
                                    .cropBox
                                    .width,

                            height:
                                cropperState
                                    .editingImageData
                                    .cropBox
                                    .height
                        });
                    }


                    // ========================================
                    // Restore Rotation
                    // ========================================

                    if (
                        cropperState.rotation
                    ) {

                        /*
                         * Reset before rotation so the
                         * old crop box does not interfere
                         * with the rotated image.
                         */

                        this.cropper.reset();


                        this.cropper.rotate(
                            cropperState.rotation
                        );


                        this.cropper.setAspectRatio(
                            cropRatio
                        );


                        /*
                         * Give Cropper a frame to finish
                         * recalculating the rotated canvas
                         * before resizing it.
                         */

                        requestAnimationFrame(() => {

                            fitRotatedImage(
                                appState.cropper,
                                imageRatioInput
                            );

                        });
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
            }
        );
}