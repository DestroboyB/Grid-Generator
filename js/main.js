import {
    updateBoardStyle,
    generateBoard
} from "./board.js";

import {
    undo,
    redo,
    updateHistoryButtons,
    saveHistoryState,
    initializeHistory
} from "./history.js";

import {
    openFileSelector,
    showImageMenu
} from "./images/images.js";

import {
    bulkImport
} from "./images/imageImport.js";

import "./images/imageDragDrop.js";

import {
    loadBoard,
    saveBoard
} from "./storage/grids.js";

import {
    downloadBoard
} from "./download.js";

import { appState } from "./state.js";

import "./library/library.js";


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


// ========================================
// Border Controls
// ========================================

const borderEnabledInput =
    document.getElementById(
        "borderEnabled"
    );

const borderColorInput =
    document.getElementById(
        "borderColor"
    );

const borderSizeInput =
    document.getElementById(
        "borderSize"
    );

const borderSizeValue =
    document.getElementById(
        "borderSizeValue"
    );


// ========================================
// Board Settings
// ========================================

const boardSettingsButton =
    document.getElementById(
        "boardSettingsButton"
    );

const boardSettingsPanel =
    document.getElementById(
        "boardSettingsPanel"
    );


// ========================================
// History / Actions
// ========================================

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
// Board Settings Menu
// ========================================

function closeBoardSettings() {

    boardSettingsPanel.classList.remove(
        "open"
    );

    boardSettingsButton.setAttribute(
        "aria-expanded",
        "false"
    );
}


function toggleBoardSettings() {

    const isOpen =
        boardSettingsPanel.classList.contains(
            "open"
        );


    if (isOpen) {

        closeBoardSettings();

    } else {

        boardSettingsPanel.classList.add(
            "open"
        );

        boardSettingsButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }
}


boardSettingsButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        toggleBoardSettings();
    }
);


// ========================================
// Close Settings When Clicking Outside
// ========================================

document.addEventListener(
    "click",
    event => {

        if (
            !boardSettingsPanel.contains(
                event.target
            ) &&
            !boardSettingsButton.contains(
                event.target
            )
        ) {

            closeBoardSettings();
        }
    }
);


// ========================================
// Load Saved Project
// ========================================

const loaded =
    await loadBoard();


// ========================================
// Default Missing Settings
// ========================================

/*
 * These defaults allow older saved grids
 * to continue working after adding new
 * board settings.
 */

if (
    appState.borderEnabled === undefined ||
    appState.borderEnabled === null
) {

    appState.borderEnabled =
        true;
}


if (
    !appState.borderColor
) {

    appState.borderColor =
        "#9ca3af";
}


if (
    appState.borderSize === undefined ||
    appState.borderSize === null
) {

    appState.borderSize =
        2;
}


if (
    !appState.backgroundColor
) {

    appState.backgroundColor =
        "#ffffff";
}


if (
    appState.spacing === undefined ||
    appState.spacing === null
) {

    appState.spacing =
        0;
}


// ========================================
// Generate / Load Board
// ========================================

if (!loaded) {

    generateBoard();

    await saveBoard();

} else {

    generateBoard();
}


// ========================================
// Update Controls After Loading
// ========================================

spacingInput.value =
    appState.spacing;

spacingValue.textContent =
    `${appState.spacing} px`;


backgroundColorInput.value =
    appState.backgroundColor;


borderEnabledInput.checked =
    appState.borderEnabled;


borderColorInput.value =
    appState.borderColor;


borderSizeInput.value =
    appState.borderSize;

borderSizeValue.textContent =
    `${appState.borderSize} px`;


// ========================================
// Initialize History
// ========================================

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
// Border Enabled
// ========================================

borderEnabledInput.addEventListener(
    "change",
    () => {

        appState.borderEnabled =
            borderEnabledInput.checked;

        updateBoardStyle();

        saveHistoryState();
    }
);


// ========================================
// Border Color
// ========================================

borderColorInput.addEventListener(
    "input",
    () => {

        appState.borderColor =
            borderColorInput.value;

        updateBoardStyle();
    }
);


borderColorInput.addEventListener(
    "change",
    () => {

        saveHistoryState();
    }
);


// ========================================
// Border Size
// ========================================

borderSizeInput.addEventListener(
    "input",
    () => {

        appState.borderSize =
            Number(
                borderSizeInput.value
            );

        borderSizeValue.textContent =
            `${appState.borderSize} px`;

        updateBoardStyle();
    }
);


borderSizeInput.addEventListener(
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

        const hasImages =
            appState.savedImages.some(
                image => image !== null
            );


        if (!hasImages) {
            return;
        }


        appState.savedImages =
            [];


        generateBoard();


        saveHistoryState();
    }
);


// ========================================
// Download Menu
// ========================================

downloadButton.addEventListener(
    "click",
    event => {

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
    event => {

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
    event => {

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
    event => {

        const activeElement =
            document.activeElement;


        const isTyping =
            activeElement &&
            (
                activeElement.tagName ===
                    "INPUT" ||
                activeElement.tagName ===
                    "TEXTAREA"
            );


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