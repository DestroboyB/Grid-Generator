import { appState } from "../state.js";

import {
    openCropForURL
} from "../cropper/cropper.js";

const urlImageModal =
    document.getElementById(
        "urlImageModal"
    );

const urlImageInput =
    document.getElementById(
        "urlImageInput"
    );

const urlImageLoadButton =
    document.getElementById(
        "urlImageLoadButton"
    );

const urlImageCancelButton =
    document.getElementById(
        "urlImageCancelButton"
    );

const urlImageCloseButton =
    document.getElementById(
        "urlImageCloseButton"
    );

const urlImageUseButton =
    document.getElementById(
        "urlImageUseButton"
    );

const urlImageStatus =
    document.getElementById(
        "urlImageStatus"
    );

const urlImagePreview =
    document.getElementById(
        "urlImagePreview"
    );

const urlImagePreviewImage =
    document.getElementById(
        "urlImagePreviewImage"
    );

let previewURL = "";


/* ========================================
   Open URL Dialog
======================================== */

export function openUrlImage(element) {

    appState.selectedDiv =
        element;

    previewURL = "";

    urlImageInput.value = "";

    urlImageStatus.textContent =
        "";

    urlImagePreviewImage.src =
        "";

    urlImagePreview.style.display =
        "none";

    urlImageUseButton.disabled =
        true;

    urlImageModal.style.display =
        "flex";

    setTimeout(
        () => {
            urlImageInput.focus();
        },
        0
    );
}


/* ========================================
   Close URL Dialog
======================================== */

export function closeUrlImage() {

    urlImageModal.style.display =
        "none";

    urlImageInput.value = "";

    urlImageStatus.textContent =
        "";

    urlImagePreviewImage.src =
        "";

    urlImagePreview.style.display =
        "none";

    urlImageUseButton.disabled =
        true;

    previewURL = "";
}


/* ========================================
   Preview Image
======================================== */

function previewImageFromURL() {

    const url =
        urlImageInput.value.trim();

    if (!url) {

        urlImageStatus.textContent =
            "Enter an image URL.";

        return;
    }


    let parsedURL;

    try {

        parsedURL =
            new URL(url);

    } catch {

        urlImageStatus.textContent =
            "Please enter a valid URL.";

        return;
    }


    if (
        parsedURL.protocol !== "http:" &&
        parsedURL.protocol !== "https:"
    ) {

        urlImageStatus.textContent =
            "Please enter an HTTP or HTTPS image URL.";

        return;
    }


    urlImageStatus.textContent =
        "Loading preview...";

    urlImagePreview.style.display =
        "none";

    urlImageUseButton.disabled =
        true;


    const testImage =
        new Image();

    testImage.crossOrigin =
        "anonymous";


    testImage.onload = () => {

        previewURL = url;

        urlImagePreviewImage.src =
            url;

        urlImagePreview.style.display =
            "flex";

        urlImageUseButton.disabled =
            false;

        urlImageStatus.textContent =
            "Image loaded successfully.";

    };


    testImage.onerror = () => {

        previewURL = "";

        urlImagePreviewImage.src =
            "";

        urlImagePreview.style.display =
            "none";

        urlImageUseButton.disabled =
            true;

        urlImageStatus.textContent =
            "Unable to load this image. The URL may be invalid or the image server may not allow browser access.";

    };


    testImage.src =
        url;
}


/* ========================================
   Use Image
======================================== */

function useImage() {

    if (!previewURL) {
        return;
    }

    const selectedDiv =
        appState.selectedDiv;

    if (!selectedDiv) {

        closeUrlImage();

        return;
    }

    const imageURL =
        previewURL;

    closeUrlImage();

    try {

        openCropForURL(
            imageURL,
            selectedDiv
        );

    } catch (error) {

        console.error(
            "Unable to open URL image:",
            error
        );

        urlImageModal.style.display =
            "flex";

        urlImageStatus.textContent =
            "Unable to open this image in the editor.";

    }
}


/* ========================================
   Button Events
======================================== */

urlImageLoadButton.addEventListener(
    "click",
    () => {

        previewImageFromURL();

    }
);


urlImageUseButton.addEventListener(
    "click",
    () => {

        useImage();

    }
);


urlImageInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            previewImageFromURL();

        }

    }
);


urlImageCancelButton.addEventListener(
    "click",
    () => {

        closeUrlImage();

    }
);


urlImageCloseButton.addEventListener(
    "click",
    () => {

        closeUrlImage();

    }
);


/* ========================================
   Close Outside Modal
======================================== */

urlImageModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            urlImageModal
        ) {

            closeUrlImage();

        }

    }
);