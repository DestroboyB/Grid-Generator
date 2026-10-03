// ========================================
// Cropper Editing State
// ========================================

export const cropperState = {

    editingImageData:
        null,

    rotation:
        0,

    flipX:
        false,

    flipY:
        false

};


// ========================================
// Reset Cropper State
// ========================================

export function resetCropperState() {

    cropperState.editingImageData =
        null;

    cropperState.rotation =
        0;

    cropperState.flipX =
        false;

    cropperState.flipY =
        false;

}