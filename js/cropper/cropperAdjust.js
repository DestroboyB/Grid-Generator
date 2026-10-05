import {
    cropperState
} from "./cropperState.js";


// ========================================
// Elements
// ========================================

const brightnessInput =
    document.getElementById(
        "brightnessInput"
    );

const contrastInput =
    document.getElementById(
        "contrastInput"
    );

const saturationInput =
    document.getElementById(
        "saturationInput"
    );

const blurInput =
    document.getElementById(
        "blurInput"
    );

const brightnessValue =
    document.getElementById(
        "brightnessValue"
    );

const contrastValue =
    document.getElementById(
        "contrastValue"
    );

const saturationValue =
    document.getElementById(
        "saturationValue"
    );

const blurValue =
    document.getElementById(
        "blurValue"
    );


// ========================================
// Filter Presets
// ========================================

const filterPresets = {

    none: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0
    },

    grayscale: {
        brightness: 100,
        contrast: 100,
        saturation: 0,
        blur: 0,
        grayscale: 100,
        sepia: 0,
        hueRotate: 0
    },

    sepia: {
        brightness: 100,
        contrast: 100,
        saturation: 80,
        blur: 0,
        grayscale: 0,
        sepia: 80,
        hueRotate: 0
    },

    warm: {
        brightness: 105,
        contrast: 105,
        saturation: 115,
        blur: 0,
        grayscale: 0,
        sepia: 15,
        hueRotate: 0
    },

    cool: {
        brightness: 100,
        contrast: 105,
        saturation: 110,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 180
    },

    vintage: {
        brightness: 105,
        contrast: 90,
        saturation: 75,
        blur: 0,
        grayscale: 10,
        sepia: 25,
        hueRotate: 0
    },

    "high-contrast": {
        brightness: 100,
        contrast: 150,
        saturation: 105,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0
    }

};


// ========================================
// Get Filter String
// ========================================

export function getFilterString() {

    return `
        brightness(${cropperState.brightness}%)
        contrast(${cropperState.contrast}%)
        saturate(${cropperState.saturation}%)
        blur(${cropperState.blur}px)
        grayscale(${cropperState.grayscale ?? 0}%)
        sepia(${cropperState.sepia ?? 0}%)
        hue-rotate(${cropperState.hueRotate ?? 0}deg)
    `
        .replace(/\s+/g, " ")
        .trim();
}


// ========================================
// Apply Adjustments
// ========================================

export function applyAdjustments() {

    const filter =
        getFilterString();


    // ========================================
    // Cropper Images
    // ========================================

    const cropperImages =
        document.querySelectorAll(
            ".cropper-container img"
        );


    cropperImages.forEach(
        image => {

            image.style.filter =
                filter;

        }
    );


    // ========================================
    // Original Image
    // ========================================

    const cropImage =
        document.getElementById(
            "cropImage"
        );


    if (cropImage) {

        cropImage.style.filter =
            filter;

    }
}


// ========================================
// Update Adjustment Value Displays
// ========================================

function updateAdjustmentValues() {

    if (brightnessValue) {

        brightnessValue.textContent =
            `${cropperState.brightness}%`;

    }


    if (contrastValue) {

        contrastValue.textContent =
            `${cropperState.contrast}%`;

    }


    if (saturationValue) {

        saturationValue.textContent =
            `${cropperState.saturation}%`;

    }


    if (blurValue) {

        blurValue.textContent =
            `${cropperState.blur}px`;

    }
}


// ========================================
// Restore Adjustment Controls
// ========================================

export function restoreAdjustments() {

    // ========================================
    // Restore Sliders
    // ========================================

    if (brightnessInput) {

        brightnessInput.value =
            cropperState.brightness;

    }


    if (contrastInput) {

        contrastInput.value =
            cropperState.contrast;

    }


    if (saturationInput) {

        saturationInput.value =
            cropperState.saturation;

    }


    if (blurInput) {

        blurInput.value =
            cropperState.blur;

    }


    // ========================================
    // Restore Value Displays
    // ========================================

    updateAdjustmentValues();


    // ========================================
    // Restore Filter Button
    // ========================================

    const filterButtons =
        document.querySelectorAll(
            ".filter-button"
        );


    filterButtons.forEach(
        button => {

            button.classList.remove(
                "active"
            );

        }
    );


    const activeFilter =
        cropperState.filterName ??
        "none";


    const activeButton =
        document.querySelector(
            `.filter-button[data-filter="${activeFilter}"]`
        );


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }
}


// ========================================
// Apply Filter Preset
// ========================================

export function applyFilterPreset(
    filterName
) {

    const preset =
        filterPresets[filterName];

    if (!preset) {
        return;
    }


    // ========================================
    // Remember Selected Filter
    // ========================================

    cropperState.filterName =
        filterName;


    // ========================================
    // Copy Preset Values Into State
    // ========================================

    cropperState.brightness =
        preset.brightness;

    cropperState.contrast =
        preset.contrast;

    cropperState.saturation =
        preset.saturation;

    cropperState.blur =
        preset.blur;

    cropperState.grayscale =
        preset.grayscale;

    cropperState.sepia =
        preset.sepia;

    cropperState.hueRotate =
        preset.hueRotate;


    // ========================================
    // Update Adjustment Sliders
    // ========================================

    restoreAdjustments();


    // ========================================
    // Apply Filter
    // ========================================

    applyAdjustments();
}


// ========================================
// Setup Adjustment Controls
// ========================================

export function setupAdjustments() {

    // ========================================
    // Brightness
    // ========================================

    if (brightnessInput) {

        brightnessInput.addEventListener(
            "input",
            () => {

                cropperState.brightness =
                    Number(
                        brightnessInput.value
                    );


                cropperState.filterName =
                    "none";


                updateAdjustmentValues();

                applyAdjustments();

            }
        );

    }


    // ========================================
    // Contrast
    // ========================================

    if (contrastInput) {

        contrastInput.addEventListener(
            "input",
            () => {

                cropperState.contrast =
                    Number(
                        contrastInput.value
                    );


                cropperState.filterName =
                    "none";


                updateAdjustmentValues();

                applyAdjustments();

            }
        );

    }


    // ========================================
    // Saturation
    // ========================================

    if (saturationInput) {

        saturationInput.addEventListener(
            "input",
            () => {

                cropperState.saturation =
                    Number(
                        saturationInput.value
                    );


                cropperState.filterName =
                    "none";


                updateAdjustmentValues();

                applyAdjustments();

            }
        );

    }


    // ========================================
    // Blur
    // ========================================

    if (blurInput) {

        blurInput.addEventListener(
            "input",
            () => {

                cropperState.blur =
                    Number(
                        blurInput.value
                    );


                cropperState.filterName =
                    "none";


                updateAdjustmentValues();

                applyAdjustments();

            }
        );

    }


    // ========================================
    // Initialize Displays
    // ========================================

    updateAdjustmentValues();
}


// ========================================
// Setup Filter Buttons
// ========================================

export function setupFilters() {

    const filterButtons =
        document.querySelectorAll(
            ".filter-button"
        );


    filterButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const filterName =
                        button.dataset.filter;


                    // ========================================
                    // Update Active Button
                    // ========================================

                    filterButtons.forEach(
                        filterButton => {

                            filterButton.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    // ========================================
                    // Apply Preset
                    // ========================================

                    applyFilterPreset(
                        filterName
                    );

                }
            );

        }
    );
}