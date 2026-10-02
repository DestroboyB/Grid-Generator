const board = document.getElementById("board");

const rowsInput = document.getElementById("rows");
const columnsInput = document.getElementById("columns");
const generateButton = document.getElementById("generateBoard");
const bulkImportButton =
    document.getElementById("bulkImportButton");

const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const cropButton = document.getElementById("cropButton");
const cancelButton = document.getElementById("cancelButton");

const imageRatioInput = document.getElementById("imageRatio");

let cropper = null;
let selectedDiv = null;

const imageMenu = document.getElementById("imageMenu");
const replaceImageButton = document.getElementById("replaceImageButton");
const deleteImageButton = document.getElementById("deleteImageButton");
const closeMenuButton = document.getElementById("closeMenuButton");

let menuDiv = null;

let savedImages = [];

const downloadButton =
    document.getElementById("downloadButton");

const downloadMenu =
    document.getElementById("downloadMenu");

// ========================================
// Generate board
// ========================================
function generateBoard() {

    const rows = Number(rowsInput.value);
    const columns = Number(columnsInput.value);

    const [ratioWidth, ratioHeight] =
        imageRatioInput.value.split(":").map(Number);

    const boxRatio = ratioWidth / ratioHeight;

    const totalBoxes = rows * columns;


    // ========================================
    // Remove images that no longer fit
    // ========================================

    if (savedImages.length > totalBoxes) {
        savedImages.length = totalBoxes;
    }


    // ========================================
    // Available screen space
    // ========================================

    const maxBoardWidth = Math.min(
        window.innerWidth * 0.90,
        1200
    );

    const maxBoardHeight =
        window.innerHeight * 0.80;

    const boardPadding = 24;

    const gapRatio = 0.03;


    // ========================================
    // Calculate box size
    // ========================================

    let boxWidth =
        (maxBoardWidth - boardPadding) /
        columns;

    let boxHeight =
        boxWidth / boxRatio;

    let gap =
        boxWidth * gapRatio;


    const requiredHeight =
        (boxHeight * rows) +
        (gap * (rows - 1)) +
        boardPadding;


    // If too tall, scale based on height
    if (requiredHeight > maxBoardHeight) {

        boxHeight =
            (maxBoardHeight - boardPadding) /
            (rows + gapRatio * (rows - 1));

        boxWidth =
            boxHeight * boxRatio;

        gap =
            boxWidth * gapRatio;
    }


    // ========================================
    // Final board dimensions
    // ========================================

    const boardWidth =
        (boxWidth * columns) +
        (gap * (columns - 1)) +
        boardPadding;

    const boardHeight =
        (boxHeight * rows) +
        (gap * (rows - 1)) +
        boardPadding;


    board.style.width =
        `${boardWidth}px`;

    board.style.height =
        `${boardHeight}px`;

    board.style.gridTemplateColumns =
        `repeat(${columns}, ${boxWidth}px)`;

    board.style.gridTemplateRows =
        `repeat(${rows}, ${boxHeight}px)`;

    board.style.gap =
        `${gap}px`;


    // ========================================
    // Rebuild visual board
    // ========================================

    board.innerHTML = "";


    for (let i = 0; i < totalBoxes; i++) {

        const div =
            document.createElement("div");

        div.classList.add("image");

        div.textContent = i + 1;


        // ====================================
        // Restore saved image
        // ====================================

        if (savedImages[i]) {

            div.innerHTML = "";

            const img =
                document.createElement("img");

            img.src =
                savedImages[i];

            div.appendChild(img);
        }


        // ====================================
        // Click behavior
        // ====================================

        div.addEventListener("click", () => {

            if (div.querySelector("img")) {

                showImageMenu(div);

            } else {

                openFileSelector(div);
            }

        });


        board.appendChild(div);
    }
}

function bulkImport() {

    // Find all empty boxes
    const emptyBoxes = Array.from(
        board.querySelectorAll(".image")
    ).filter(div => !div.querySelector("img"));


    // Nothing available
    if (emptyBoxes.length === 0) {

        alert("There are no empty spaces available.");

        return;
    }


    // Create file picker
    const fileInput = document.createElement("input");

    fileInput.type = "file";

    fileInput.accept = "image/jpeg, image/png";

    fileInput.multiple = true;


    fileInput.addEventListener("change", async () => {

        const files = Array.from(fileInput.files);

        if (files.length === 0) {
            return;
        }


        // Only allow as many images as there are empty boxes
        const filesToImport =
            files.slice(0, emptyBoxes.length);


        // Import each image
        for (let i = 0; i < filesToImport.length; i++) {

            const file = filesToImport[i];

            const div = emptyBoxes[i];

            await importBulkImage(file, div);
        }

    });


    fileInput.click();
}

async function importBulkImage(file, div) {

    return new Promise((resolve) => {

        const imageURL =
            URL.createObjectURL(file);

        const image =
            new Image();

        image.onload = () => {

            // Get selected ratio
            const [ratioWidth, ratioHeight] =
                imageRatioInput.value
                    .split(":")
                    .map(Number);

            const cropRatio =
                ratioWidth / ratioHeight;


            // Create temporary image
            image.style.maxWidth = "none";
            image.style.maxHeight = "none";


            // Create temporary container
            const container =
                document.createElement("div");

            container.style.position = "fixed";
            container.style.left = "-10000px";
            container.style.top = "-10000px";
            container.style.width = "1000px";
            container.style.height = "1000px";

            document.body.appendChild(container);

            container.appendChild(image);


            // Create cropper
            const tempCropper =
                new Cropper(image, {

                    aspectRatio: cropRatio,

                    viewMode: 1,

                    autoCropArea: 1,

                    responsive: false,

                    ready() {

                        // Center crop automatically
                        tempCropper.setCropBoxData(
                            tempCropper.getCropBoxData()
                        );


                        // Get cropped image
                        const canvas =
                            tempCropper.getCroppedCanvas({

                                width: 500,
                                height: Math.round(
                                    500 / cropRatio
                                )

                            });


                        const croppedURL =
                            canvas.toDataURL("image/png");


                        // Put image into grid
                        div.innerHTML = "";

                        const img =
                            document.createElement("img");

                        img.src = croppedURL;

                        div.appendChild(img);


                        // Cleanup
                        tempCropper.destroy();

                        container.remove();

                        URL.revokeObjectURL(imageURL);

                        resolve();

                    }

                });

        };


        image.src = imageURL;

    });
}

// ========================================
// Open file selector
// ========================================

function openFileSelector(element) {

    selectedDiv = element;

    const boxIndex =
        Array.from(board.children)
            .indexOf(element);


    const fileInput =
        document.createElement("input");

    fileInput.type = "file";

    fileInput.accept =
        "image/jpeg, image/png";


    fileInput.addEventListener("change", () => {

        const file =
            fileInput.files[0];

        if (!file) {
            return;
        }


        const imageURL =
            URL.createObjectURL(file);


        // Save the ORIGINAL image
        savedImages[boxIndex] =
            imageURL;


        cropImage.src =
            imageURL;


        cropModal.style.display =
            "flex";


        if (cropper) {
            cropper.destroy();
        }


        const [ratioWidth, ratioHeight] =
            imageRatioInput.value
                .split(":")
                .map(Number);


        cropper =
            new Cropper(cropImage, {

                aspectRatio:
                    ratioWidth / ratioHeight,

                viewMode: 1,

                autoCropArea: 1,

                responsive: true

            });

    });


    fileInput.click();
}

function showImageMenu(element) {

    menuDiv = element;

    imageMenu.style.display = "flex";

    // Center menu on screen
    imageMenu.style.left = "50%";
    imageMenu.style.top = "50%";

    imageMenu.style.transform = "translate(-50%, -50%)";
}

replaceImageButton.addEventListener("click", () => {

    if (!menuDiv) {
        return;
    }

    const div = menuDiv;

    imageMenu.style.display = "none";

    menuDiv = null;

    openFileSelector(div);
});

deleteImageButton.addEventListener("click", () => {

    if (!menuDiv) {
        return;
    }


    const boxIndex =
        Array.from(board.children)
            .indexOf(menuDiv);


    // Delete saved image
    savedImages[boxIndex] =
        null;


    // Clear visual box
    menuDiv.innerHTML = "";

    menuDiv.textContent =
        boxIndex + 1;


    imageMenu.style.display =
        "none";


    menuDiv = null;
});

closeMenuButton.addEventListener("click", () => {

    imageMenu.style.display = "none";

    menuDiv = null;
});

// ========================================
// Crop button
// ========================================

cropButton.addEventListener("click", () => {

    if (!cropper) {
        return;
    }

    const canvas = cropper.getCroppedCanvas({
        width: 500,
        height: 500
    });

    const imageURL = canvas.toDataURL("image/png");

    selectedDiv.innerHTML = "";

    const img = document.createElement("img");

    img.src = imageURL;

    selectedDiv.appendChild(img);


    // Close modal
    cropModal.style.display = "none";


    // Destroy cropper
    cropper.destroy();

    cropper = null;
});


// ========================================
// Cancel button
// ========================================

cancelButton.addEventListener("click", () => {

    cropModal.style.display = "none";

    if (cropper) {

        cropper.destroy();

        cropper = null;
    }
});


// ========================================
// Generate default 3 x 3 board
// ========================================

generateBoard();


// ========================================
// Generate new board when button clicked
// ========================================

generateButton.addEventListener("click", () => {

    generateBoard();

});

bulkImportButton.addEventListener(
    "click",
    bulkImport
);

// ========================================
// Toggle download menu
// ========================================

downloadButton.addEventListener("click", (event) => {

    event.stopPropagation();

    const isOpen =
        downloadMenu.style.display === "flex";

    downloadMenu.style.display =
        isOpen ? "none" : "flex";
});


// ========================================
// Download selected format
// ========================================

downloadMenu.addEventListener("click", (event) => {

    const button =
        event.target.closest("button");

    if (!button) {
        return;
    }

    const format =
        button.dataset.format;

    downloadBoard(format);

    downloadMenu.style.display = "none";
});


// ========================================
// Close menu when clicking outside
// ========================================

document.addEventListener("click", (event) => {

    if (
        !downloadMenu.contains(event.target) &&
        !downloadButton.contains(event.target)
    ) {
        downloadMenu.style.display = "none";
    }

});


// ========================================
// Download board
// ========================================

async function downloadBoard(format) {

    const boxes = Array.from(
        board.querySelectorAll(".image")
    );

    if (boxes.length === 0) {
        return;
    }

    // Get the actual board dimensions
    const boardRect = board.getBoundingClientRect();

    const scale = 2;

    const canvas = document.createElement("canvas");

    canvas.width = Math.round(boardRect.width * scale);
    canvas.height = Math.round(boardRect.height * scale);

    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.scale(scale, scale);

    // Board position
    const boardLeft = boardRect.left;
    const boardTop = boardRect.top;

    for (const box of boxes) {

        const img = box.querySelector("img");

        const boxRect = box.getBoundingClientRect();

        const x =
            boxRect.left - boardLeft;

        const y =
            boxRect.top - boardTop;

        const width =
            boxRect.width;

        const height =
            boxRect.height;


        // Draw border
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;

        ctx.strokeRect(
            x,
            y,
            width,
            height
        );


        // No image in this box
        if (!img) {
            continue;
        }


        // ========================================
        // Match object-fit: cover
        // ========================================

        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;

        const imageRatio =
            imageWidth / imageHeight;

        const boxRatio =
            width / height;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = imageWidth;
        let sourceHeight = imageHeight;


        if (imageRatio > boxRatio) {

            // Image is wider than box
            sourceWidth =
                imageHeight * boxRatio;

            sourceX =
                (imageWidth - sourceWidth) / 2;

        } else {

            // Image is taller than box
            sourceHeight =
                imageWidth / boxRatio;

            sourceY =
                (imageHeight - sourceHeight) / 2;
        }


        // Draw image
        ctx.drawImage(
            img,

            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,

            x,
            y,
            width,
            height
        );
    }


    // ========================================
    // Convert canvas to requested format
    // ========================================

    let mimeType;
    let extension;

    switch (format) {

        case "png":
            mimeType = "image/png";
            extension = "png";
            break;

        case "jpg":
            mimeType = "image/jpeg";
            extension = "jpg";
            break;

        case "webp":
            mimeType = "image/webp";
            extension = "webp";
            break;

        default:
            return;
    }


    const image =
        canvas.toDataURL(
            mimeType,
            0.95
        );


    // ========================================
    // Download
    // ========================================

    const link =
        document.createElement("a");

    link.download =
        `grid-board.${extension}`;

    link.href = image;

    link.click();
}