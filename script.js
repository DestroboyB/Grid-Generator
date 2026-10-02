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
// Save board to localStorage
// ========================================

function saveBoard() {

    const boardData = {
        rows: rowsInput.value,
        columns: columnsInput.value,
        ratio: imageRatioInput.value,
        images: savedImages
    };

    localStorage.setItem(
        "gridBoardData",
        JSON.stringify(boardData)
    );
}


// ========================================
// Load board from localStorage
// ========================================

function loadBoard() {

    const savedData =
        localStorage.getItem("gridBoardData");

    if (!savedData) {
        return false;
    }

    try {

        const boardData =
            JSON.parse(savedData);

        rowsInput.value =
            boardData.rows;

        columnsInput.value =
            boardData.columns;

        imageRatioInput.value =
            boardData.ratio;

        savedImages =
            boardData.images || [];

        return true;

    } catch (error) {

        console.error(
            "Could not load saved board:",
            error
        );

        return false;
    }
}

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

    // Remove images that no longer fit
    if (savedImages.length > totalBoxes) {
        savedImages.length = totalBoxes;
    }


    // ========================================
    // Board limits
    // ========================================

    const maxBoardWidth = Math.min(
        window.innerWidth * 0.90,
        1200
    );

    const maxBoardHeight =
        window.innerHeight * 0.80;

    const boardPadding = 20;

    // Maximum gap as a percentage of box width
    const gapRatio = 0.03;


    // ========================================
    // Calculate available width
    // ========================================

    const availableWidth =
        maxBoardWidth - (boardPadding * 2);


    // ========================================
    // Start by fitting to width
    // ========================================

    let gap =
        (availableWidth / columns) * gapRatio;

    let boxWidth =
        (
            availableWidth -
            (gap * (columns - 1))
        ) / columns;

    let boxHeight =
        boxWidth / boxRatio;


    // ========================================
    // Check if height is too large
    // ========================================

    const availableHeight =
        maxBoardHeight - (boardPadding * 2);

    let requiredHeight =
        (boxHeight * rows) +
        (gap * (rows - 1));


    if (requiredHeight > availableHeight) {

        // Calculate height-based box size
        boxHeight =
            (
                availableHeight -
                (gap * (rows - 1))
            ) / rows;

        boxWidth =
            boxHeight * boxRatio;


        // Recalculate gap based on new width
        gap =
            boxWidth * gapRatio;


        // Make sure width still fits
        const totalWidth =
            (boxWidth * columns) +
            (gap * (columns - 1));


        if (totalWidth > availableWidth) {

            // Width is now the limiting factor
            gap =
                (availableWidth / columns) * gapRatio;

            boxWidth =
                (
                    availableWidth -
                    (gap * (columns - 1))
                ) / columns;

            boxHeight =
                boxWidth / boxRatio;
        }
    }


    // ========================================
    // Final safety calculation
    // ========================================

    const finalWidth =
        (boxWidth * columns) +
        (gap * (columns - 1));

    const finalHeight =
        (boxHeight * rows) +
        (gap * (rows - 1));


    // ========================================
    // Board size
    // ========================================

    const boardWidth =
        finalWidth + (boardPadding * 2);

    const boardHeight =
        finalHeight + (boardPadding * 2);


    board.style.width =
        `${boardWidth}px`;

    board.style.height =
        `${boardHeight}px`;


    // ========================================
    // Grid
    // ========================================

    board.style.gridTemplateColumns =
        `repeat(${columns}, ${boxWidth}px)`;

    board.style.gridTemplateRows =
        `repeat(${rows}, ${boxHeight}px)`;

    board.style.gap =
        `${gap}px`;


    // ========================================
    // Create boxes
    // ========================================

    board.innerHTML = "";

    for (let i = 0; i < totalBoxes; i++) {

        const div =
            document.createElement("div");

        div.classList.add("image");

        div.textContent = i + 1;

        setupDragAndDrop(div);

        // Restore image
        if (savedImages[i]) {

            div.innerHTML = "";

            const img =
                document.createElement("img");

            img.src =
                savedImages[i];

            div.appendChild(img);
        }


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


                       // Find box index
const boxIndex =
    Array.from(board.children)
        .indexOf(div);


// Save image
savedImages[boxIndex] =
    croppedURL;

    saveBoard();

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

    const fileInput =
        document.createElement("input");

    fileInput.type = "file";

    fileInput.accept =
        "image/jpeg, image/png, image/webp";

    fileInput.addEventListener("change", () => {

        const file =
            fileInput.files[0];

        if (!file) {
            return;
        }

        openCropForFile(file, element);

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

    saveBoard();

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

// ========================================
// Crop button
// ========================================

cropButton.addEventListener("click", () => {

    if (!cropper || !selectedDiv) {
        return;
    }

    const canvas = cropper.getCroppedCanvas({
        width: 500,
        height: 500
    });

    const imageURL =
        canvas.toDataURL("image/png");

    // Find which box this is
    const boxIndex =
        Array.from(board.children)
            .indexOf(selectedDiv);

    // Save the image so it survives board regeneration
    savedImages[boxIndex] =
        imageURL;

    saveBoard();

    // Display the image
    selectedDiv.innerHTML = "";

    const img =
        document.createElement("img");

    img.src = imageURL;

    selectedDiv.appendChild(img);

    // Close modal
    cropModal.style.display = "none";

    // Destroy cropper
    cropper.destroy();

    cropper = null;

    selectedDiv = null;
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
// Load saved board or create default board
// ========================================

if (!loadBoard()) {

    generateBoard();

    saveBoard();

} else {

    generateBoard();

}


// ========================================
// Generate new board when button clicked
// ========================================

generateButton.addEventListener("click", () => {

    generateBoard();

    saveBoard();

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

// ========================================
// Drag and drop image
// ========================================

function setupDragAndDrop(div) {

    div.addEventListener("dragover", (event) => {

        event.preventDefault();

        // Only allow image files
        if (
            event.dataTransfer.types.includes("Files") ||
            event.dataTransfer.types.includes("text/uri-list")
        ) {
            div.classList.add("drag-over");
        }
    });


    div.addEventListener("dragleave", () => {

        div.classList.remove("drag-over");

    });


    div.addEventListener("drop", (event) => {

        event.preventDefault();

        div.classList.remove("drag-over");

        const files =
            Array.from(event.dataTransfer.files);

        // Dropped actual image file
        if (files.length > 0) {

            const imageFile =
                files.find(file =>
                    file.type.startsWith("image/")
                );

            if (imageFile) {
                openCropForFile(imageFile, div);
                return;
            }
        }


        // Image dragged from another browser tab/site
        const imageURL =
            event.dataTransfer.getData("text/uri-list");

        if (imageURL) {

            openCropForURL(imageURL, div);

        }
    });
}

function openCropForFile(file, element) {

    selectedDiv = element;

    const imageURL =
        URL.createObjectURL(file);

    cropImage.src = imageURL;

    cropModal.style.display = "flex";


    if (cropper) {
        cropper.destroy();
    }


    const [ratioWidth, ratioHeight] =
        imageRatioInput.value
            .split(":")
            .map(Number);

    const cropRatio =
        ratioWidth / ratioHeight;


    cropper = new Cropper(cropImage, {

        aspectRatio: cropRatio,

        viewMode: 1,

        autoCropArea: 1,

        responsive: true

    });
}

imageRatioInput.addEventListener("change", () => {

    generateBoard();

    saveBoard();

});