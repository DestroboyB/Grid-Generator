import { appState } from "./state.js";
import { generateBoard } from "./board.js";
import { initializeHistory } from "./history.js";
import { createGrid, saveCurrentGrid } from "./storage/grids.js";

const openButton = document.getElementById("rebuildFromScreenshotButton");
const modal = document.getElementById("screenshotReconstructionModal");
const closeButton = document.getElementById("screenshotReconstructionCloseButton");
const cancelButton = document.getElementById("screenshotReconstructionCancelButton");
const fileInput = document.getElementById("screenshotReconstructionFile");
const image = document.getElementById("screenshotReconstructionImage");
const preview = document.getElementById("screenshotReconstructionPreview");
const rowsInput = document.getElementById("screenshotRows");
const columnsInput = document.getElementById("screenshotColumns");
const status = document.getElementById("screenshotReconstructionStatus");
const createButton = document.getElementById("screenshotReconstructionCreateButton");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_CROP_PIXELS = 40_000_000;
const SUPPORTED_RATIOS = ["1:1", "4:3", "3:2", "16:9", "3:4", "2:3", "9:16"];

let cropper = null;
let imageObjectUrl = null;
let isCreating = false;

function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
}

function openModal() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    fileInput.value = "";
    rowsInput.value = "3";
    columnsInput.value = "3";
    preview.hidden = true;
    createButton.disabled = true;
    setStatus("Choose a screenshot, then crop to the grid you want to rebuild.");
    fileInput.focus();
}

function closeModal() {
    if (isCreating) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    destroyCropper();
    image.removeAttribute("src");
    preview.hidden = true;
    fileInput.value = "";
}

function destroyCropper() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
        imageObjectUrl = null;
    }
}

function closestSupportedRatio(width, height, rows, columns) {
    const tileRatio = (width / columns) / (height / rows);
    return SUPPORTED_RATIOS.reduce((best, ratio) => {
        const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
        const distance = Math.abs(Math.log(tileRatio / (ratioWidth / ratioHeight)));
        return distance < best.distance ? { ratio, distance } : best;
    }, { ratio: SUPPORTED_RATIOS[0], distance: Infinity }).ratio;
}

function loadScreenshot(file) {
    destroyCropper();
    createButton.disabled = true;

    if (!file) {
        preview.hidden = true;
        setStatus("Choose a screenshot, then crop to the grid you want to rebuild.");
        return;
    }

    if (!file.type.startsWith("image/")) {
        setStatus("Please choose a valid image file.", true);
        fileInput.value = "";
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        setStatus("That image is larger than 20 MB. Please choose a smaller screenshot.", true);
        fileInput.value = "";
        return;
    }

    imageObjectUrl = URL.createObjectURL(file);
    image.onload = () => {
        preview.hidden = false;
        if (typeof Cropper !== "function") {
            setStatus("The image cropper could not load. Check your connection and try again.", true);
            return;
        }

        cropper = new Cropper(image, {
            viewMode: 1,
            dragMode: "crop",
            autoCropArea: 0.9,
            responsive: true,
            background: false,
            movable: true,
            zoomable: true,
            ready() {
                createButton.disabled = false;
                setStatus("Drag the crop edges to include only the grid. Set its row and column count below.");
            }
        });
    };
    image.onerror = () => {
        destroyCropper();
        preview.hidden = true;
        setStatus("This image could not be opened. Please choose a PNG, JPEG, or WebP screenshot.", true);
    };
    image.src = imageObjectUrl;
}

async function createGridFromScreenshot() {
    if (!cropper || isCreating) return;

    const rows = Number(rowsInput.value);
    const columns = Number(columnsInput.value);
    if (!Number.isInteger(rows) || rows < 1 || rows > 10 ||
        !Number.isInteger(columns) || columns < 1 || columns > 10) {
        setStatus("Choose between 1 and 10 rows and columns.", true);
        return;
    }

    const crop = cropper.getData(true);
    if (!Number.isFinite(crop.width) || !Number.isFinite(crop.height) ||
        crop.width < columns || crop.height < rows) {
        setStatus("The selected crop is too small for that number of rows and columns.", true);
        return;
    }

    if (crop.width * crop.height > MAX_CROP_PIXELS) {
        setStatus("The selected area is too large to process safely. Crop a smaller area and try again.", true);
        return;
    }

    isCreating = true;
    createButton.disabled = true;
    cancelButton.disabled = true;
    closeButton.disabled = true;
    setStatus("Extracting tiles and creating your grid…");

    try {
        const croppedCanvas = cropper.getCroppedCanvas({
            width: Math.round(crop.width),
            height: Math.round(crop.height),
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high"
        });
        if (!croppedCanvas || !croppedCanvas.width || !croppedCanvas.height) {
            throw new Error("The selected area could not be cropped.");
        }

        const images = [];
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const left = Math.round(column * croppedCanvas.width / columns);
                const top = Math.round(row * croppedCanvas.height / rows);
                const right = Math.round((column + 1) * croppedCanvas.width / columns);
                const bottom = Math.round((row + 1) * croppedCanvas.height / rows);
                const tileCanvas = document.createElement("canvas");
                tileCanvas.width = Math.max(1, right - left);
                tileCanvas.height = Math.max(1, bottom - top);
                const context = tileCanvas.getContext("2d");
                if (!context) throw new Error("The browser could not process the screenshot.");
                context.drawImage(
                    croppedCanvas,
                    left, top, tileCanvas.width, tileCanvas.height,
                    0, 0, tileCanvas.width, tileCanvas.height
                );
                const source = tileCanvas.toDataURL("image/png");
                images.push({
                    source,
                    originalSource: source,
                    crop: { x: 0, y: 0, width: tileCanvas.width, height: tileCanvas.height },
                    x: 0,
                    y: 0,
                    zoom: 1
                });
            }
        }

        const ratio = closestSupportedRatio(
            croppedCanvas.width,
            croppedCanvas.height,
            rows,
            columns
        );
        const timestamp = new Date().toLocaleString();
        const grid = await createGrid({ name: `Screenshot Grid ${timestamp}` });

        appState.savedImages = images;
        appState.spacing = 0;
        appState.backgroundColor = "#ffffff";
        appState.borderEnabled = true;
        appState.borderSize = 2;
        appState.borderColor = "#9ca3af";
        appState.undoStack = [];
        appState.redoStack = [];

        document.getElementById("rows").value = String(rows);
        document.getElementById("columns").value = String(columns);
        document.getElementById("imageRatio").value = ratio;
        document.getElementById("spacing").value = "0";
        document.getElementById("spacingValue").textContent = "0 px";
        document.getElementById("backgroundColor").value = "#ffffff";
        document.getElementById("borderEnabled").checked = true;
        document.getElementById("borderSize").value = "2";
        document.getElementById("borderSizeValue").textContent = "2 px";
        document.getElementById("borderColor").value = "#9ca3af";

        initializeHistory();
        generateBoard();
        const saved = await saveCurrentGrid();
        if (!saved) {
            throw new Error("The new grid could not be saved. Check available browser storage.");
        }

        const currentGridName = document.getElementById("currentGridName");
        if (currentGridName) currentGridName.textContent = grid.name;

        closeModalAfterSuccess();
        setStatus("");
    } catch (error) {
        console.error("Failed to reconstruct screenshot grid:", error);
        setStatus(error?.message || "The screenshot could not be turned into a grid.", true);
    } finally {
        isCreating = false;
        createButton.disabled = false;
        cancelButton.disabled = false;
        closeButton.disabled = false;
    }
}

function closeModalAfterSuccess() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    destroyCropper();
    image.removeAttribute("src");
    preview.hidden = true;
    fileInput.value = "";
}

openButton?.addEventListener("click", openModal);
closeButton?.addEventListener("click", closeModal);
cancelButton?.addEventListener("click", closeModal);
fileInput?.addEventListener("change", () => loadScreenshot(fileInput.files?.[0]));
createButton?.addEventListener("click", createGridFromScreenshot);

modal?.addEventListener("click", event => {
    if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal?.classList.contains("open")) {
        closeModal();
    }
});
