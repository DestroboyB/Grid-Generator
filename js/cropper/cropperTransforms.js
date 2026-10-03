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

    // ========================================
    // Existing Image
    // ========================================

    if (
        cropperState.editingImageData &&
        cropperState.editingImageData.crop
    ) {

        const crop =
            cropperState.editingImageData.crop;


        return (
            crop.width /
            crop.height
        );
    }


    // ========================================
    // New Image
    // ========================================

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
    imageRatioInput,
    fitRotatedImageCallback
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
    // Fit Rotated Image
    // ========================================

    requestAnimationFrame(() => {

        fitRotatedImageCallback();

    });


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


    // ========================================
    // Get Container
    // ========================================

    const container =
        cropper.getContainerData();


    const canvas =
        cropper.getCanvasData();


    if (
        !container ||
        !canvas ||
        !canvas.width ||
        !canvas.height
    ) {
        return;
    }


    // ========================================
    // Current Canvas Dimensions
    // ========================================

    const canvasWidth =
        Math.abs(canvas.width);

    const canvasHeight =
        Math.abs(canvas.height);


    // ========================================
    // Calculate Scale
    // ========================================

    const widthScale =
        container.width /
        canvasWidth;


    const heightScale =
        container.height /
        canvasHeight;


    const scale =
        Math.min(
            widthScale,
            heightScale,
            1
        );


    // ========================================
    // New Canvas Dimensions
    // ========================================

    const newWidth =
        canvasWidth *
        scale;


    const newHeight =
        canvasHeight *
        scale;


    // ========================================
    // Center Image
    // ========================================

    const newLeft =
        (
            container.width -
            newWidth
        ) / 2;


    const newTop =
        (
            container.height -
            newHeight
        ) / 2;


    // ========================================
    // Apply Canvas
    // ========================================

    cropper.setCanvasData({

        left:
            newLeft,

        top:
            newTop,

        width:
            newWidth,

        height:
            newHeight

    });


    // ========================================
    // Fit Crop Box
    // ========================================

    const cropRatio =
        getCropRatio(
            imageRatioInput
        );


    let cropWidth =
        newWidth;


    let cropHeight =
        cropWidth /
        cropRatio;


    // ========================================
    // If Too Tall
    // ========================================

    if (
        cropHeight >
        newHeight
    ) {

        cropHeight =
            newHeight;


        cropWidth =
            cropHeight *
            cropRatio;

    }


    // ========================================
    // Center Crop Box
    // ========================================

    const cropLeft =
        (
            container.width -
            cropWidth
        ) / 2;


    const cropTop =
        (
            container.height -
            cropHeight
        ) / 2;


    // ========================================
    // Apply Crop Box
    // ========================================

    cropper.setCropBoxData({

        left:
            cropLeft,

        top:
            cropTop,

        width:
            cropWidth,

        height:
            cropHeight

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