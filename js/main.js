import { generateBoard } from "./board.js";

import {
    bulkImport
} from "./images.js";

import {
    loadBoard,
    saveBoard
} from "./storage.js";

import {
    downloadBoard
} from "./download.js";


// ========================================
// Elements
// ========================================

const rowsInput =
    document.getElementById("rows");

const columnsInput =
    document.getElementById("columns");

const generateButton =
    document.getElementById(
        "generateBoard"
    );

const bulkImportButton =
    document.getElementById(
        "bulkImportButton"
    );

const imageRatioInput =
    document.getElementById(
        "imageRatio"
    );

const downloadButton =
    document.getElementById(
        "downloadButton"
    );

const downloadMenu =
    document.getElementById(
        "downloadMenu"
    );


// ========================================
// Load Saved Project
// ========================================

if (!loadBoard()) {

    generateBoard();

    saveBoard();

} else {

    generateBoard();
}


// ========================================
// Generate Board
// ========================================

generateButton.addEventListener(
    "click",
    () => {

        generateBoard();

        saveBoard();
    }
);


// ========================================
// Change Ratio
// ========================================

imageRatioInput.addEventListener(
    "change",
    () => {

        generateBoard();

        saveBoard();
    }
);


// ========================================
// Bulk Import
// ========================================

bulkImportButton.addEventListener(
    "click",
    bulkImport
);


// ========================================
// Download Menu
// ========================================

downloadButton.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();


        const isOpen =
            downloadMenu.style.display ===
            "flex";


        downloadMenu.style.display =
            isOpen
                ? "none"
                : "flex";
    }
);


// ========================================
// Download Format
// ========================================

downloadMenu.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) {
            return;
        }


        const format =
            button.dataset.format;


        if (!format) {
            return;
        }


        downloadBoard(format);


        downloadMenu.style.display =
            "none";
    }
);


// ========================================
// Close Download Menu
// ========================================

document.addEventListener(
    "click",
    (event) => {

        if (
            !downloadMenu.contains(
                event.target
            ) &&
            !downloadButton.contains(
                event.target
            )
        ) {

            downloadMenu.style.display =
                "none";
        }
    }
);


// ========================================
// Resize Board With Window
// ========================================

let resizeTimer;

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    generateBoard();

                },
                100
            );
    }
);