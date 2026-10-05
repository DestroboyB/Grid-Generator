import {
    openCropForURL
} from "../cropper/cropper.js";


/* ========================================
   API
======================================== */

const API_BASE =
    "https://jikan.lucashdo.com/v1";

const RESULTS_PER_PAGE = 12;

const API_RESULTS_PER_PAGE = 50;


/*
 * Only allow a few character-anime
 * requests at the same time.
 *
 * This helps prevent hitting the
 * MyAnimeList API rate limit when
 * displaying a page of characters.
 */
const CHARACTER_ANIME_CONCURRENCY = 3;


/* ========================================
   DOM Elements
======================================== */

const modal =
    document.getElementById(
        "malSearchModal"
    );

const closeButton =
    document.getElementById(
        "malSearchCloseButton"
    );

const characterTab =
    document.getElementById(
        "malCharacterTab"
    );

const animeTab =
    document.getElementById(
        "malAnimeTab"
    );

const searchInput =
    document.getElementById(
        "malSearchInput"
    );

const searchButton =
    document.getElementById(
        "malSearchButton"
    );

const statusElement =
    document.getElementById(
        "malSearchStatus"
    );

const resultsElement =
    document.getElementById(
        "malSearchResults"
    );

const backButton =
    document.getElementById(
        "malSearchBackButton"
    );

const previousButton =
    document.getElementById(
        "malSearchPreviousButton"
    );

const nextButton =
    document.getElementById(
        "malSearchNextButton"
    );

const pageIndicator =
    document.getElementById(
        "malSearchPageIndicator"
    );


/* ========================================
   State
======================================== */

let targetElement = null;

let currentMode =
    "character";

let currentResults = [];

let currentQuery = "";

let currentPage = 1;

let hasNextPage = false;

let isSearching = false;

let currentApiResultCount = 0;


/* ========================================
   Character Anime Cache
======================================== */

/*
 * Stores the primary anime title for each
 * character we have already looked up.
 *
 * Key:
 *     MAL character ID
 *
 * Value:
 *     Anime title
 */

const characterAnimeCache =
    new Map();


/* ========================================
   Character Anime Request Queue
======================================== */

/*
 * Keeps character anime requests from
 * all firing at once.
 */

let activeCharacterAnimeRequests = 0;

const characterAnimeQueue = [];


function queueCharacterAnimeRequest(
    character,
    typeElement
) {

    characterAnimeQueue.push({
        character,
        typeElement
    });

    processCharacterAnimeQueue();
}


function processCharacterAnimeQueue() {

    while (
        activeCharacterAnimeRequests <
            CHARACTER_ANIME_CONCURRENCY &&
        characterAnimeQueue.length > 0
    ) {

        const request =
            characterAnimeQueue.shift();

        activeCharacterAnimeRequests++;

        loadCharacterAnime(
            request.character,
            request.typeElement
        ).finally(() => {

            activeCharacterAnimeRequests--;

            processCharacterAnimeQueue();
        });
    }
}


/* ========================================
   Open Search
======================================== */

export function openMalSearch(element) {

    targetElement = element;

    currentMode =
        "character";

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    hasNextPage = false;

    isSearching = false;

    currentApiResultCount = 0;

    searchInput.value = "";

    modal.style.display =
        "flex";

    updateTabs();

    showSearchView();

    updatePagination();

    setTimeout(
        () => {
            searchInput.focus();
        },
        50
    );
}


/* ========================================
   Close Search
======================================== */

function closeMalSearch() {

    modal.style.display =
        "none";

    targetElement = null;

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    hasNextPage = false;

    isSearching = false;

    currentApiResultCount = 0;

    searchInput.value = "";

    resultsElement.innerHTML = "";

    statusElement.textContent = "";

    backButton.style.display =
        "none";

    updatePagination();
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

        if (
            currentMode ===
            "character"
        ) {
            return;
        }

        currentMode =
            "character";

        currentResults = [];

        currentQuery = "";

        currentPage = 1;

        hasNextPage = false;

        currentApiResultCount = 0;

        updateTabs();

        showSearchView();

        updatePagination();
    }
);


animeTab.addEventListener(
    "click",
    () => {

        if (
            currentMode ===
            "anime"
        ) {
            return;
        }

        currentMode =
            "anime";

        currentResults = [];

        currentQuery = "";

        currentPage = 1;

        hasNextPage = false;

        currentApiResultCount = 0;

        updateTabs();

        showSearchView();

        updatePagination();
    }
);


function updateTabs() {

    characterTab.classList.toggle(
        "active",
        currentMode ===
            "character"
    );

    animeTab.classList.toggle(
        "active",
        currentMode ===
            "anime"
    );


    if (
        currentMode ===
        "character"
    ) {

        searchInput.placeholder =
            "Search for a character...";

    } else {

        searchInput.placeholder =
            "Search for an anime...";
    }
}


/* ========================================
   Search Events
======================================== */

searchButton.addEventListener(
    "click",
    () => {
        performSearch();
    }
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            event.preventDefault();

            performSearch();
        }
    }
);


/* ========================================
   Perform Search
======================================== */

/*
 * requestedPage is separate from currentPage.
 *
 * This is important:
 *
 * currentPage = page currently displayed
 *
 * requestedPage = page we are attempting
 * to load
 *
 * This prevents the UI from becoming
 * stuck on page 8 if the page-8 request
 * fails.
 */

async function performSearch(
    keepResults = false,
    requestedPage = currentPage
) {

    const query =
        searchInput.value.trim();


    if (!query) {

        statusElement.textContent =
            "Enter something to search for.";

        return;
    }


    /*
     * A new search always starts
     * on page 1.
     */

    if (
        query !== currentQuery
    ) {

        requestedPage = 1;

        keepResults = false;
    }


    currentQuery =
        query;


    /*
     * Only clear results when this
     * is a completely new search.
     *
     * Pagination keeps the current
     * page visible while loading.
     */

    if (!keepResults) {

        currentResults = [];

        resultsElement.innerHTML = "";
    }


    hasNextPage = false;

    currentApiResultCount = 0;

    isSearching = true;

    statusElement.textContent =
        `Searching ${
            currentMode ===
            "character"
                ? "characters"
                : "anime"
        }...`;

    searchButton.disabled =
        true;

    updatePagination();


    try {

        const endpoint =
            currentMode ===
            "character"
                ? "characters"
                : "anime";


        const url =
            `${API_BASE}/${endpoint}?q=${
                encodeURIComponent(
                    query
                )
            }&page=${requestedPage}`;


        const response =
            await fetch(url);


        /* ========================================
           Handle Rate Limit
        ======================================== */

        if (
            response.status ===
            429
        ) {

            throw new Error(
                "RATE_LIMITED"
            );
        }


        if (!response.ok) {

            throw new Error(
                `Search failed (${response.status})`
            );
        }


        const json =
            await response.json();


        /* ========================================
           Search Results
        ======================================== */

        const apiResults =
            Array.isArray(
                json.data
            )
                ? json.data
                : [];


        currentApiResultCount =
            apiResults.length;


        /*
         * Only now do we officially
         * change the current page.
         *
         * If the request had failed,
         * currentPage would still be
         * the previous page.
         */

        currentPage =
            requestedPage;


        currentResults =
            apiResults.slice(
                0,
                RESULTS_PER_PAGE
            );


        /* ========================================
           Pagination
        ======================================== */

        const pagination =
            json.meta &&
            json.meta.pagination
                ? json.meta.pagination
                : null;


        if (
            pagination &&
            typeof
                pagination.hasNextPage ===
                "boolean"
        ) {

            hasNextPage =
                pagination.hasNextPage;

        } else {

            hasNextPage =
                apiResults.length >=
                API_RESULTS_PER_PAGE;
        }


        /* ========================================
           No Results
        ======================================== */

        if (
            !currentResults.length
        ) {

            resultsElement.innerHTML = "";

            statusElement.textContent =
                "No results found.";

            hasNextPage =
                false;

            isSearching = false;

            updatePagination();

            return;
        }


        /* ========================================
           Display Results
        ======================================== */

        renderSearchResults();


        if (
            currentApiResultCount >=
            API_RESULTS_PER_PAGE
        ) {

            statusElement.textContent =
                `Found 50+ results — Page ${currentPage}.`;

        } else {

            statusElement.textContent =
                `Found ${currentApiResultCount} results — Page ${currentPage}.`;
        }


    } catch (error) {

        console.error(
            "MAL search error:",
            error
        );


        /*
         * Do NOT change currentPage here.
         *
         * This means if page 8 fails,
         * the interface remains on page 7.
         */

        if (!keepResults) {

            resultsElement.innerHTML = "";
        }


        if (
            error.message ===
            "RATE_LIMITED"
        ) {

            statusElement.textContent =
                "MyAnimeList is temporarily rate limited. Please wait a few seconds and try again.";

        } else {

            statusElement.textContent =
                "Unable to search MyAnimeList right now.";
        }


        /*
         * Don't permanently disable
         * the Next button because a
         * temporary request failed.
         *
         * If the previous page had another
         * page available, restore that state.
         */

        hasNextPage =
            currentPage < requestedPage
                ? true
                : hasNextPage;

    } finally {

        isSearching = false;

        searchButton.disabled =
            false;

        updatePagination();
    }
}


/* ========================================
   Pagination
======================================== */

function updatePagination() {

    if (
        !previousButton ||
        !nextButton ||
        !pageIndicator
    ) {
        return;
    }


    pageIndicator.textContent =
        `Page ${currentPage}`;


    previousButton.disabled =
        currentPage <= 1 ||
        isSearching;


    nextButton.disabled =
        !hasNextPage ||
        isSearching;
}


/* ========================================
   Previous Page
======================================== */

previousButton.addEventListener(
    "click",
    () => {

        if (
            currentPage <= 1 ||
            isSearching
        ) {
            return;
        }


        const previousPage =
            currentPage - 1;


        performSearch(
            true,
            previousPage
        );
    }
);


/* ========================================
   Next Page
======================================== */

nextButton.addEventListener(
    "click",
    () => {

        if (
            !hasNextPage ||
            isSearching
        ) {
            return;
        }


        const nextPage =
            currentPage + 1;


        performSearch(
            true,
            nextPage
        );
    }
);


/* ========================================
   Render Search Results
======================================== */

function renderSearchResults() {

    resultsElement.innerHTML =
        "";


    currentResults.forEach(
        item => {

            const result =
                document.createElement(
                    "button"
                );


            result.type =
                "button";

            result.className =
                "mal-search-result";


            /* ----------------------------------------
               Image
            ---------------------------------------- */

            const image =
                document.createElement(
                    "img"
                );


            image.className =
                "mal-result-image";

            image.alt =
                getItemName(item);


            const imageURL =
                getImageURL(item);


            if (imageURL) {

                image.src =
                    imageURL;

            } else {

                image.classList.add(
                    "mal-image-loading"
                );
            }


            /* ----------------------------------------
               Character / Anime Name
            ---------------------------------------- */

            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "mal-result-name";

            name.textContent =
                getItemName(item);


            /* ----------------------------------------
               Secondary Information
            ---------------------------------------- */

            const type =
                document.createElement(
                    "div"
                );


            type.className =
                "mal-result-type";


            result.appendChild(
                image
            );

            result.appendChild(
                name
            );

            result.appendChild(
                type
            );


            /* ----------------------------------------
               Character Anime
            ---------------------------------------- */

            if (
                currentMode ===
                "character"
            ) {

                type.textContent =
                    "Loading anime...";

                queueCharacterAnimeRequest(
                    item,
                    type
                );

            } else {

                type.textContent =
                    item.type ||
                    "Anime";
            }


            /* ----------------------------------------
               Result Click
            ---------------------------------------- */

            result.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openPictureGallery(
                        item
                    );
                }
            );


            resultsElement.appendChild(
                result
            );


            /* ----------------------------------------
               Missing Thumbnail
            ---------------------------------------- */

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
   Load Character Anime
======================================== */

async function loadCharacterAnime(
    character,
    typeElement
) {

    if (
        !character ||
        !character.malId
    ) {

        typeElement.textContent =
            "Anime unavailable";

        return;
    }


    const characterId =
        character.malId;


    /* ----------------------------------------
       Cache
    ---------------------------------------- */

    if (
        characterAnimeCache.has(
            characterId
        )
    ) {

        typeElement.textContent =
            characterAnimeCache.get(
                characterId
            );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/characters/${characterId}/anime`
            );


        /* ----------------------------------------
           Rate Limit
        ---------------------------------------- */

        if (
            response.status ===
            429
        ) {

            throw new Error(
                "RATE_LIMITED"
            );
        }


        if (!response.ok) {

            throw new Error(
                `Anime request failed (${response.status})`
            );
        }


        const json =
            await response.json();


        const appearances =
            Array.isArray(
                json.data
            )
                ? json.data
                : [];


        let animeTitle =
            null;


        /* ----------------------------------------
           Find Anime Title
        ---------------------------------------- */

        if (
            appearances.length
        ) {

            const firstAppearance =
                appearances[0];


            /*
             * Direct format.
             */

            if (
                firstAppearance
            ) {

                animeTitle =
                    firstAppearance.title ||
                    firstAppearance.name ||
                    null;
            }


            /*
             * Nested anime format.
             */

            if (
                !animeTitle &&
                firstAppearance &&
                firstAppearance.anime
            ) {

                animeTitle =
                    firstAppearance.anime.title ||
                    firstAppearance.anime.name ||
                    null;
            }


            /*
             * Nested entry format.
             */

            if (
                !animeTitle &&
                firstAppearance &&
                firstAppearance.entry
            ) {

                animeTitle =
                    firstAppearance.entry.title ||
                    firstAppearance.entry.name ||
                    null;
            }


            /*
             * Nested data format.
             */

            if (
                !animeTitle &&
                firstAppearance &&
                firstAppearance.data
            ) {

                animeTitle =
                    firstAppearance.data.title ||
                    firstAppearance.data.name ||
                    null;
            }
        }


        /* ----------------------------------------
           No Anime Found
        ---------------------------------------- */

        if (!animeTitle) {

            typeElement.textContent =
                "Anime unavailable";

            /*
             * Cache this only when the API
             * actually returned successfully.
             *
             * We do NOT cache failures.
             */

            if (
                appearances.length === 0
            ) {

                characterAnimeCache.set(
                    characterId,
                    "Anime unavailable"
                );
            }

            return;
        }


        /* ----------------------------------------
           Cache Successful Result
        ---------------------------------------- */

        characterAnimeCache.set(
            characterId,
            animeTitle
        );


        typeElement.textContent =
            animeTitle;

    } catch (error) {

        console.warn(
            "Unable to load character anime:",
            error
        );


        /*
         * Don't cache failures.
         *
         * If the API was temporarily
         * rate limited, this character
         * can be tried again later.
         */

        typeElement.textContent =
            "Anime unavailable";
    }
}


/* ========================================
   Load Missing Search Thumbnail
======================================== */

async function loadResultImage(
    item,
    imageElement
) {

    if (
        !item ||
        !item.malId
    ) {
        return;
    }


    try {

        const endpoint =
            currentMode ===
            "character"
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
            json.data ||
            json;


        const imageURL =
            getImageURL(
                detail
            );


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

async function openPictureGallery(
    item
) {

    if (
        !item ||
        !item.malId
    ) {

        statusElement.textContent =
            "This result does not have a valid MyAnimeList ID.";

        return;
    }


    statusElement.textContent =
        `Loading ${
            getItemName(item)
        }...`;


    resultsElement.innerHTML =
        "";


    backButton.style.display =
        "inline-flex";


    if (previousButton) {

        previousButton.style.display =
            "none";
    }


    if (nextButton) {

        nextButton.style.display =
            "none";
    }


    if (pageIndicator) {

        pageIndicator.style.display =
            "none";
    }


    try {

        const endpoint =
            currentMode ===
            "character"
                ? "characters"
                : "anime";


        /* ========================================
           Load Detail
        ======================================== */

        const detailResponse =
            await fetch(
                `${API_BASE}/${endpoint}/${item.malId}`
            );


        if (!detailResponse.ok) {

            throw new Error(
                `Detail request failed (${detailResponse.status})`
            );
        }


        const detailJSON =
            await detailResponse.json();


        const detail =
            detailJSON.data ||
            detailJSON;


        const name =
            getItemName(detail) ||
            getItemName(item);


        /* ========================================
           Get Main Image
        ======================================== */

        const primaryImage =
            getImageURL(
                detail
            );


        /* ========================================
           Load Picture Gallery
        ======================================== */

        let pictures = [];


        try {

            const picturesResponse =
                await fetch(
                    `${API_BASE}/${endpoint}/${item.malId}/pictures`
                );


            if (
                picturesResponse.ok
            ) {

                const picturesJSON =
                    await picturesResponse.json();


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

        } catch (
            pictureError
        ) {

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
                    picture =>
                        getPictureURL(
                            picture
                        ) ===
                        primaryImage
                );


            if (
                !alreadyExists
            ) {

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
                    picture => {

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
                    picture =>
                        picture.url
                );


        /* ========================================
           No Gallery
        ======================================== */

        if (
            !pictures.length
        ) {

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


        resultsElement.innerHTML =
            "";
    }
}


/* ========================================
   Render Picture Gallery
======================================== */

function renderPictureGallery(
    pictures,
    name
) {

    resultsElement.innerHTML =
        "";


    pictures.forEach(
        (item, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";

            button.className =
                "mal-picture-result";


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                item.url;

            image.alt =
                `${name} picture ${index + 1}`;

            image.loading =
                "lazy";


            const label =
                document.createElement(
                    "div"
                );


            label.className =
                "mal-picture-number";

            label.textContent =
                `Picture ${index + 1}`;


            button.appendChild(
                image
            );

            button.appendChild(
                label
            );


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

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

function selectPicture(
    imageURL
) {

    if (!targetElement) {

        return;
    }


    const target =
        targetElement;


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


        if (previousButton) {

            previousButton.style.display =
                "inline-flex";
        }


        if (nextButton) {

            nextButton.style.display =
                "inline-flex";
        }


        if (pageIndicator) {

            pageIndicator.style.display =
                "inline-flex";
        }


        if (
            currentApiResultCount >=
            API_RESULTS_PER_PAGE
        ) {

            statusElement.textContent =
                `Found 50+ results — Page ${currentPage}.`;

        } else if (
            currentApiResultCount > 0
        ) {

            statusElement.textContent =
                `Found ${currentApiResultCount} results — Page ${currentPage}.`;

        } else {

            statusElement.textContent =
                "";
        }


        renderSearchResults();

        updatePagination();
    }
);


/* ========================================
   Search View
======================================== */

function showSearchView() {

    backButton.style.display =
        "none";


    if (previousButton) {

        previousButton.style.display =
            "inline-flex";
    }


    if (nextButton) {

        nextButton.style.display =
            "inline-flex";
    }


    if (pageIndicator) {

        pageIndicator.style.display =
            "inline-flex";
    }


    resultsElement.innerHTML =
        "";

    statusElement.textContent =
        "";
}


/* ========================================
   Get Item Name
======================================== */

function getItemName(item) {

    if (!item) {

        return "Unknown";
    }


    if (
        currentMode ===
        "character"
    ) {

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


    if (item.imageUrl) {

        return item.imageUrl;
    }


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


        if (item.images.jpg) {

            if (
                item.images.jpg
                    .large_image_url
            ) {

                return (
                    item.images.jpg
                        .large_image_url
                );
            }


            if (
                item.images.jpg
                    .image_url
            ) {

                return (
                    item.images.jpg
                        .image_url
                );
            }
        }


        if (item.images.webp) {

            if (
                item.images.webp
                    .large_image_url
            ) {

                return (
                    item.images.webp
                        .large_image_url
                );
            }


            if (
                item.images.webp
                    .image_url
            ) {

                return (
                    item.images.webp
                        .image_url
                );
            }
        }
    }


    return null;
}


/* ========================================
   Get Picture URL
======================================== */

function getPictureURL(
    picture
) {

    if (!picture) {

        return null;
    }


    if (picture.imageUrl) {

        return picture.imageUrl;
    }


    if (picture.large) {

        return picture.large;
    }

    if (picture.medium) {

        return picture.medium;
    }

    if (picture.small) {

        return picture.small;
    }


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


        if (picture.images.jpg) {

            if (
                picture.images.jpg
                    .large_image_url
            ) {

                return (
                    picture.images.jpg
                        .large_image_url
                );
            }


            if (
                picture.images.jpg
                    .image_url
            ) {

                return (
                    picture.images.jpg
                        .image_url
                );
            }
        }


        if (picture.images.webp) {

            if (
                picture.images.webp
                    .large_image_url
            ) {

                return (
                    picture.images.webp
                        .large_image_url
                );
            }


            if (
                picture.images.webp
                    .image_url
            ) {

                return (
                    picture.images.webp
                        .image_url
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
    event => {

        if (
            event.target === modal
        ) {

            closeMalSearch();
        }
    }
);