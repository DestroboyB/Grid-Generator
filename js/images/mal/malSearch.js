import {
    searchCharacters,
    searchAnime,
    getItemDetail,
    getAnimeCharacters
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

const byAnimeTab =
    document.getElementById(
        "malByAnimeTab"
    );

const characterSubTabs = document.getElementById("malCharacterSubTabs");
const characterNameTab = document.getElementById("malCharacterNameTab");
const characterSortRow = document.getElementById("malCharacterSortRow");
const characterSortSelect = document.getElementById("malCharacterSort");

const searchInput =
    document.getElementById(
        "malSearchInput"
    );

    searchInput.spellcheck = false;

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

// Search mode and displayed result type can differ when browsing anime characters.
let displayMode = "character";
let viewingAnimeCharacters = false;
let selectedAnime = null;
let animeSearchSnapshot = null;
let characterSortMode = "default";


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
    displayMode = "character";
    viewingAnimeCharacters = false;
    selectedAnime = null;
    animeSearchSnapshot = null;

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

    // Gallery navigation hides these controls; restore them when
    // opening a fresh search after choosing or cancelling a crop.
    previousButton.style.display = "";
    nextButton.style.display = "";
    pageIndicator.style.display = "";

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
        if (currentMode === "anime") return;
        switchMode("anime");
    }
);

byAnimeTab.addEventListener(
    "click",
    () => {
        if (currentMode === "byAnime") return;
        switchMode("byAnime");
    }
);

characterNameTab.addEventListener("click", () => {
    if (currentMode === "character") return;
    switchMode("character");
});

characterSortSelect.addEventListener("change", () => {
    characterSortMode = characterSortSelect.value;
    sortCharacterResults();
    currentPage = 1;
    renderCurrentPage();
});


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
    displayMode = mode === "character" ? "character" : "anime";
    viewingAnimeCharacters = false;
    selectedAnime = null;
    animeSearchSnapshot = null;


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

    const characterModeActive = currentMode !== "anime";

    characterTab.classList.toggle("active", characterModeActive);
    animeTab.classList.toggle("active", currentMode === "anime");
    byAnimeTab.classList.toggle("active", currentMode === "byAnime");
    characterNameTab.classList.toggle("active", currentMode === "character");
    characterSubTabs.style.display = characterModeActive ? "" : "none";
    updateSortVisibility();

    if (currentMode === "character") {
        searchInput.placeholder = "Search for a character...";
    } else if (currentMode === "byAnime") {
        searchInput.placeholder = viewingAnimeCharacters
            ? `Characters from ${selectedAnime?.title || "selected anime"}...`
            : "Search for an anime to browse its characters...";
    } else {
        searchInput.placeholder = "Search for an anime...";
    }
}


function updateSortVisibility() {
    const resultsAreShowing =
        currentApiResultCount > 0 &&
        Boolean(resultsElement.querySelector(".mal-search-result"));

    characterSortRow.style.display =
        displayMode === "character" && resultsAreShowing
            ? "flex"
            : "none";
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

    displayMode = currentMode === "character" ? "character" : "anime";
    viewingAnimeCharacters = false;
    selectedAnime = null;
    animeSearchSnapshot = null;
    updateTabs();
    backButton.style.display = "none";
    backButton.textContent = "Back";

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
        `Searching ${currentMode === "character" ? "characters" : "anime"}...`;

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

    const startIndex = allResults.length;
    allResults.push(
        ...apiResults.map((item, index) => ({
            ...item,
            // Keep the API's mal_id field while exposing the camelCase
            // property used by gallery/detail navigation throughout the UI.
            malId: item.malId ?? item.mal_id,
            _sortIndex: startIndex + index
        }))
    );

    if (displayMode === "character") {
        sortCharacterResults();
    }


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
   Character Sorting
======================================== */

function sortCharacterResults() {
    if (displayMode !== "character") return;

    if (characterSortMode === "alphabetical") {
        allResults.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
        return;
    }

    if (characterSortMode === "popular") {
        allResults.sort((a, b) => {
            const favoritesA = Number(a.favorites || a.favorites_count || 0);
            const favoritesB = Number(b.favorites || b.favorites_count || 0);
            return favoritesB - favoritesA || (a._sortIndex || 0) - (b._sortIndex || 0);
        });
        return;
    }

    if (characterSortMode === "role") {
        const roleRank = role => {
            const normalized = String(role || "").toLowerCase();
            if (normalized === "main") return 0;
            if (normalized === "supporting") return 1;
            return 2;
        };

        allResults.sort((a, b) =>
            roleRank(a.role) - roleRank(b.role) ||
            String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })
        );
        return;
    }

    allResults.sort((a, b) => (a._sortIndex || 0) - (b._sortIndex || 0));
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

    updateSortVisibility();

    if (viewingAnimeCharacters && selectedAnime) {
        statusElement.textContent =
            `${currentApiResultCount} characters from ${selectedAnime.title || "this anime"} — Page ${currentPage}.`;
        return;
    }

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
            displayMode,

        resultsElement,

        queueCharacterAnimeRequest,

        onResultClick:
            item => {
                handleResultClick(item);
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
     * Use the search result whenever it has
     * at least one useful metadata field.
     *
     * These details are supplementary to
     * choosing an image, so don't request
     * the full anime record just to fill
     * every missing field on every card.
     */

    if (parts.length > 0) {

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
   Handle Search Result Click
======================================== */

function handleResultClick(item) {
    if (currentMode === "byAnime" && displayMode === "anime") {
        loadAnimeCharacters(item);
        return;
    }
    openGallery(item);
}


/* ========================================
   Load Characters for Selected Anime
======================================== */

async function loadAnimeCharacters(anime) {
    if (!anime || !anime.malId) {
        statusElement.textContent = "This anime does not have a valid MyAnimeList ID.";
        return;
    }

    animeSearchSnapshot = {
        allResults, currentResults, currentQuery, currentPage, currentApiPage,
        hasNextApiPage, hasNextPage, currentApiResultCount, displayMode
    };

    selectedAnime = anime;
    viewingAnimeCharacters = true;
    displayMode = "character";
    updateTabs();
    isSearching = true;
    statusElement.textContent = `Loading characters from ${anime.title || "this anime"}...`;
    searchButton.disabled = true;
    resultsElement.innerHTML = "";
    updatePagination();

    try {
        const response = await getAnimeCharacters(anime.malId);
        const entries = Array.isArray(response && response.data) ? response.data : [];

        allResults = entries.map((entry, index) => {
            const character = (entry && entry.character) || (entry && entry.data && entry.data.character) || entry;
            const malId = character && (character.mal_id ?? character.malId) || (entry && entry.mal_id);
            if (!malId) return null;
            return { ...character, malId, animeTitle: anime.title || "", role: (entry && entry.role) || "", _sortIndex: index };
        }).filter(Boolean);

        currentResults = [];
        sortCharacterResults();
        currentPage = 1;
        currentApiPage = 1;
        hasNextApiPage = false;
        hasNextPage = allResults.length > RESULTS_PER_PAGE;
        currentApiResultCount = allResults.length;

        if (allResults.length === 0) {
            resultsElement.innerHTML = "";
            statusElement.textContent = `No characters were found for ${anime.title || "this anime"}.`;
        } else {
            renderCurrentPage();
        }

        backButton.textContent = "Back to anime results";
        backButton.style.display = "block";
        backButton.onclick = restoreAnimeSearch;
    } catch (error) {
        console.error("Unable to load anime characters:", error);
        statusElement.textContent = "Unable to load characters for this anime right now.";
        backButton.textContent = "Back to anime results";
        backButton.style.display = "block";
        backButton.onclick = restoreAnimeSearch;
    } finally {
        isSearching = false;
        searchButton.disabled = false;
        updatePagination();
    }
}


/* ========================================
   Return to Anime Search Results
======================================== */

function restoreAnimeSearch() {
    if (!animeSearchSnapshot) {
        backButton.style.display = "none";
        return;
    }

    const saved = animeSearchSnapshot;
    allResults = saved.allResults;
    currentResults = saved.currentResults;
    currentQuery = saved.currentQuery;
    currentPage = saved.currentPage;
    currentApiPage = saved.currentApiPage;
    hasNextApiPage = saved.hasNextApiPage;
    hasNextPage = saved.hasNextPage;
    currentApiResultCount = saved.currentApiResultCount;
    displayMode = saved.displayMode;

    animeSearchSnapshot = null;
    selectedAnime = null;
    viewingAnimeCharacters = false;
    updateTabs();
    showSearchView({ resultsElement, galleryElement: resultsElement, backButton });
    backButton.textContent = "Back";
    backButton.style.display = "none";
    renderCurrentPage();
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

    statusElement.textContent = "";
    characterSortRow.style.display = "none";
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
            displayMode,

        targetElement,

        resultsElement,

        galleryElement:
            resultsElement,

        galleryTitleElement:
            null,

        galleryGridElement:
            resultsElement,

            statusElement,

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


    if (viewingAnimeCharacters) {
        backButton.textContent = "Back to anime results";
        backButton.style.display = "block";
        backButton.onclick = restoreAnimeSearch;
    } else {
        backButton.textContent = "Back";
        backButton.style.display = "none";
    }


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


// ========================================
// Close When Clicking Overlay
// ========================================

let malSearchStartedOnBackdrop = false;

modal.addEventListener(
    "mousedown",
    event => {

        malSearchStartedOnBackdrop =
            event.target === modal;
    }
);

modal.addEventListener(
    "click",
    event => {

        if (
            malSearchStartedOnBackdrop &&
            event.target === modal
        ) {

            closeMalSearch();

        }

        malSearchStartedOnBackdrop = false;
    }
);