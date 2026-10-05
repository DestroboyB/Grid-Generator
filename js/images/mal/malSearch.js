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


/*
 * Results currently available to the UI.
 *
 * This can contain more than 12 results.
 * Results are displayed in groups of 12.
 */

let allResults = [];


/*
 * Results currently being displayed.
 */

let currentResults = [];


/*
 * Search information.
 */

let currentQuery = "";


/*
 * UI page.
 *
 * This is NOT the MAL/Jikan API page.
 */

let currentPage = 1;


/*
 * MAL/Jikan API page currently loaded.
 *
 * Each API page can contain up to 50 results.
 */

let currentApiPage = 0;


/*
 * Whether MAL says another API page exists.
 */

let hasNextApiPage = false;


/*
 * Whether another UI page can currently
 * be displayed from the results we have.
 */

let hasNextPage = false;


/*
 * Prevent multiple searches/navigation
 * requests at the same time.
 */

let isSearching = false;


/*
 * Number of results currently loaded
 * into allResults.
 */

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

    allResults = [];

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    currentApiPage = 0;

    hasNextApiPage = false;

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

    allResults = [];

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    currentApiPage = 0;

    hasNextApiPage = false;

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

    allResults = [];

    currentResults = [];

    currentQuery = "";

    currentPage = 1;

    currentApiPage = 0;

    hasNextApiPage = false;

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
   Perform New Search
======================================== */

async function performSearch() {

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


    /*
     * Always begin a brand-new search
     * from API page 1.
     */

    currentQuery =
        query;

    allResults = [];

    currentResults = [];

    currentPage = 1;

    currentApiPage = 0;

    hasNextApiPage = false;

    hasNextPage = false;

    currentApiResultCount = 0;

    resultsElement.innerHTML = "";

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

        await loadApiPage(1);


        /*
         * If no results were returned.
         */

        if (
            allResults.length === 0
        ) {

            resultsElement.innerHTML =
                "";

            statusElement.textContent =
                "No results found.";

            hasNextPage =
                false;

            return;
        }


        /*
         * Show the first UI page.
         */

        currentPage = 1;

        renderCurrentPage();

    } catch (error) {

        console.error(
            "MAL search error:",
            error
        );


        allResults = [];

        currentResults = [];

        hasNextPage = false;

        hasNextApiPage = false;


        if (
            error?.status === 429
        ) {

            statusElement.textContent =
                "MyAnimeList is temporarily rate limited. Please wait a few seconds and try again.";

        } else {

            statusElement.textContent =
                "Unable to search MyAnimeList right now.";
        }

    } finally {

        isSearching =
            false;

        searchButton.disabled =
            false;

        updatePagination();
    }
}


/* ========================================
   Load MAL/Jikan API Page
======================================== */

async function loadApiPage(
    apiPage
) {

    /*
     * Don't request an API page that has
     * already been loaded.
     */

    if (
        apiPage <= currentApiPage
    ) {
        return;
    }


    const json =
        currentMode ===
        "character"
            ? await searchCharacters(
                currentQuery,
                apiPage
            )
            : await searchAnime(
                currentQuery,
                apiPage
            );


    const apiResults =
        Array.isArray(
            json?.data
        )
            ? json.data
            : [];


    const pagination =
        json?.meta?.pagination ||
        null;


    /*
     * Store ALL results from this API page.
     *
     * Previously we immediately sliced this
     * to 12 and lost results 13-50.
     */

    allResults.push(
        ...apiResults
    );


    currentApiPage =
        apiPage;


    currentApiResultCount =
        allResults.length;


    /*
     * Determine whether MAL has another
     * API page available.
     */

    if (
        pagination &&
        typeof
            pagination.hasNextPage ===
            "boolean"
    ) {

        hasNextApiPage =
            pagination.hasNextPage;

    } else {

        hasNextApiPage =
            apiResults.length >=
            API_RESULTS_PER_PAGE;
    }
}


/* ========================================
   Render Current UI Page
======================================== */

function renderCurrentPage() {

    const startIndex =
        (currentPage - 1) *
        RESULTS_PER_PAGE;


    const endIndex =
        startIndex +
        RESULTS_PER_PAGE;


    currentResults =
        allResults.slice(
            startIndex,
            endIndex
        );


    /*
     * Determine whether another UI page
     * can be displayed immediately.
     */

    const localNextPageExists =
        endIndex <
        allResults.length;


    /*
     * If there are enough currently loaded
     * results, there is another page.
     *
     * Otherwise, if MAL has another API
     * page, we can load more when Next
     * is clicked.
     */

    hasNextPage =
        localNextPageExists ||
        hasNextApiPage;


    /*
     * Render the current 12 results.
     */

    renderResults();


    /*
     * Update the status.
     */

    updateStatus();


    /*
     * Update Previous / Next buttons.
     */

    updatePagination();
}


/* ========================================
   Update Search Status
======================================== */

function updateStatus() {

    if (
        currentApiResultCount === 0
    ) {

        statusElement.textContent =
            "";

        return;
    }


    /*
     * If MAL says another API page exists,
     * we know there are more results than
     * we've currently loaded.
     */

    if (
        hasNextApiPage
    ) {

        statusElement.textContent =
            `Found ${currentApiResultCount}+ results — Page ${currentPage}.`;

        return;
    }


    /*
     * Otherwise, this is the actual number
     * of results returned across all loaded
     * API pages.
     */

    statusElement.textContent =
        `Found ${currentApiResultCount} results — Page ${currentPage}.`;
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
     * Re-render the current search page.
     */

    renderCurrentPage();


    statusElement.textContent =
        "";

    /*
     * renderCurrentPage() already restores
     * the correct pagination state.
     */

    updateStatus();
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


        currentPage--;

        renderCurrentPage();
    }
);


/* ========================================
   Next Page
======================================== */

nextButton.addEventListener(
    "click",
    async () => {

        if (
            !hasNextPage ||
            isSearching
        ) {

            return;
        }


        isSearching =
            true;

        updatePagination();


        try {

            const nextPage =
                currentPage + 1;


            const requiredEndIndex =
                nextPage *
                RESULTS_PER_PAGE;


            /*
             * If the next UI page is already
             * contained in our loaded results,
             * don't contact MAL again.
             */

            if (
                requiredEndIndex >
                allResults.length &&
                hasNextApiPage
            ) {

                /*
                 * Load the next MAL/Jikan API page.
                 */

                await loadApiPage(
                    currentApiPage + 1
                );
            }


            /*
             * Move to the next UI page.
             */

            currentPage =
                nextPage;


            /*
             * Make sure the requested page
             * actually contains results.
             */

            const startIndex =
                (currentPage - 1) *
                RESULTS_PER_PAGE;


            if (
                startIndex >=
                allResults.length
            ) {

                /*
                 * No more results are actually
                 * available.
                 */

                hasNextPage =
                    false;

                return;
            }


            renderCurrentPage();

        } catch (error) {

            console.error(
                "MAL pagination error:",
                error
            );

            statusElement.textContent =
                "Unable to load more MyAnimeList results.";

        } finally {

            isSearching =
                false;

            updatePagination();
        }
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