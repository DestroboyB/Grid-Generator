import { appState } from "../state.js";

import {
    openCropForURL
} from "../cropper/cropper.js";


// ========================================
// Openverse API
// ========================================

const API_URL =
    "https://api.openverse.org/v1/images/";


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


// ========================================
// Search State
// ========================================

let currentPage = 1;
let currentQuery = "";
let totalPages = 1;


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

async function performSearch() {

    if (!currentQuery) {
        return;
    }


    imageSearchResults.innerHTML =
        "";

    imageSearchStatus.textContent =
        "Searching...";


    updatePagination();


    try {

        const params =
            new URLSearchParams({
                q: currentQuery,
                page: currentPage,
                page_size: 20
            });


        const response =
            await fetch(
                `${API_URL}?${params.toString()}`
            );


        if (!response.ok) {

            if (
                response.status === 429
            ) {

                throw new Error(
                    "Search rate limit reached. Please wait a moment and try again."
                );
            }


            throw new Error(
                `Image search failed (${response.status}).`
            );
        }


        const data =
            await response.json();


        totalPages =
            data.page_count || 1;


        renderResults(
            data.results || []
        );


        updatePagination();


        if (
            !data.results ||
            data.results.length === 0
        ) {

            imageSearchStatus.textContent =
                "No images found.";

        } else {

            const resultCount =
                data.result_count ||
                data.results.length;


            imageSearchStatus.textContent =
                `${resultCount} results found.`;

        }

    } catch (error) {

        console.error(
            "Openverse image search failed:",
            error
        );


        imageSearchResults.innerHTML =
            "";


        imageSearchStatus.textContent =
            error.message ||
            "Unable to search for images.";


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

        await performSearch();

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

        await performSearch();

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

imageSearchModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            imageSearchModal
        ) {

            closeImageSearch();

        }
    }
);
