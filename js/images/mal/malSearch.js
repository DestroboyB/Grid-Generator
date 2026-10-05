import {
    searchCharacters,
    searchAnime,
    getItemDetail
} from "./malApi.js";

import {
    getItemName,
    getImageURL
} from "./malUtils.js";

import {
    queueCharacterAnimeRequest
} from "./malCharacter.js";

import {
    renderSearchResults
} from "./malSearchResults.js";

import {
    openPictureGallery,
    showSearchView
} from "./malGallery.js";


/* ========================================
   Configuration
======================================== */

const RESULTS_PER_PAGE = 12;

const API_RESULTS_PER_PAGE = 50;


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
   Open Search
======================================== */

export function openMalSearch(element) {

    targetElement = element;

    /*
     * Keep the selected grid box.
     *
     * The selected element is passed directly
     * to the gallery/cropper so it is not lost
     * while navigating through MAL.
     */

    currentMode =
        "character";

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    hasNextPage = false;

    isSearching = false;

    currentApiResultCount = 0;

    searchInput.value = "";

    resultsElement.innerHTML = "";

    statusElement.textContent = "";

    modal.style.display =
        "flex";

    updateTabs();

    showSearchView({
        resultsElement,
        galleryElement: resultsElement,
        backButton
    });

    updatePagination();

    setTimeout(() => {
        searchInput.focus();
    }, 50);
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

        switchMode("character");
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

        switchMode("anime");
    }
);


/* ========================================
   Switch Search Mode
======================================== */

function switchMode(mode) {

    if (
        currentMode === mode
    ) {
        return;
    }


    currentMode = mode;


    /*
     * Clear everything from the previous
     * search mode.
     */

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    hasNextPage = false;

    currentApiResultCount = 0;

    isSearching = false;

    resultsElement.innerHTML = "";

    statusElement.textContent = "";


    /*
     * Reset the gallery/search view.
     */

    showSearchView({
        resultsElement,
        galleryElement: resultsElement,
        backButton
    });


    /*
     * Update the tab styling and
     * search placeholder.
     */

    updateTabs();


    /*
     * Reset pagination.
     */

    updatePagination();
}


/* ========================================
   Update Tabs
======================================== */

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

async function performSearch(
    keepResults = false,
    requestedPage = currentPage
) {

    const query =
        searchInput.value.trim();


    /* ------------------------------------
       Validate Search
    ------------------------------------ */

    if (!query) {

        statusElement.textContent =
            "Enter something to search for.";

        return;
    }


    /* ------------------------------------
       New Search
    ------------------------------------ */

    if (
        query !== currentQuery
    ) {

        requestedPage = 1;

        keepResults = false;
    }


    currentQuery =
        query;


    /* ------------------------------------
       Preserve Pagination State
    ------------------------------------ */

    const previousHasNextPage =
        hasNextPage;


    /* ------------------------------------
       Clear Results
    ------------------------------------ */

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

        /* --------------------------------
           Search API
        -------------------------------- */

        const json =
            currentMode ===
            "character"
                ? await searchCharacters(
                    query,
                    requestedPage
                )
                : await searchAnime(
                    query,
                    requestedPage
                );


        /* --------------------------------
           Search Results
        -------------------------------- */

        const apiResults =
            Array.isArray(
                json?.data
            )
                ? json.data
                : [];


        currentApiResultCount =
            apiResults.length;


        /*
         * Only update currentPage after
         * the API request succeeds.
         */

        currentPage =
            requestedPage;


        currentResults =
            apiResults.slice(
                0,
                RESULTS_PER_PAGE
            );


        /* --------------------------------
           Pagination
        -------------------------------- */

        const pagination =
            json?.meta?.pagination ||
            null;


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


        /* --------------------------------
           No Results
        -------------------------------- */

        if (
            currentResults.length === 0
        ) {

            resultsElement.innerHTML =
                "";

            statusElement.textContent =
                "No results found.";

            hasNextPage =
                false;

            isSearching =
                false;

            updatePagination();

            return;
        }


        /* --------------------------------
           Render Results
        -------------------------------- */

        renderResults();


        /* --------------------------------
           Status
        -------------------------------- */

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
         * Do not change currentPage.
         *
         * If page 8 fails while page 7
         * is displayed, currentPage remains 7.
         */

        if (!keepResults) {

            resultsElement.innerHTML =
                "";
        }


        if (
            error?.status === 429
        ) {

            statusElement.textContent =
                "MyAnimeList is temporarily rate limited. Please wait a few seconds and try again.";

        } else {

            statusElement.textContent =
                "Unable to search MyAnimeList right now.";
        }


        /*
         * Restore the pagination state
         * from before the failed request.
         */

        hasNextPage =
            previousHasNextPage;

    } finally {

        isSearching =
            false;

        searchButton.disabled =
            false;

        updatePagination();
    }
}


/* ========================================
   Render Results
======================================== */

function renderResults() {

    renderSearchResults({

        results:
            currentResults,

        mode:
            currentMode,

        resultsElement,

        queueCharacterAnimeRequest,

        onResultClick:
            item => {
                openGallery(item);
            },

        loadResultImage,

        loadAnimeInfo
    });
}


/* ========================================
   Load Missing Result Image
======================================== */

async function loadResultImage(
    item,
    mode,
    imageElement
) {

    if (
        !item ||
        !item.malId
    ) {
        return;
    }


    try {

        const response =
            await getItemDetail(
                mode,
                item.malId
            );


        const detail =
            response?.data ||
            response;


        const imageURL =
            getImageURL(
                detail
            );


        if (imageURL) {

            imageElement.src =
                imageURL;

            /*
             * Match the CSS:
             * .mal-result-image.mal-image-loading
             */

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
   Load Anime Information
======================================== */

async function loadAnimeInfo(
    item,
    typeElement
) {

    if (
        !item ||
        !item.malId
    ) {

        typeElement.textContent =
            "";

        return;
    }


    /*
     * The search result may already contain
     * some of this information, so use it
     * when available.
     */

    const type =
        item.type || "";

    const episodes =
        item.episodes;

    const score =
        item.score;


    let parts = [];


    if (type) {

        parts.push(
            type
        );
    }


    if (
        episodes !== null &&
        episodes !== undefined
    ) {

        parts.push(
            `${episodes} eps`
        );
    }


    if (
        score !== null &&
        score !== undefined &&
        score !== 0
    ) {

        parts.push(
            `${Number(score).toFixed(1)} ★`
        );
    }


    /*
     * If the search result already had
     * everything we need, don't make
     * another API request.
     */

    if (parts.length >= 3) {

        typeElement.textContent =
            parts.join(" • ");

        return;
    }


    /*
     * Get the full anime details when
     * information is missing.
     */

    try {

        const response =
            await getItemDetail(
                "anime",
                item.malId
            );


        const anime =
            response?.data ||
            response;


        if (!anime) {

            typeElement.textContent =
                parts.join(" • ");

            return;
        }


        const animeType =
            anime.type || type;

        const animeEpisodes =
            anime.episodes !== null &&
            anime.episodes !== undefined
                ? anime.episodes
                : episodes;

        const animeScore =
            anime.score !== null &&
            anime.score !== undefined
                ? anime.score
                : score;


        parts = [];


        if (animeType) {

            parts.push(
                animeType
            );
        }


        if (
            animeEpisodes !== null &&
            animeEpisodes !== undefined
        ) {

            parts.push(
                `${animeEpisodes} eps`
            );
        }


        if (
            animeScore !== null &&
            animeScore !== undefined &&
            animeScore !== 0
        ) {

            parts.push(
                `${Number(animeScore).toFixed(1)} ★`
            );
        }


        /*
         * Don't display the redundant
         * "Anime" label if no information
         * was available.
         */

        typeElement.textContent =
            parts.length > 0
                ? parts.join(" • ")
                : "";

    } catch (error) {

        console.warn(
            "Unable to load anime information:",
            error
        );


        /*
         * Fall back to whatever information
         * was available from the search result.
         */

        typeElement.textContent =
            parts.length > 0
                ? parts.join(" • ")
                : "";
    }
}


/* ========================================
   Open Picture Gallery
======================================== */

function openGallery(item) {

    if (
        !item ||
        !item.malId
    ) {

        statusElement.textContent =
            "This result does not have a valid MyAnimeList ID.";

        return;
    }


    /*
     * Hide search pagination while viewing
     * the picture gallery.
     */

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


    openPictureGallery({

        item,

        mode:
            currentMode,

        targetElement,

        resultsElement,

        galleryElement:
            resultsElement,

        galleryTitleElement:
            null,

        galleryGridElement:
            resultsElement,

        backButton,

        /*
         * Picture selected:
         * close the entire MAL window.
         */

        onCloseGallery:
            () => {
                closeMalSearch();
            },

        /*
         * Back button:
         * return to the character/anime results.
         */

        onBackToResults:
            () => {
                restoreSearchView();
            }
    });
}


/* ========================================
   Restore Search View
======================================== */

function restoreSearchView() {

    showSearchView({

        resultsElement,

        galleryElement:
            resultsElement,

        backButton
    });


    /*
     * Hide the Back button.
     */

    backButton.style.display =
        "none";


    /*
     * Restore pagination elements.
     */

    previousButton.style.display =
        "";

    nextButton.style.display =
        "";

    pageIndicator.style.display =
        "";


    /*
     * Re-render the current search results.
     */

    renderResults();


    /*
     * Restore Previous / Page / Next state.
     */

    updatePagination();


    statusElement.textContent =
        "";
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