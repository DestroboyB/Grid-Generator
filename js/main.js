import { updateBoardStyle,
    generateBoard } from "./board.js";

import {
    undo,
    redo,
    updateHistoryButtons,
    saveHistoryState,
    initializeHistory
} from "./history.js";

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

import { appState } from "./state.js";


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

const spacingInput =
    document.getElementById(
        "spacing"
    );

const spacingValue =
    document.getElementById(
        "spacingValue"
    );

const backgroundColorInput =
    document.getElementById(
        "backgroundColor"
    );

const undoButton =
    document.getElementById(
        "undoButton"
    );

const redoButton =
    document.getElementById(
        "redoButton"
    );

const clearBoardButton =
    document.getElementById(
        "clearBoardButton"
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


// Update controls after loading
spacingValue.textContent =
    `${appState.spacing} px`;


// Initialize history
initializeHistory();


// ========================================
// Generate Board
// ========================================

generateButton.addEventListener(
    "click",
    () => {


        generateBoard();


        saveHistoryState();
    }
);


// ========================================
// Change Ratio
// ========================================

imageRatioInput.addEventListener(
    "change",
    () => {


        generateBoard();


         saveHistoryState();
    }
);


// ========================================
// Spacing
// ========================================

spacingInput.addEventListener(
    "input",
    () => {

        appState.spacing =
            Number(
                spacingInput.value
            );

        spacingValue.textContent =
            `${appState.spacing} px`;

        updateBoardStyle();
    }
);


spacingInput.addEventListener(
    "change",
    () => {

        saveHistoryState();
    }
);




// ========================================
// Background Color
// ========================================

backgroundColorInput.addEventListener(
    "input",
    () => {

        appState.backgroundColor =
            backgroundColorInput.value;

        updateBoardStyle();
    }
);


backgroundColorInput.addEventListener(
    "change",
    () => {

        saveHistoryState();
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
// Undo Button
// ========================================

undoButton.addEventListener(
    "click",
    () => {

        undo();
    }
);


// ========================================
// Redo Button
// ========================================

redoButton.addEventListener(
    "click",
    () => {

        redo();
    }
);

// ========================================
// Clear Board
// ========================================

clearBoardButton.addEventListener(
    "click",
    () => {

        // Don't create a history entry
        // if the board is already empty.
        const hasImages =
            appState.savedImages.some(
                image => image !== null
            );


        if (!hasImages) {
            return;
        }


        // Clear all images
        appState.savedImages =
            [];


        // Rebuild the board
        generateBoard();


        // Save the cleared board
        // as a new history state
        saveHistoryState();
    }
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


// ========================================
// Keyboard Shortcuts
// ========================================

document.addEventListener(
    "keydown",
    (event) => {

        const activeElement =
            document.activeElement;


        const isTyping =
            activeElement.tagName === "INPUT" &&
            activeElement.type === "text";


        if (isTyping) {
            return;
        }


        // ========================================
        // Undo - Ctrl + Z
        // ========================================

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            event.key.toLowerCase() === "z"
        ) {

            event.preventDefault();

            undo();

            return;
        }


        // ========================================
        // Redo - Ctrl + Y
        // ========================================

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "y"
        ) {

            event.preventDefault();

            redo();

            return;
        }


        // ========================================
        // Redo - Ctrl + Shift + Z
        // ========================================

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "z"
        ) {

            event.preventDefault();

            redo();

            return;
        }
    }
);