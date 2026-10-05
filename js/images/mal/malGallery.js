import {
    getItemDetail,
    getItemPictures
} from "./malApi.js";

import {
    getItemName,
    getImageURL,
    getPictureURL
} from "./malUtils.js";

import {
    openCropForURL
} from "../../cropper/cropper.js";


/* ========================================
   Loading Overlay Cleanup
======================================== */

function removePictureLoadingOverlay() {

    const loadingOverlay =
        document.querySelector(
            "#malSearchModal .mal-picture-loading-overlay"
        );

    if (loadingOverlay) {

        loadingOverlay.remove();

    }
}


/* ========================================
   Open Picture Gallery
======================================== */

export async function openPictureGallery({
    item,
    mode,
    targetElement,
    resultsElement,
    galleryElement,
    galleryTitleElement,
    galleryGridElement,
    statusElement,
    backButton,
    onCloseGallery,
    onBackToResults
}) {

    /*
     * Remove any loading overlay left
     * over from a previous image selection.
     */

    removePictureLoadingOverlay();


    if (!item || !item.malId) {
        return;
    }


    /*
     * Preserve the current results area's
     * height so the MAL window does not
     * shrink while the gallery loads.
     */

    const galleryHeight =
        galleryGridElement.getBoundingClientRect().height;

    galleryGridElement.style.minHeight =
        `${galleryHeight}px`;


    /*
     * Show the picture gallery.
     */

    resultsElement.style.display =
        "none";

    galleryElement.style.display =
        "grid";


    if (statusElement) {

        statusElement.textContent =
            "Loading pictures...";
    }


    if (galleryTitleElement) {

        galleryTitleElement.textContent =
            `${getItemName(item, mode)} Pictures`;
    }


    galleryGridElement.innerHTML = "";


    const loadingMessage =
        document.createElement("div");

    loadingMessage.className =
        "mal-gallery-loading";

    loadingMessage.textContent =
        "Loading pictures...";

    galleryGridElement.appendChild(
        loadingMessage
    );


    try {

        /*
         * Load the pictures first.
         *
         * This is the important request for
         * the gallery. If it fails, there is
         * nothing useful we can display.
         */

        let pictureResponse = null;

        try {

            pictureResponse =
                await getItemPictures(
                    mode,
                    item.malId
                );

        } catch (error) {

            console.error(
                "Unable to load MAL pictures:",
                error
            );

            throw error;
        }


        /*
         * Try to refresh the item's detail
         * information.
         *
         * If this fails, use the original
         * search result instead. A detail
         * failure should NOT prevent the
         * picture gallery from loading.
         */

        let detailResponse = null;

        try {

            detailResponse =
                await getItemDetail(
                    mode,
                    item.malId
                );

        } catch (error) {

            console.warn(
                "Unable to refresh MAL item details. Using search result instead.",
                error
            );
        }


        const detail =
            detailResponse?.data ||
            item;


        let pictures =
            Array.isArray(
                pictureResponse?.data
            )
                ? pictureResponse.data
                : [];


        /*
         * Make sure the primary image is
         * available in the gallery.
         */

        const primaryImage =
            getImageURL(detail);


        if (primaryImage) {

            const alreadyIncluded =
                pictures.some(
                    picture =>
                        getPictureURL(picture) ===
                        primaryImage
                );


            if (!alreadyIncluded) {

                pictures = [

                    {
                        imageUrl:
                            primaryImage
                    },

                    ...pictures

                ];
            }
        }


        /*
         * Show the total number of
         * available pictures.
         */

        if (statusElement) {

            const itemName =
                getItemName(
                    detail,
                    mode
                );

            statusElement.textContent =
                `Showing ${pictures.length} pictures for ${itemName}`;
        }


        renderPictureGallery({

            pictures,

            galleryGridElement,

            onPictureSelected:
                imageURL => {

                    selectPicture(
                        imageURL,
                        targetElement,
                        onCloseGallery
                    );
                }
        });


        /*
         * Pictures have loaded and the
         * gallery has been rendered.
         *
         * Remove the temporary height
         * restriction.
         */

        galleryGridElement.style.minHeight =
            "";


    } catch (error) {

        console.error(
            "Unable to load MAL pictures:",
            error
        );


        galleryGridElement.innerHTML = "";


        /*
         * Remove the temporary height
         * restriction if loading fails.
         */

        galleryGridElement.style.minHeight =
            "";


        const errorMessage =
            document.createElement("div");

        errorMessage.className =
            "mal-gallery-error";

        errorMessage.textContent =
            "Unable to load pictures right now.";

        galleryGridElement.appendChild(
            errorMessage
        );
    }


    /*
     * Back button.
     *
     * This ONLY returns to the search
     * results. It does not close MAL.
     */

    if (backButton) {

        backButton.style.display =
            "block";


        backButton.onclick = () => {

            if (onBackToResults) {

                onBackToResults();

            } else {

                showSearchView({
                    resultsElement,
                    galleryElement,
                    backButton
                });
            }
        };
    }
}


/* ========================================
   Render Picture Gallery
======================================== */

export function renderPictureGallery({
    pictures,
    galleryGridElement,
    onPictureSelected
}) {

    galleryGridElement.innerHTML = "";


    if (
        !pictures ||
        pictures.length === 0
    ) {

        const emptyMessage =
            document.createElement("div");

        emptyMessage.className =
            "mal-gallery-empty";

        emptyMessage.textContent =
            "No pictures found.";

        galleryGridElement.appendChild(
            emptyMessage
        );

        return;
    }


    pictures.forEach(
        picture => {

            const imageURL =
                getPictureURL(
                    picture
                );


            if (!imageURL) {
                return;
            }


            const pictureButton =
                document.createElement(
                    "button"
                );

            pictureButton.type =
                "button";

            pictureButton.className =
                "mal-gallery-picture";


            const image =
                document.createElement(
                    "img"
                );

            image.src =
                imageURL;

            image.alt =
                "MyAnimeList picture";

            image.loading =
                "lazy";


            image.onerror = () => {

                pictureButton.remove();
            };


            pictureButton.appendChild(
                image
            );


            pictureButton.addEventListener(
                "click",
                () => {

                    onPictureSelected(
                        imageURL
                    );
                }
            );


            galleryGridElement.appendChild(
                pictureButton
            );
        }
    );
}


/* ========================================
   Select Picture
======================================== */

function selectPicture(
    imageURL,
    targetElement,
    onCloseGallery
) {

    if (!imageURL) {
        return;
    }


    if (!targetElement) {

        console.warn(
            "No selected grid box was found."
        );

        return;
    }


    /*
     * Create loading overlay.
     */

    const loadingOverlay =
        document.createElement("div");

    loadingOverlay.className =
        "mal-picture-loading-overlay";


    const loadingMessage =
        document.createElement("div");

    loadingMessage.className =
        "mal-picture-loading-message";

    loadingMessage.textContent =
        "Preparing image...";


    loadingOverlay.appendChild(
        loadingMessage
    );


    /*
     * Put the overlay over the MAL gallery.
     */

    const galleryContainer =
        document.querySelector(
            "#malSearchModal .mal-search-container"
        );


    if (galleryContainer) {

        const currentPosition =
            window.getComputedStyle(
                galleryContainer
            ).position;


        if (currentPosition === "static") {

            galleryContainer.style.position =
                "relative";

        }


        galleryContainer.appendChild(
            loadingOverlay
        );

    }


    /*
     * Open the cropper while the MAL
     * gallery is still visible.
     *
     * MAL closes only after the cropper
     * is completely ready.
     */

    try {

        openCropForURL(
            imageURL,
            targetElement,
            () => {

                /*
                 * The cropper is ready.
                 *
                 * Remove the loading overlay
                 * before closing MAL.
                 */

                removePictureLoadingOverlay();


                if (onCloseGallery) {

                    onCloseGallery();

                }

            }
        );

    } catch (error) {

        console.error(
            "Unable to open MAL image in cropper:",
            error
        );


        /*
         * Remove the loading overlay if
         * something goes wrong.
         */

        loadingOverlay.remove();

    }
}


/* ========================================
   Show Search Results
======================================== */

export function showSearchView({
    resultsElement,
    galleryElement,
    backButton
}) {

    /*
     * Make sure no stale loading overlay
     * remains when returning to search.
     */

    removePictureLoadingOverlay();


    galleryElement.style.display =
        "none";

    resultsElement.style.display =
        "grid";


    if (backButton) {

        backButton.style.display =
            "none";
    }
}