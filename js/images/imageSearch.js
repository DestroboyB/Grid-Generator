import { appState } from "../state.js";

import {
    openCropForURL
} from "../cropper/cropper.js";
import { importAnimatedGif } from "./animatedGif.js";


// ========================================
// Wikimedia Commons API
// ========================================

const API_URL =
    "https://commons.wikimedia.org/w/api.php";

const RESULTS_PER_PAGE = 12;
const SEARCH_TIMEOUT_MS = 15000;


// ========================================
// Elements
// ========================================

const imageSearchModal =
    document.getElementById(
        "imageSearchModal"
    );

const imageSearchInput =
    document.getElementById(
        "imageSearchInput"
    );

const imageSearchSubmitButton =
    document.getElementById(
        "imageSearchSubmitButton"
    );

const imageSearchResults =
    document.getElementById(
        "imageSearchResults"
    );

const imageSearchStatus =
    document.getElementById(
        "imageSearchStatus"
    );

const imageSearchCloseButton =
    document.getElementById(
        "imageSearchCloseButton"
    );

const imageSearchPreviousButton =
    document.getElementById(
        "imageSearchPreviousButton"
    );

const imageSearchNextButton =
    document.getElementById(
        "imageSearchNextButton"
    );

const imageSearchPageIndicator =
    document.getElementById(
        "imageSearchPageIndicator"
    );


// ========================================
// Search State
// ========================================

let currentPage = 1;
let currentQuery = "";
let totalPages = 1;

// Keep recent API responses in memory so repeat searches are immediate.
const searchCache = new Map();
const MAX_CACHED_SEARCHES = 30;


// ========================================
// Open Image Search
// ========================================

export function openImageSearch(element) {

    appState.selectedDiv =
        element;

    currentPage = 1;
    currentQuery = "";
    totalPages = 1;

    imageSearchInput.value = "";

    imageSearchResults.innerHTML = "";

    imageSearchStatus.textContent = "";

    updatePagination();

    imageSearchModal.style.display =
        "flex";

    setTimeout(() => {

        imageSearchInput.focus();

    }, 0);
}


// ========================================
// Close Image Search
// ========================================

export function closeImageSearch() {

    imageSearchModal.style.display =
        "none";

}


// ========================================
// Search Images
// ========================================

async function searchImages() {

    const query =
        imageSearchInput.value.trim();


    if (!query) {

        imageSearchStatus.textContent =
            "Enter something to search for.";

        imageSearchResults.innerHTML =
            "";

        totalPages = 1;

        updatePagination();

        return;
    }


    currentQuery =
        query;

    currentPage =
        1;


    await performSearch();
}


// ========================================
// Perform Search
// ========================================

async function performSearch({ keepResults = false } = {}) {

    if (!currentQuery) {
        return;
    }

    // Keep the current page visible while another page loads so the
    // search window doesn't collapse and expand during pagination.
    if (!keepResults) {
        imageSearchResults.innerHTML = "";
    }

    imageSearchStatus.textContent =
        keepResults ? "Loading page..." : "Searching Wikimedia Commons...";

    updatePagination();

    try {
        const cacheKey = `${currentQuery.trim().toLocaleLowerCase()}|${currentPage}`;
        let data = searchCache.get(cacheKey);
        const cacheHit = Boolean(data);
        let requestDuration = 0;

        if (!cacheHit) {
            const params = new URLSearchParams({
                action: "query",
                format: "json",
                origin: "*",
                generator: "search",
                gsrsearch: currentQuery,
                gsrnamespace: "6",
                gsrlimit: String(RESULTS_PER_PAGE),
                gsroffset: String((currentPage - 1) * RESULTS_PER_PAGE),
                prop: "imageinfo",
                iiprop: "url|mime",
                iiurlwidth: "300"
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                SEARCH_TIMEOUT_MS
            );
            const requestStartedAt = performance.now();

            try {
                const response = await fetch(
                    `${API_URL}?${params.toString()}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    if (response.status === 429 || response.status === 503) {
                        throw new Error("Wikimedia search is temporarily busy. Please wait a moment and retry.");
                    }
                    throw new Error(`Image search failed (${response.status}).`);
                }

                data = await response.json();
                requestDuration = performance.now() - requestStartedAt;
            } finally {
                clearTimeout(timeoutId);
            }

            if (data.error) {
                throw new Error(data.error.info || "Wikimedia image search failed.");
            }

            searchCache.set(cacheKey, data);
            if (searchCache.size > MAX_CACHED_SEARCHES) {
                searchCache.delete(searchCache.keys().next().value);
            }
        }

        const pages = Object.values(data.query?.pages || {});
        const results = pages
            .map(page => {
                const imageInfo = page.imageinfo?.[0];
                if (!imageInfo || !imageInfo.mime?.startsWith("image/")) {
                    return null;
                }

                return {
                    title: (page.title || "Untitled").replace(/^File:/i, "").replace(/_/g, " "),
                    thumbnail: imageInfo.thumburl || imageInfo.url,
                    url: imageInfo.url,
                    mime: imageInfo.mime,
                    pageUrl: imageInfo.descriptionurl
                };
            })
            .filter(result => result && result.thumbnail && result.url);

        // Commons doesn't provide a total hit count in the generator response.
        // Reveal the next page when the API says more results are available.
        totalPages = data.continue ? currentPage + 1 : currentPage;

        renderResults(results);
        updatePagination();

        if (results.length === 0) {
            imageSearchStatus.textContent = "No images found. Try a different search.";
        } else {
            imageSearchStatus.textContent = cacheHit
                ? `${results.length} images found on Wikimedia Commons (cached).`
                : `${results.length} images found on Wikimedia Commons in ${(requestDuration / 1000).toFixed(1)}s.`;
        }
    } catch (error) {
        console.error("Wikimedia Commons image search failed:", error);

        imageSearchResults.innerHTML = "";

        imageSearchStatus.textContent = error.name === "AbortError"
            ? "Wikimedia search timed out after 15 seconds. Please retry."
            : (error.message || "Unable to search for images.");

        totalPages = 1;
        updatePagination();
    }
}

function renderResults(results) {
    imageSearchResults.innerHTML = "";

    results.forEach(result => {
        if (!result.thumbnail) {
            return;
        }

        const resultButton =
            document.createElement("button");

        resultButton.type = "button";
        resultButton.className =
            "image-search-result";

        resultButton.title =
            result.title ||
            "Select image";

        const image =
    document.createElement("img");

image.src =
    result.thumbnail;

image.alt =
    result.title ||
    "Search result";

image.loading =
    "lazy";

image.onerror = () => {
    if (
        image.dataset.fallbackUsed !== "true" &&
        result.url
    ) {
        image.dataset.fallbackUsed = "true";
        image.src = result.url;
    }
};
        const info =
            document.createElement("div");

        info.className =
            "image-search-result-info";

        const title =
            document.createElement("div");

        title.className =
            "image-search-result-title";

        title.textContent =
            result.title ||
            "Untitled";

        info.appendChild(title);

        resultButton.appendChild(image);
        resultButton.appendChild(info);

        resultButton.addEventListener(
            "click",
            () => {
                selectImage(result);
            }
        );

        imageSearchResults.appendChild(
            resultButton
        );
    });
}


// ========================================
// Select Image
// ========================================

function selectImage(result) {

    if (!result.url) {

        imageSearchStatus.textContent =
            "This image cannot be loaded.";

        return;
    }


    const selectedDiv =
        appState.selectedDiv;


    if (!selectedDiv) {

        closeImageSearch();

        return;
    }


    imageSearchStatus.textContent =
        "Loading image...";


    try {

        closeImageSearch();

        if (result.mime === "image/gif" || /\.gif(?:[?#]|$)/i.test(result.url)) {
            imageSearchStatus.textContent = "Importing animated GIF...";
            importAnimatedGif(result.url, selectedDiv).catch(error => {
                console.error("Unable to import animated GIF:", error);
                alert(error.message || "Unable to import this GIF.");
            });
            return;
        }

        openCropForURL(
            result.url,
            selectedDiv
        );

    } catch (error) {

        console.error(
            "Unable to open selected image:",
            error
        );


        imageSearchModal.style.display =
            "flex";


        imageSearchStatus.textContent =
            "Unable to load that image. Try another result.";
    }
}


// ========================================
// Pagination
// ========================================

function updatePagination() {

    imageSearchPreviousButton.disabled =
        currentPage <= 1;


    imageSearchNextButton.disabled =
        currentPage >= totalPages ||
        totalPages <= 1;

    imageSearchPageIndicator.textContent =
        `Page ${currentPage} of ${totalPages}`;
}


// ========================================
// Search Button
// ========================================

imageSearchSubmitButton.addEventListener(
    "click",
    () => {

        searchImages();

    }
);


// ========================================
// Enter Key
// ========================================

imageSearchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            searchImages();

        }
    }
);


// ========================================
// Previous Page
// ========================================

imageSearchPreviousButton.addEventListener(
    "click",
    async () => {

        if (
            currentPage <= 1
        ) {

            return;
        }


        currentPage--;

        await performSearch({ keepResults: true });

    }
);


// ========================================
// Next Page
// ========================================

imageSearchNextButton.addEventListener(
    "click",
    async () => {

        if (
            currentPage >= totalPages
        ) {

            return;
        }


        currentPage++;

        await performSearch({ keepResults: true });

    }
);


// ========================================
// Close Button
// ========================================

imageSearchCloseButton.addEventListener(
    "click",
    () => {

        closeImageSearch();

    }
);


// ========================================
// Click Outside Window
// ========================================

let imageSearchStartedOnBackdrop = false;

imageSearchModal.addEventListener(
    "mousedown",
    event => {

        imageSearchStartedOnBackdrop =
            event.target === imageSearchModal;
    }
);

imageSearchModal.addEventListener(
    "click",
    event => {

        if (
            imageSearchStartedOnBackdrop &&
            event.target === imageSearchModal
        ) {

            closeImageSearch();

        }

        imageSearchStartedOnBackdrop = false;
    }
);
