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

import { openMalSearch } from "./mal/malSearch.js";

import {
    openImageSearch
} from "./imageSearch.js";

import {
    openUrlImage
} from "./urlImage.js";

// ========================================
// Elements
// ========================================

const board =
    document.getElementById(
        "board"
    );

const imageMenu =
    document.getElementById(
        "imageMenu"
    );

const addImageMenu =
    document.getElementById(
        "addImageMenu"
    );

const imageSourceMenu =
    document.getElementById(
        "imageSourceMenu"
    );

const replaceImageSourceMenu =
    document.getElementById(
        "replaceImageSourceMenu"
    );


// ========================================
// Empty Image Menu
// ========================================

const openImageSourceMenuButton =
    document.getElementById(
        "openImageSourceMenuButton"
    );

const backToAddImageMenuButton =
    document.getElementById(
        "backToAddImageMenuButton"
    );

const uploadImageButton =
    document.getElementById(
        "uploadImageButton"
    );

const searchMalButton =
    document.getElementById(
        "searchMalButton"
    );

const imageSearchButton =
    document.getElementById(
        "imageSearchButton"
    );

const closeAddImageMenuButton =
    document.getElementById(
        "closeAddImageMenuButton"
    );


// ========================================
// Existing Image Menu
// ========================================

const updateImageButton =
    document.getElementById(
        "updateImageButton"
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
// Replace Image Menu
// ========================================

const backToImageMenuButton =
    document.getElementById(
        "backToImageMenuButton"
    );

const replaceUploadImageButton =
    document.getElementById(
        "replaceUploadImageButton"
    );

const replaceWithMalButton =
    document.getElementById(
        "replaceWithMalButton"
    );

const replaceImageSearchButton =
    document.getElementById(
        "replaceImageSearchButton"
    );

    const urlImageButton =
    document.getElementById("urlImageButton");

const replaceUrlImageButton =
    document.getElementById("replaceUrlImageButton");

// ========================================
// Close All Menus
// ========================================

function closeAllMenus() {

    imageMenu.style.display =
        "none";

    addImageMenu.style.display =
        "none";

    imageSourceMenu.style.display =
        "none";

    replaceImageSourceMenu.style.display =
        "none";

}


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
// Show Existing Image Menu
// ========================================

export function showImageMenu(
    element
) {

    closeAllMenus();


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
// Show Empty Image Menu
// ========================================

export function showAddImageMenu(
    element
) {

    closeAllMenus();


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
// Position Menu
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


    let left =
        boxRect.left +
        (boxRect.width / 2) -
        (menuRect.width / 2);


    let top =
        boxRect.bottom +
        margin;


    if (
        left < margin
    ) {

        left =
            margin;

    }


    if (
        left + menuRect.width >
        window.innerWidth - margin
    ) {

        left =
            window.innerWidth -
            menuRect.width -
            margin;

    }


    if (
        top + menuRect.height >
        window.innerHeight - margin
    ) {

        top =
            boxRect.top -
            menuRect.height -
            margin;

    }


    if (
        top < margin
    ) {

        top =
            margin;

    }


    menu.style.left =
        `${left}px`;

    menu.style.top =
        `${top}px`;

}


// ========================================
// Open Image Source Menu
// ========================================

openImageSourceMenuButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        addImageMenu.style.display =
            "none";


        imageSourceMenu.style.display =
            "flex";


        positionMenu(
            imageSourceMenu,
            appState.menuDiv
        );

    }
);


// ========================================
// Back To Add Image Menu
// ========================================

backToAddImageMenuButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        imageSourceMenu.style.display =
            "none";


        addImageMenu.style.display =
            "flex";


        positionMenu(
            addImageMenu,
            appState.menuDiv
        );

    }
);


// ========================================
// Upload Image From Add Menu
// ========================================

uploadImageButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        const div =
            appState.menuDiv;


        closeAllMenus();


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

        if (
            !appState.menuDiv
        ) {

            return;

        }


        const div =
            appState.menuDiv;


        closeAllMenus();


        appState.menuDiv =
            null;


        openMalSearch(
            div
        );

    }
);


// ========================================
// Image Search
// ========================================

imageSearchButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        const div =
            appState.menuDiv;


        imageSourceMenu.style.display =
            "none";


        appState.menuDiv =
            null;


        openImageSearch(
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

        closeAllMenus();


        appState.menuDiv =
            null;

    }
);


// ========================================
// Edit Existing Image
// ========================================

updateImageButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

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
            boxIndex >=
                board.children.length
        ) {

            return;

        }


        const imageData =
            appState.savedImages[
                boxIndex
            ];


        if (
            !imageData ||
            typeof imageData !==
                "object"
        ) {

            return;

        }


        closeAllMenus();


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

        if (
            !appState.menuDiv
        ) {

            return;

        }


        imageMenu.style.display =
            "none";


        replaceImageSourceMenu.style.display =
            "flex";


        positionMenu(
            replaceImageSourceMenu,
            appState.menuDiv
        );

    }
);


// ========================================
// Back To Existing Image Menu
// ========================================

backToImageMenuButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        replaceImageSourceMenu.style.display =
            "none";


        imageMenu.style.display =
            "flex";


        positionMenu(
            imageMenu,
            appState.menuDiv
        );

    }
);


// ========================================
// Replace With Uploaded Image
// ========================================

replaceUploadImageButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        const div =
            appState.menuDiv;


        closeAllMenus();


        appState.menuDiv =
            null;


        openFileSelector(
            div
        );

    }
);


// ========================================
// Replace With MyAnimeList
// ========================================

replaceWithMalButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        const div =
            appState.menuDiv;


        closeAllMenus();


        appState.menuDiv =
            null;


        openMalSearch(
            div
        );

    }
);


// ========================================
// Replace With Image Search
// ========================================

replaceImageSearchButton.addEventListener(
    "click",
    () => {

        if (
            !appState.menuDiv
        ) {

            return;

        }


        const div =
            appState.menuDiv;


        replaceImageSourceMenu.style.display =
            "none";


        appState.menuDiv =
            null;


        openImageSearch(
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

        if (
            !appState.menuDiv
        ) {

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
            boxIndex >=
                board.children.length
        ) {

            return;

        }


        appState.savedImages[
            boxIndex
        ] = null;


        clearImageBox(
            div,
            boxIndex
        );


        saveHistoryState();


        closeAllMenus();


        appState.menuDiv =
            null;

    }
);


// ========================================
// Close Existing Image Menu
// ========================================

closeMenuButton.addEventListener(
    "click",
    () => {

        closeAllMenus();


        appState.menuDiv =
            null;

    }
);


// ========================================
// Board Click
// ========================================

board.addEventListener(
    "click",
    event => {

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


        if (!div) {

            closeAllMenus();


            appState.menuDiv =
                null;


            return;

        }


        closeAllMenus();


        appState.menuDiv =
            null;


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
    event => {

        if (
            imageMenu.contains(
                event.target
            ) ||
            addImageMenu.contains(
                event.target
            ) ||
            imageSourceMenu.contains(
                event.target
            ) ||
            replaceImageSourceMenu.contains(
                event.target
            )
        ) {

            return;

        }


        /*
         * Don't close menus when clicking
         * somewhere on the board. The board
         * click handler manages those menus.
         */

        if (
            board.contains(
                event.target
            )
        ) {

            return;

        }


        closeAllMenus();


        appState.menuDiv =
            null;

    }
);

urlImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        closeAllMenus();

        appState.menuDiv = null;

        openUrlImage(div);

    }
);

replaceUrlImageButton.addEventListener(
    "click",
    () => {

        if (!appState.menuDiv) {
            return;
        }

        const div =
            appState.menuDiv;

        closeAllMenus();

        appState.menuDiv = null;

        openUrlImage(div);

    }
);