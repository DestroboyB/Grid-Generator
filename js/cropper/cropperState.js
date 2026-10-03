export const cropperState = {

    editingImageData: null,

    rotation: 0,

    flipX: false,

    flipY: false,


    // ========================================
    // Selected Filter
    // ========================================

    filterName: "none",


    // ========================================
    // Adjustments
    // ========================================

    brightness: 100,

    contrast: 100,

    saturation: 100,

    blur: 0,


    // ========================================
    // Additional Filter Effects
    // ========================================

    grayscale: 0,

    sepia: 0,

    hueRotate: 0
};


export function resetCropperState() {

    cropperState.editingImageData =
        null;

    cropperState.rotation =
        0;

    cropperState.flipX =
        false;

    cropperState.flipY =
        false;


    // ========================================
    // Reset Filter
    // ========================================

    cropperState.filterName =
        "none";


    // ========================================
    // Reset Adjustments
    // ========================================

    cropperState.brightness =
        100;

    cropperState.contrast =
        100;

    cropperState.saturation =
        100;

    cropperState.blur =
        0;


    // ========================================
    // Reset Filter Effects
    // ========================================

    cropperState.grayscale =
        0;

    cropperState.sepia =
        0;

    cropperState.hueRotate =
        0;
}