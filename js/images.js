import { appState } from "./state.js";
import {
    saveHistoryState
} from "./history.js";
import {
    openCropForFile,
    openCropForURL
} from "./cropper.js";

import {
    saveBoard
} from "./storage.js";
// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");

const imageMenu =
    document.getElementById("imageMenu");

const replaceImageButton =
    document.getElementById("replaceImageButton");

const deleteImageButton =
    document.getElementById("deleteImageButton");

const closeMenuButton =
    document.getElementById("closeMenuButton");

const bulkImportButton =
    document.getElementById("bulkImportButton");


// ========================================
// Open File Selector
// ========================================

export function openFileSelector(element) {

    appState.selectedDiv =
        element;


    const fileInput =
        document.createElement("input");


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
        saveHistoryState();
    }
);


    fileInput.click();
}


// ========================================
// Show Image Menu
// ========================================

export function showImageMenu(element) {

    appState.menuDiv =
        element;


    imageMenu.style.display =
        "flex";


    imageMenu.style.left =
        "50%";


    imageMenu.style.top =
        "50%";


    imageMenu.style.transform =
        "translate(-50%, -50%)";
}


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


        openFileSelector(div);
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
            Array.from(
                board.children
            ).indexOf(div);

  
        // Remove saved image
        appState.savedImages[
            boxIndex
        ] = null;

                  saveHistoryState();
        // Clear box
        div.innerHTML = "";


        // Show box number
        div.textContent =
            boxIndex + 1;


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

        const div =
            event.target.closest(".image");


        if (!div) {
            return;
        }


        // Don't process clicks on
        // buttons or other elements
        if (
            event.target.closest("button")
        ) {
            return;
        }


        // Image already exists
        if (
            div.querySelector("img")
        ) {

            showImageMenu(div);

        } else {

            openFileSelector(div);
        }
    }
);

// ========================================
// Image Reordering / Drag And Drop
// ========================================

let draggedDiv = null;


// ========================================
// Drag Start
// ========================================

board.addEventListener(
    "dragstart",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );

        if (!div) {
            return;
        }


        // Only images already in the board
        // can be dragged for reordering
        if (
            !div.querySelector("img")
        ) {

            event.preventDefault();

            return;
        }


        draggedDiv =
            div;


        event.dataTransfer.effectAllowed =
            "move";


        event.dataTransfer.setData(
            "text/plain",
            "grid-image"
        );


        div.classList.add(
            "dragging"
        );
    }
);


// ========================================
// Drag Over
// ========================================

board.addEventListener(
    "dragover",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );


        if (!div) {
            return;
        }


        // ========================================
        // Existing Image Being Moved
        // ========================================

        if (draggedDiv) {

            // Don't highlight the box
            // we're dragging from
            if (
                div === draggedDiv
            ) {
                return;
            }


            event.preventDefault();


            event.dataTransfer.dropEffect =
                "move";


            // Remove highlight from every box
            board
                .querySelectorAll(
                    ".image"
                )
                .forEach(
                    box => {

                        box.classList.remove(
                            "drag-over"
                        );
                    }
                );


            // Highlight ONLY the box
            // currently being hovered
            div.classList.add(
                "drag-over"
            );


            return;
        }


        // ========================================
        // External File / URL
        // ========================================

        const types =
            event.dataTransfer.types;


        if (
            types.includes("Files") ||
            types.includes("text/uri-list")
        ) {

            event.preventDefault();


            // Remove highlight from all boxes
            board
                .querySelectorAll(
                    ".image"
                )
                .forEach(
                    box => {

                        box.classList.remove(
                            "drag-over"
                        );
                    }
                );


            // Highlight ONLY current box
            div.classList.add(
                "drag-over"
            );
        }
    }
);


// ========================================
// Drag Leave
// ========================================

board.addEventListener(
    "dragleave",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );


        if (!div) {
            return;
        }


        // Only remove the highlight if
        // we're actually leaving the box,
        // rather than moving onto an element
        // inside the same box.
        if (
            !div.contains(
                event.relatedTarget
            )
        ) {

            div.classList.remove(
                "drag-over"
            );
        }
    }
);


// ========================================
// Drop
// ========================================

board.addEventListener(
    "drop",
    (event) => {

        const div =
            event.target.closest(
                ".image"
            );


        if (!div) {
            return;
        }


        event.preventDefault();


        // ========================================
        // Internal Image Reordering
        // ========================================

        if (draggedDiv) {

            if (
                div !== draggedDiv
            ) {

                swapImages(
                    draggedDiv,
                    div
                );
            }


            clearDragState();

            return;
        }


        // ========================================
        // External Image
        // ========================================

        div.classList.remove(
            "drag-over"
        );


        // ----------------------------------------
        // Dropped File
        // ----------------------------------------

        const files =
            Array.from(
                event.dataTransfer.files
            );


        if (
            files.length > 0
        ) {

            const imageFile =
                files.find(
                    file =>
                        file.type.startsWith(
                            "image/"
                        )
                );


            if (imageFile) {

                openCropForFile(
                    imageFile,
                    div
                );

                return;
            }
        }


        // ----------------------------------------
        // Image From Browser Tab
        // ----------------------------------------

        const imageURL =
            event.dataTransfer.getData(
                "text/uri-list"
            );


        if (imageURL) {

            openCropForURL(
                imageURL,
                div
            );
        }
    }
);


// ========================================
// Drag End
// ========================================

board.addEventListener(
    "dragend",
    () => {

        clearDragState();
    }
);


// ========================================
// Clear Drag State
// ========================================

function clearDragState() {

    board
        .querySelectorAll(
            ".image"
        )
        .forEach(
            div => {

                div.classList.remove(
                    "dragging"
                );

                div.classList.remove(
                    "drag-over"
                );
            }
        );


    draggedDiv =
        null;
}



// ========================================
// Swap / Move Images
// ========================================

function swapImages(
    firstDiv,
    secondDiv
) {
        
    const boxes =
        Array.from(
            board.children
        );


    const firstIndex =
        boxes.indexOf(
            firstDiv
        );


    const secondIndex =
        boxes.indexOf(
            secondDiv
        );


    if (
        firstIndex === -1 ||
        secondIndex === -1
    ) {
        return;
    }


    // ========================================
    // Swap Saved Images
    // ========================================

    const temp =
        appState.savedImages[
            firstIndex
        ];


    appState.savedImages[
        firstIndex
    ] =
        appState.savedImages[
            secondIndex
        ];


    appState.savedImages[
        secondIndex
    ] =
        temp;


    // ========================================
    // Swap Visual Contents
    // ========================================

    const firstHTML =
        firstDiv.innerHTML;


    const secondHTML =
        secondDiv.innerHTML;


    firstDiv.innerHTML =
        secondHTML;


    secondDiv.innerHTML =
        firstHTML;


    // ========================================
    // Restore Box Number
    // ========================================
    // If a box is now empty, give it
    // its box number back.

    if (
        !firstDiv.querySelector("img")
    ) {

        firstDiv.textContent =
            firstIndex + 1;
    }


    if (
        !secondDiv.querySelector("img")
    ) {

        secondDiv.textContent =
            secondIndex + 1;
    }


    // ========================================
    // Update Draggable State
    // ========================================

    firstDiv.draggable =
        Boolean(
            firstDiv.querySelector("img")
        );


    secondDiv.draggable =
        Boolean(
            secondDiv.querySelector("img")
        );


    // ========================================
    // Save
    // ========================================

    saveHistoryState();
}

// ========================================
// Bulk Import
// ========================================

export function bulkImport() {

    const emptyBoxes =
        Array.from(
            board.querySelectorAll(".image")
        ).filter(
            div =>
                !div.querySelector("img")
        );


    // No empty boxes
    if (
        emptyBoxes.length === 0
    ) {

        alert(
            "There are no empty spaces available."
        );

        return;
    }


    const fileInput =
        document.createElement("input");


    fileInput.type =
        "file";


    fileInput.accept =
        "image/jpeg, image/png, image/webp";


    fileInput.multiple =
        true;


    fileInput.addEventListener(
        "change",
        async () => {

            const files =
                Array.from(
                    fileInput.files
                );


            if (
                files.length === 0
            ) {
                return;
            }

            saveHistoryState();
            const filesToImport =
                files.slice(
                    0,
                    emptyBoxes.length
                );


            for (
                let i = 0;
                i < filesToImport.length;
                i++
            ) {

                await importBulkImage(
                    filesToImport[i],
                    emptyBoxes[i]
                );
            }
        }
    );


    fileInput.click();
}


// ========================================
// Bulk Import Single Image
// ========================================

async function importBulkImage(
    file,
    div
) {

    return new Promise(
        (resolve) => {

            const imageURL =
                URL.createObjectURL(file);


            const image =
                new Image();


            image.onload =
                () => {

                    // ========================================
                    // Get Image Ratio
                    // ========================================

                    const imageRatioInput =
                        document.getElementById(
                            "imageRatio"
                        );


                    const [
                        ratioWidth,
                        ratioHeight
                    ] =
                        imageRatioInput.value
                            .split(":")
                            .map(Number);


                    const cropRatio =
                        ratioWidth /
                        ratioHeight;


                    // ========================================
                    // Temporary Container
                    // ========================================

                    image.style.maxWidth =
                        "none";


                    image.style.maxHeight =
                        "none";


                    const container =
                        document.createElement(
                            "div"
                        );


                    container.style.position =
                        "fixed";


                    container.style.left =
                        "-10000px";


                    container.style.top =
                        "-10000px";


                    container.style.width =
                        "1000px";


                    container.style.height =
                        "1000px";


                    document.body.appendChild(
                        container
                    );


                    container.appendChild(
                        image
                    );


                    // ========================================
                    // Temporary Cropper
                    // ========================================

                    let tempCropper;


                    tempCropper =
                        new Cropper(
                            image,
                            {

                                aspectRatio:
                                    cropRatio,

                                viewMode:
                                    1,

                                autoCropArea:
                                    1,

                                responsive:
                                    false,

                                ready() {

                                    const canvas =
                                        tempCropper
                                            .getCroppedCanvas(
                                                {
                                                    width: 500,

                                                    height:
                                                        Math.round(
                                                            500 /
                                                            cropRatio
                                                        )
                                                }
                                            );


                                    const croppedURL =
                                        canvas.toDataURL(
                                            "image/png"
                                        );


                                    // ========================================
                                    // Find Box
                                    // ========================================

                                    const boxIndex =
                                        Array.from(
                                            board.children
                                        ).indexOf(
                                            div
                                        );


                                    // ========================================
                                    // Save Image
                                    // ========================================

                                    appState.savedImages[
                                        boxIndex
                                    ] =
                                        croppedURL;


                                    saveBoard();


                                    // ========================================
                                    // Display Image
                                    // ========================================

                                    div.innerHTML =
                                        "";


                                    const img =
                                        document.createElement(
                                            "img"
                                        );


                                    img.src =
                                        croppedURL;


                                    div.appendChild(
                                        img
                                    );


                                    // ========================================
                                    // Cleanup
                                    // ========================================

                                    tempCropper.destroy();

                                    container.remove();

                                    URL.revokeObjectURL(
                                        imageURL
                                    );


                                    resolve();
                                }
                            }
                        );
                };


            image.src =
                imageURL;
        }
    );
}
