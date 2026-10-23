// ========================================
// Cropper Transform Functions
// ========================================

import { cropperState } from "./cropperState.js";


// ========================================
// Get Crop Ratio
// ========================================

export function getCropRatio(
    imageRatioInput
) {

    // Always use the current board ratio.
    // Saved crop dimensions describe the previous edit and must not
    // override a ratio the user has selected since then.

    const [
        ratioWidth,
        ratioHeight
    ] =
        imageRatioInput.value
            .split(":")
            .map(Number);


    return (
        ratioWidth /
        ratioHeight
    );
}


// ========================================
// Rotate Image
// ========================================

export function rotateImage(
    cropper,
    degrees,
    imageRatioInput
) {

    if (!cropper) {
        return;
    }


    // ========================================
    // Update Rotation
    // ========================================

    cropperState.rotation +=
        degrees;


    cropperState.rotation =
        cropperState.rotation % 360;


    if (
        cropperState.rotation < 0
    ) {

        cropperState.rotation += 360;

    }


    // ========================================
    // Reset Cropper
    // ========================================

    cropper.reset();


    // ========================================
    // Restore Aspect Ratio Before Rotation
    // ========================================
    //
    // setAspectRatio() rebuilds the crop box using the current canvas
    // geometry. Do this while the canvas is still in its reset orientation;
    // changing the ratio after rotation can reposition the crop box against
    // the transformed canvas and make the image appear to shift.

    cropper.setAspectRatio(
        getCropRatio(
            imageRatioInput
        )
    );


    // ========================================
    // Apply Rotation
    // ========================================

    if (
        cropperState.rotation !== 0
    ) {

        cropper.rotate(
            cropperState.rotation
        );

    }




    // ========================================
    // Restore Horizontal Flip
    // ========================================

    if (
        cropperState.flipX
    ) {

        cropper.scaleX(
            -1
        );

    }


    // ========================================
    // Restore Vertical Flip
    // ========================================

    if (
        cropperState.flipY
    ) {

        cropper.scaleY(
            -1
        );

    }

}


// ========================================
// Toggle Horizontal Flip
// ========================================

export function toggleFlipX(
    cropper
) {

    if (!cropper) {
        return;
    }


    cropperState.flipX =
        !cropperState.flipX;


    cropper.scaleX(
        cropperState.flipX
            ? -1
            : 1
    );

}


// ========================================
// Toggle Vertical Flip
// ========================================

export function toggleFlipY(
    cropper
) {

    if (!cropper) {
        return;
    }


    cropperState.flipY =
        !cropperState.flipY;


    cropper.scaleY(
        cropperState.flipY
            ? -1
            : 1
    );

}