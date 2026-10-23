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
    // Restore Aspect Ratio
    // ========================================

    cropper.setAspectRatio(
        getCropRatio(
            imageRatioInput
        )
    );




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
// Fit Rotated Image Inside Container
// ========================================

export function fitRotatedImage(
    cropper,
    imageRatioInput
) {

    if (!cropper) {
        return;
    }

    const container = cropper.getContainerData();
    const canvas = cropper.getCanvasData();

    if (
        !container ||
        !canvas ||
        !canvas.width ||
        !canvas.height
    ) {
        return;
    }

    // Fit only the image canvas. CropperJS has already established the crop
    // box for the selected aspect ratio; moving/resizing that box here can
    // make the image appear to slide underneath it after a quarter-turn.
    const scale = Math.min(
        container.width / Math.abs(canvas.width),
        container.height / Math.abs(canvas.height),
        1
    );

    const width = Math.abs(canvas.width) * scale;
    const height = Math.abs(canvas.height) * scale;

    cropper.setCanvasData({
        left: (container.width - width) / 2,
        top: (container.height - height) / 2,
        width,
        height
    });
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