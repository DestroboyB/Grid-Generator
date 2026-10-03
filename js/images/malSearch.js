import {
    openCropForURL
} from "../cropper/cropper.js";


/* ========================================
   API
======================================== */

const API_BASE = "https://jikan.lucashdo.com/v1";


/* ========================================
   DOM Elements
======================================== */

const modal = document.getElementById("malSearchModal");

const closeButton =
    document.getElementById("malSearchCloseButton");

const characterTab =
    document.getElementById("malCharacterTab");

const animeTab =
    document.getElementById("malAnimeTab");

const searchInput =
    document.getElementById("malSearchInput");

const searchButton =
    document.getElementById("malSearchButton");

const statusElement =
    document.getElementById("malSearchStatus");

const resultsElement =
    document.getElementById("malSearchResults");

const backButton =
    document.getElementById("malSearchBackButton");


/* ========================================
   State
======================================== */

let targetElement = null;

let currentMode = "character";

let currentResults = [];

let currentQuery = "";


/* ========================================
   Open Search
======================================== */

export function openMalSearch(element) {

    targetElement = element;

    currentMode = "character";

    currentResults = [];

    currentQuery = "";

    searchInput.value = "";

    modal.style.display = "flex";

    updateTabs();

    showSearchView();

    setTimeout(() => {
        searchInput.focus();
    }, 50);
}


/* ========================================
   Close Search
======================================== */

function closeMalSearch() {

    modal.style.display = "none";

    targetElement = null;

    currentResults = [];

    currentQuery = "";

    searchInput.value = "";

    resultsElement.innerHTML = "";

    statusElement.textContent = "";

    backButton.style.display = "none";
}


closeButton.addEventListener(
    "click",
    closeMalSearch
);


/* ========================================
   Tabs
======================================== */

characterTab.addEventListener(
    "click",
    () => {

        if (currentMode === "character") {
            return;
        }

        currentMode = "character";

        currentResults = [];

        updateTabs();

        showSearchView();
    }
);


animeTab.addEventListener(
    "click",
    () => {

        if (currentMode === "anime") {
            return;
        }

        currentMode = "anime";

        currentResults = [];

        updateTabs();

        showSearchView();
    }
);


function updateTabs() {

    characterTab.classList.toggle(
        "active",
        currentMode === "character"
    );

    animeTab.classList.toggle(
        "active",
        currentMode === "anime"
    );


    if (currentMode === "character") {

        searchInput.placeholder =
            "Search for a character...";

    } else {

        searchInput.placeholder =
            "Search for an anime...";
    }
}


/* ========================================
   Search
======================================== */

searchButton.addEventListener(
    "click",
    performSearch
);


searchInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            performSearch();
        }
    }
);


async function performSearch() {

    const query =
        searchInput.value.trim();


    if (!query) {

        statusElement.textContent =
            "Enter something to search for.";

        return;
    }


    currentQuery = query;

    currentResults = [];

    showSearchView();


    statusElement.textContent =
        `Searching ${
            currentMode === "character"
                ? "characters"
                : "anime"
        }...`;


    searchButton.disabled = true;


    try {

        const endpoint =
            currentMode === "character"
                ? "characters"
                : "anime";


        const url =
            `${API_BASE}/${endpoint}?q=${
                encodeURIComponent(query)
            }&page=1`;


        console.log(
            "MAL search:",
            url
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `Search failed (${response.status})`
            );
        }


        const json =
            await response.json();


        currentResults =
            Array.isArray(json.data)
                ? json.data.slice(0, 12)
                : [];


        if (!currentResults.length) {

            statusElement.textContent =
                "No results found.";

            resultsElement.innerHTML = "";

            return;
        }


        statusElement.textContent =
            `Found ${
                currentResults.length
            } result${
                currentResults.length === 1
                    ? ""
                    : "s"
            }.`;

        renderSearchResults();

    } catch (error) {

        console.error(
            "MAL search error:",
            error
        );


        statusElement.textContent =
            "Unable to search MyAnimeList right now.";

        resultsElement.innerHTML = "";

    } finally {

        searchButton.disabled = false;
    }
}


/* ========================================
   Render Search Results
======================================== */

function renderSearchResults() {

    resultsElement.innerHTML = "";


    currentResults.forEach(
        (item) => {

            const result =
                document.createElement("button");


            result.type = "button";

            result.className =
                "mal-search-result";


            const image =
                document.createElement("img");


            image.className =
                "mal-result-image";


            image.alt =
                getItemName(item);


            const imageURL =
                getImageURL(item);


            if (imageURL) {

                image.src = imageURL;

            } else {

                image.classList.add(
                    "mal-image-loading"
                );
            }


            const name =
                document.createElement("div");


            name.className =
                "mal-result-name";


            name.textContent =
                getItemName(item);


            const type =
                document.createElement("div");


            type.className =
                "mal-result-type";


            if (currentMode === "character") {

                type.textContent =
                    "Character";

            } else {

                type.textContent =
                    item.type || "Anime";
            }


            result.appendChild(image);

            result.appendChild(name);

            result.appendChild(type);


            /* ========================================
               IMPORTANT CLICK HANDLER
            ======================================== */

            result.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    console.log(
                        "MAL result clicked:",
                        item
                    );

                    openPictureGallery(item);
                }
            );


            resultsElement.appendChild(result);


            /* Load image if search result
               didn't contain one */

            if (!imageURL) {

                loadResultImage(
                    item,
                    image
                );
            }
        }
    );
}


/* ========================================
   Load Missing Search Thumbnail
======================================== */

async function loadResultImage(
    item,
    imageElement
) {

    if (!item || !item.malId) {
        return;
    }


    try {

        const endpoint =
            currentMode === "character"
                ? "characters"
                : "anime";


        const response =
            await fetch(
                `${API_BASE}/${endpoint}/${item.malId}`
            );


        if (!response.ok) {
            return;
        }


        const json =
            await response.json();


        const detail =
            json.data || json;


        const imageURL =
            getImageURL(detail);


        if (imageURL) {

            imageElement.src =
                imageURL;

            imageElement.classList.remove(
                "mal-image-loading"
            );
        }

    } catch (error) {

        console.warn(
            "Unable to load result image:",
            error
        );
    }
}


/* ========================================
   Open Picture Gallery
======================================== */

async function openPictureGallery(item) {

    if (!item || !item.malId) {

        console.error(
            "MAL result has no malId:",
            item
        );

        statusElement.textContent =
            "This result does not have a valid MyAnimeList ID.";

        return;
    }


    /* Immediately show that the click worked */

    statusElement.textContent =
        `Loading ${
            getItemName(item)
        }...`;


    resultsElement.innerHTML = "";

    backButton.style.display =
        "inline-flex";


    try {

        const endpoint =
            currentMode === "character"
                ? "characters"
                : "anime";


        /* ========================================
           Load Detail
        ======================================== */

        const detailURL =
            `${API_BASE}/${endpoint}/${item.malId}`;


        console.log(
            "Loading MAL detail:",
            detailURL
        );


        const detailResponse =
            await fetch(detailURL);


        if (!detailResponse.ok) {

            throw new Error(
                `Detail request failed (${detailResponse.status})`
            );
        }


        const detailJSON =
            await detailResponse.json();


        const detail =
            detailJSON.data || detailJSON;


        const name =
            getItemName(detail) ||
            getItemName(item);


        console.log(
            "MAL detail:",
            detail
        );


        /* ========================================
           Get Main Image
        ======================================== */

        const primaryImage =
            getImageURL(detail);


        /* ========================================
           Load Picture Gallery
        ======================================== */

        let pictures = [];


        try {

            const picturesURL =
                `${API_BASE}/${endpoint}/${item.malId}/pictures`;


            console.log(
                "Loading MAL pictures:",
                picturesURL
            );


            const picturesResponse =
                await fetch(picturesURL);


            if (picturesResponse.ok) {

                const picturesJSON =
                    await picturesResponse.json();


                console.log(
                    "MAL pictures response:",
                    picturesJSON
                );


                if (
                    Array.isArray(
                        picturesJSON.data
                    )
                ) {

                    pictures =
                        picturesJSON.data;

                } else if (
                    Array.isArray(
                        picturesJSON
                    )
                ) {

                    pictures =
                        picturesJSON;
                }
            }

        } catch (pictureError) {

            console.warn(
                "Picture gallery request failed:",
                pictureError
            );
        }


        /* ========================================
           Add Primary Image
        ======================================== */

        if (primaryImage) {

            const alreadyExists =
                pictures.some(
                    (picture) =>
                        getPictureURL(picture) ===
                        primaryImage
                );


            if (!alreadyExists) {

                pictures = [
                    {
                        imageUrl:
                            primaryImage
                    },
                    ...pictures
                ];
            }
        }


        /* ========================================
           Convert Picture Objects to URLs
        ======================================== */

        pictures =
            pictures
                .map(
                    (picture) => {

                        return {
                            picture,
                            url:
                                getPictureURL(
                                    picture
                                )
                        };
                    }
                )
                .filter(
                    (picture) =>
                        picture.url
                );


        /* ========================================
           No Gallery
        ======================================== */

        if (!pictures.length) {

            statusElement.textContent =
                "No additional pictures were found.";

            return;
        }


        /* ========================================
           Show Gallery
        ======================================== */

        statusElement.textContent =
            `${pictures.length} picture${
                pictures.length === 1
                    ? ""
                    : "s"
            } available for ${name}.`;


        renderPictureGallery(
            pictures,
            name
        );


    } catch (error) {

        console.error(
            "MAL picture gallery error:",
            error
        );


        statusElement.textContent =
            `Unable to load pictures: ${
                error.message
            }`;


        resultsElement.innerHTML = "";
    }
}


/* ========================================
   Render Picture Gallery
======================================== */

function renderPictureGallery(
    pictures,
    name
) {

    resultsElement.innerHTML = "";


    pictures.forEach(
        (item, index) => {

            const button =
                document.createElement("button");


            button.type = "button";

            button.className =
                "mal-picture-result";


            const image =
                document.createElement("img");


            image.src =
                item.url;


            image.alt =
                `${name} picture ${index + 1}`;


            image.loading =
                "lazy";


            const label =
                document.createElement("div");


            label.className =
                "mal-picture-number";


            label.textContent =
                `Picture ${index + 1}`;


            button.appendChild(image);

            button.appendChild(label);


            button.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    console.log(
                        "MAL picture selected:",
                        item.url
                    );

                    selectPicture(
                        item.url
                    );
                }
            );


            resultsElement.appendChild(
                button
            );
        }
    );
}


/* ========================================
   Select Picture
======================================== */

function selectPicture(imageURL) {

    if (!targetElement) {

        console.error(
            "No target board element exists."
        );

        return;
    }


    const target =
        targetElement;


    console.log(
        "Opening cropper with:",
        imageURL
    );


    modal.style.display =
        "none";


    targetElement =
        null;


    openCropForURL(
        imageURL,
        target
    );
}


/* ========================================
   Back to Search Results
======================================== */

backButton.addEventListener(
    "click",
    () => {

        backButton.style.display =
            "none";


        statusElement.textContent =
            currentResults.length
                ? `Search results for "${currentQuery}".`
                : "";


        renderSearchResults();
    }
);


/* ========================================
   Search View
======================================== */

function showSearchView() {

    backButton.style.display =
        "none";


    resultsElement.innerHTML = "";

    statusElement.textContent = "";
}


/* ========================================
   Get Item Name
======================================== */

function getItemName(item) {

    if (!item) {
        return "Unknown";
    }


    if (currentMode === "character") {

        return (
            item.name ||
            "Unknown Character"
        );
    }


    return (
        item.title ||
        item.name ||
        "Unknown Anime"
    );
}


/* ========================================
   Get Image URL
======================================== */

function getImageURL(item) {

    if (!item) {
        return null;
    }


    /* jikan-edge */

    if (item.imageUrl) {

        return item.imageUrl;
    }


    /* Direct images */

    if (item.images) {

        if (item.images.large) {
            return item.images.large;
        }

        if (item.images.medium) {
            return item.images.medium;
        }

        if (item.images.small) {
            return item.images.small;
        }


        /* JPG */

        if (item.images.jpg) {

            if (
                item.images.jpg.large_image_url
            ) {

                return (
                    item.images.jpg.large_image_url
                );
            }


            if (
                item.images.jpg.image_url
            ) {

                return (
                    item.images.jpg.image_url
                );
            }
        }


        /* WebP */

        if (item.images.webp) {

            if (
                item.images.webp.large_image_url
            ) {

                return (
                    item.images.webp.large_image_url
                );
            }


            if (
                item.images.webp.image_url
            ) {

                return (
                    item.images.webp.image_url
                );
            }
        }
    }


    return null;
}


/* ========================================
   Get Picture URL
======================================== */

function getPictureURL(picture) {

    if (!picture) {
        return null;
    }


    /* jikan-edge */

    if (picture.imageUrl) {

        return picture.imageUrl;
    }


    /* Direct URLs */

    if (picture.large) {
        return picture.large;
    }

    if (picture.medium) {
        return picture.medium;
    }

    if (picture.small) {
        return picture.small;
    }


    /* Nested image object */

    if (picture.images) {

        if (picture.images.large) {
            return picture.images.large;
        }

        if (picture.images.medium) {
            return picture.images.medium;
        }

        if (picture.images.small) {
            return picture.images.small;
        }


        /* JPG */

        if (picture.images.jpg) {

            if (
                picture.images.jpg.large_image_url
            ) {

                return (
                    picture.images.jpg.large_image_url
                );
            }


            if (
                picture.images.jpg.image_url
            ) {

                return (
                    picture.images.jpg.image_url
                );
            }
        }


        /* WebP */

        if (picture.images.webp) {

            if (
                picture.images.webp.large_image_url
            ) {

                return (
                    picture.images.webp.large_image_url
                );
            }


            if (
                picture.images.webp.image_url
            ) {

                return (
                    picture.images.webp.image_url
                );
            }
        }
    }


    return null;
}


/* ========================================
   Close When Clicking Overlay
======================================== */

modal.addEventListener(
    "click",
    (event) => {

        if (event.target === modal) {

            closeMalSearch();
        }
    }
);