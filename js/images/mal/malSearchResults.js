import {
    getItemName,
    getImageURL
} from "./malUtils.js";


export function renderSearchResults({
    results,
    mode,
    resultsElement,
    queueCharacterAnimeRequest,
    onResultClick,
    loadResultImage,
    loadAnimeInfo
}) {

    resultsElement.innerHTML = "";


    if (
        !results ||
        results.length === 0
    ) {

        const emptyMessage =
            document.createElement("div");

        emptyMessage.className =
            "mal-search-empty";

        emptyMessage.textContent =
            "No results found.";

        resultsElement.appendChild(
            emptyMessage
        );

        return;
    }


    results.forEach(item => {

        const card =
            createResultCard({
                item,
                mode,
                queueCharacterAnimeRequest,
                onResultClick,
                loadResultImage,
                loadAnimeInfo
            });

        resultsElement.appendChild(
            card
        );
    });
}


/* ========================================
   Create Result Card
======================================== */

function createResultCard({
    item,
    mode,
    queueCharacterAnimeRequest,
    onResultClick,
    loadResultImage,
    loadAnimeInfo
}) {

    const card =
        document.createElement("button");

    card.type =
        "button";

    /*
     * IMPORTANT:
     * This matches the existing CSS:
     * .mal-search-result
     */
    card.className =
        "mal-search-result";


    /* ====================================
       Image Container
    ==================================== */

    const imageContainer =
        document.createElement("div");

    imageContainer.className =
        "mal-result-image-container";


    const image =
        document.createElement("img");

    image.className =
        "mal-result-image";

    image.alt =
        getItemName(
            item,
            mode
        );

    image.loading =
        "lazy";


    /* ====================================
       Load Image
    ==================================== */

    const imageURL =
        getImageURL(item);


    if (imageURL) {

        image.src =
            imageURL;

    } else {

        /*
         * Match the existing CSS class:
         * .mal-image-loading
         */
        image.classList.add(
            "mal-image-loading"
        );

        loadResultImage(
            item,
            mode,
            image
        );
    }


    image.onerror = () => {

        image.removeAttribute(
            "src"
        );
    };


    imageContainer.appendChild(
        image
    );


    /* ====================================
       Information
    ==================================== */

    const info =
        document.createElement("div");

    info.className =
        "mal-result-info";


    const name =
        document.createElement("div");

    name.className =
        "mal-result-name";

    name.textContent =
        getItemName(
            item,
            mode
        );


    const type =
        document.createElement("div");

    type.className =
        "mal-result-type";


    /* ====================================
       Character Information
    ==================================== */

    if (
        mode === "character"
    ) {

        type.textContent =
            "Loading anime...";

        queueCharacterAnimeRequest(
            item,
            type
        );

    }


    /* ====================================
       Anime Information
    ==================================== */

    else {

        type.textContent =
            "Loading...";

        loadAnimeInfo(
            item,
            type
        );
    }


    info.appendChild(
        name
    );

    info.appendChild(
        type
    );


    card.appendChild(
        imageContainer
    );

    card.appendChild(
        info
    );


    /* ====================================
       Click Handler
    ==================================== */

    card.addEventListener(
        "click",
        () => {

            onResultClick(
                item
            );
        }
    );


    return card;
}