import { appState } from "../state.js";

import {
    saveHistoryState
} from "../history.js";

import {
    openCropForFile,
    openCropForExistingImage
} from "../cropper/cropper.js";

import {
    clearImageBox
} from "../board.js";

import {
    openMalSearch
} from "./malSearch.js";


// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");

const imageMenu =
    document.getElementById("imageMenu");

const addImageMenu =
    document.getElementById("addImageMenu");

const uploadImageButton =
    document.getElementById("uploadImageButton");

const searchMalButton =
    document.getElementById("searchMalButton");

const closeAddImageMenuButton =
    document.getElementById(
        "closeAddImageMenuButton"
    );

const updateImageButton =
    document.getElementById(
        "updateImageButton"
    );

const replaceWithMalButton =
    document.getElementById(
        "replaceWithMalButton"
    );

const replaceImageButton =
    document.getElementById(
        "replaceImageButton"
    );

const deleteImageButton =
    document.getElementById(
        "deleteImageButton"
    );

const closeMenuButton =
    document.getElementById(
        "closeImageMenuButton"
    );


// ========================================
// Open File Selector
// ========================================

export function openFileSelector(
    element
) {

    appState.selectedDiv =
        element;

    const fileInput =
        document.createElement(
            "input"
        );

    fileInput.type =
        "file";

    fileInput.accept =
        "image/jpeg, image/png, image/webp";

    fileInput.addEventListener(
        "change",
        () => {

            const file =
                fileInput.files[0];

            if (!file) {
                return;
            }

            openCropForFile(
                file,
                element
            );
        }
    );

    fileInput.click();
}


// ========================================
// Show Image Menu
// ========================================

export function showImageMenu(
    element
) {

    appState.menuDiv =
        element;

    imageMenu.style.display =
        "flex";

    positionMenu(
        imageMenu,
        element
    );
}


// ========================================
// Show Add Image Menu
// ========================================

export function showAddImageMenu(
    element
) {

    appState.menuDiv =
        element;

    addImageMenu.style.display =
        "flex";

    positionMenu(
        addImageMenu,
        element
    );
}


// ========================================
// Position Menu Near Box
// ========================================

function positionMenu(
    menu,
    element
) {

    menu.style.transform =
        "none";

    const boxRect =
        element.getBoundingClientRect();

    const menuRect =
        menu.getBoundingClientRect();

    const margin =
        10;


    // ========================================
    // Default Position
    // ========================================

    let left =
        boxRect.left +
        (boxRect.width / 2) -
        (menuRect.width / 2);

    let top =
        boxRect.bottom +
        margin;


    // ========================================
    // Keep Inside Left Edge
    // ========================================

    if (
        left < margin
    ) {

        left =
            margin;
    }


    // ========================================
    // Keep Inside Right Edge
    // ========================================

    if (
        left + menuRect.width >
        window.innerWidth - margin
    ) {

        left =
            window.innerWidth -
            menuRect.width -
            margin;
    }


    // ========================================
    // If Not Enough Room Below,
    // Put It Above The Box
    // ========================================

    if (
        top + menuRect.height >
        window.innerHeight - margin
    ) {

        top =
            boxRect.top -
            menuRect.height -
            margin;
    }


    // ========================================
    // Keep Inside Top Edge
    // ========================================

    if (
        top < margin
    ) {

        top =
            margin;
    }


    // ========================================
    // Apply Position
    // ========================================

    menu.style.left =
        `${left}px`;

    menu.style.top =
        `${top}px`;
}


// ========================================
// Upload Image From Add Menu
// ========================================

uploadImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        addImageMenu.style.display =
            "none";

        appState.menuDiv =
            null;

        openFileSelector(
            div
        );
    }
);


// ========================================
// Search MyAnimeList
// ========================================

searchMalButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        addImageMenu.style.display =
            "none";

        appState.menuDiv =
            null;

        openMalSearch(
            div
        );
    }
);


// ========================================
// Close Add Image Menu
// ========================================

closeAddImageMenuButton.addEventListener(
    "click",
    () => {

        addImageMenu.style.display =
            "none";

        appState.menuDiv =
            null;
    }
);


// ========================================
// Update Existing Image
// ========================================

updateImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        const boxIndex =
            Number(
                div.dataset.index
            );

        if (
            !Number.isInteger(
                boxIndex
            ) ||
            boxIndex < 0 ||
            boxIndex >= board.children.length
        ) {
            return;
        }

        const imageData =
            appState.savedImages[
                boxIndex
            ];

        if (
            !imageData ||
            typeof imageData !== "object"
        ) {
            return;
        }

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;

        openCropForExistingImage(
            imageData,
            div
        );
    }
);


// ========================================
// Replace Image
// ========================================

replaceImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;

        openFileSelector(
            div
        );
    }
);


// ========================================
// Replace Image With MyAnimeList
// ========================================

replaceWithMalButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;

        openMalSearch(
            div
        );
    }
);


// ========================================
// Delete Image
// ========================================

deleteImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        const boxIndex =
            Number(
                div.dataset.index
            );

        if (
            !Number.isInteger(
                boxIndex
            ) ||
            boxIndex < 0 ||
            boxIndex >= board.children.length
        ) {
            return;
        }

        // Remove saved image
        appState.savedImages[
            boxIndex
        ] = null;

        // Clear visual box
        clearImageBox(
            div,
            boxIndex
        );

        // Save completed state
        saveHistoryState();

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;
    }
);


// ========================================
// Close Image Menu
// ========================================

closeMenuButton.addEventListener(
    "click",
    () => {

        imageMenu.style.display =
            "none";

        appState.menuDiv =
            null;
    }
);


// ========================================
// Click On Board
// ========================================

board.addEventListener(
    "click",
    (event) => {

        // Ignore buttons inside menus
        if (
            event.target.closest(
                "button"
            )
        ) {
            return;
        }


        const div =
            event.target.closest(
                ".image"
            );


        // ========================================
        // Clicked Outside An Image Box
        // ========================================

        if (!div) {

            imageMenu.style.display =
                "none";

            addImageMenu.style.display =
                "none";

            appState.menuDiv =
                null;

            return;
        }


        // ========================================
        // Close Any Existing Menu
        // ========================================

        imageMenu.style.display =
            "none";

        addImageMenu.style.display =
            "none";

        appState.menuDiv =
            null;


        // ========================================
        // Existing Image
        // ========================================

        if (
            div.querySelector(
                "img"
            )
        ) {

            showImageMenu(
                div
            );

            return;
        }


        // ========================================
        // Empty Box
        // ========================================

        showAddImageMenu(
            div
        );
    }
);


// ========================================
// Close Menus When Clicking Outside
// ========================================

document.addEventListener(
    "click",
    (event) => {

        // Click was inside one of the menus
        if (
            imageMenu.contains(
                event.target
            ) ||
            addImageMenu.contains(
                event.target
            )
        ) {
            return;
        }


        // Click was handled by the board
        if (
            board.contains(
                event.target
            )
        ) {
            return;
        }


        // Clicked somewhere else
        imageMenu.style.display =
            "none";

        addImageMenu.style.display =
            "none";

        appState.menuDiv =
            null;
    }
);