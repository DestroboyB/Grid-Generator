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


export async function openPictureGallery({
    item,
    mode,
    targetElement,
    resultsElement,
    galleryElement,
    galleryTitleElement,
    galleryGridElement,
    backButton,
    onCloseGallery,
    onBackToResults
}) {

    if (!item || !item.malId) {
        return;
    }


    /*
     * Show the picture gallery.
     */

    resultsElement.style.display =
        "none";

    galleryElement.style.display =
        "block";


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

        const [
            detailResponse,
            pictureResponse
        ] = await Promise.all([

            getItemDetail(
                mode,
                item.malId
            ),

            getItemPictures(
                mode,
                item.malId
            )

        ]);


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


    } catch (error) {

        console.error(
            "Unable to load MAL pictures:",
            error
        );


        galleryGridElement.innerHTML = "";


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
     * Close the entire MAL modal.
     */

    if (onCloseGallery) {

        onCloseGallery();
    }


    /*
     * Open the selected image in the
     * existing crop editor.
     */

    try {

        openCropForURL(
            imageURL,
            targetElement
        );

    } catch (error) {

        console.error(
            "Unable to open MAL image in cropper:",
            error
        );
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

    galleryElement.style.display =
        "none";

    resultsElement.style.display =
        "grid";


    if (backButton) {

        backButton.style.display =
            "none";
    }
}