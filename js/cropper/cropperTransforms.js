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


    // ========================================
    // Fit the Entire Rotated Image in the Preview
    // ========================================
    //
    // A 90/270-degree rotation can make a wide image taller than the
    // preview, or a tall image wider than it. Shrink (never enlarge) the
    // rotated canvas to fit the preview, then resize the crop box to the
    // largest size that fits both the image and the selected aspect ratio.

    const canvas = cropper.getCanvasData();
    const cropBox = cropper.getCropBoxData();
    const container = cropper.getContainerData();

    if (
        canvas && cropBox && container &&
        canvas.width > 0 && canvas.height > 0 &&
        container.width > 0 && container.height > 0
    ) {
        const scale = Math.min(
            1,
            container.width / canvas.width,
            container.height / canvas.height
        );
        const fittedWidth = canvas.width * scale;
        const fittedHeight = canvas.height * scale;
        const left = (container.width - fittedWidth) / 2;
        const top = (container.height - fittedHeight) / 2;

        const ratio = getCropRatio(imageRatioInput);
        const cropWidth = Math.min(
            fittedWidth,
            fittedHeight * ratio
        );
        const cropHeight = cropWidth / ratio;

        // Shrink the crop box first. In viewMode 1, CropperJS will not
        // shrink the canvas below the current crop box, so trying to fit
        // the canvas first can leave a rotated image far taller than the
        // preview. Keep the interim crop box centered in the container.
        cropper.setCropBoxData({
            left: (container.width - cropWidth) / 2,
            top: (container.height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight
        });

        cropper.setCanvasData({
            left,
            top,
            width: fittedWidth,
            height: fittedHeight
        });

        const fittedCanvas = cropper.getCanvasData();

        // CropperJS may clamp the requested canvas geometry. Reposition the
        // crop box against the geometry it actually accepted.
        cropper.setCropBoxData({
            left: fittedCanvas.left + (fittedCanvas.width - cropWidth) / 2,
            top: fittedCanvas.top + (fittedCanvas.height - cropHeight) / 2,
            width: Math.min(cropWidth, fittedCanvas.width, fittedCanvas.height * ratio),
            height: Math.min(cropWidth, fittedCanvas.width, fittedCanvas.height * ratio) / ratio
        });
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