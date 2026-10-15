import { appState } from "../state.js";

import {
    saveHistoryState
} from "../history.js";

import {
    renderImage
} from "../board.js";

// ========================================
// Elements
// ========================================

const board =
    document.getElementById("board");


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


    // ========================================
    // No Empty Boxes
    // ========================================

    if (
        emptyBoxes.length === 0
    ) {

        alert(
            "There are no empty spaces available."
        );

        return;
    }


    // ========================================
    // File Selector
    // ========================================

    const fileInput =
        document.createElement("input");

    fileInput.type =
        "file";

    fileInput.accept =
        "image/jpeg, image/png, image/webp, image/gif,.gif";

    fileInput.multiple =
        true;


    // ========================================
    // Handle Files
    // ========================================

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


            const filesToImport =
                files.slice(
                    0,
                    emptyBoxes.length
                );


            // ========================================
            // Import Images
            // Continue if an individual file is invalid or cannot be read.
            // ========================================

            let failedImports = 0;

            for (
                let i = 0;
                i < filesToImport.length;
                i++
            ) {

                try {
                    await importBulkImage(
                        filesToImport[i],
                        emptyBoxes[i]
                    );
                } catch (error) {
                    failedImports += 1;
                    console.error(
                        "Could not import image:",
                        filesToImport[i]?.name,
                        error
                    );
                }
            }


            // ========================================
            // Save Completed State
            // ========================================

            saveHistoryState();

            if (failedImports > 0) {
                alert(
                    failedImports === 1
                        ? "1 image could not be imported. Please check that it is a valid image file."
                        : `${failedImports} images could not be imported. Please check that they are valid image files.`
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
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const source =
                        reader.result;


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

                                            const cropData =
                                                tempCropper.getData();


                                            // ========================================
                                            // Find Box
                                            // ========================================

                                            const boxIndex =
                                                Array.from(
                                                    board.children
                                                ).indexOf(
                                                    div
                                                );


                                            if (
                                                boxIndex === -1
                                            ) {

                                                cleanup();

                                                reject(
                                                    new Error(
                                                        "Could not find image box."
                                                    )
                                                );

                                                return;
                                            }


                                            // ========================================
                                            // Save Image Data
                                            // ========================================

                                            const imageData = {

                                                source:
                                                    source,

                                                crop: {

                                                    x:
                                                        cropData.x,

                                                    y:
                                                        cropData.y,

                                                    width:
                                                        cropData.width,

                                                    height:
                                                        cropData.height
                                                },

                                                x:
                                                    0,

                                                y:
                                                    0,

                                                zoom:
                                                    1
                                            };


                                            appState.savedImages[
                                                boxIndex
                                            ] =
                                                imageData;


                                            // ========================================
                                            // Display Image
                                            // ========================================

                                            renderImage(
                                                div,
                                                imageData
                                            );


                                            // ========================================
                                            // Cleanup
                                            // ========================================

                                            cleanup();

                                            resolve();
                                        }
                                    }
                                );


                            function cleanup() {

                                if (
                                    tempCropper
                                ) {

                                    tempCropper.destroy();

                                    tempCropper =
                                        null;
                                }

                                container.remove();
                            }
                        };


                    image.onerror =
                        () => {

                            reject(
                                new Error(
                                    "Could not load image."
                                )
                            );
                        };


                    image.src =
                        source;
                };


            reader.onerror =
                () => {

                    reject(
                        new Error(
                            "Could not read image file."
                        )
                    );
                };


            reader.readAsDataURL(
                file
            );
        }
    );
}