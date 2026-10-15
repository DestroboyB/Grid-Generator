import { appState } from "../state.js";
import { saveHistoryState } from "../history.js";
import { saveBoard } from "../storage/grids.js";
import { renderImage } from "../board.js";

const board = document.getElementById("board");

function readBlobAsDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Unable to read the GIF image."));
        reader.readAsDataURL(blob);
    });
}

function findBoxIndex(element) {
    if (element?.dataset?.index !== undefined) {
        const index = Number(element.dataset.index);
        if (Number.isInteger(index) && index >= 0 && index < board.children.length) {
            return index;
        }
    }

    return -1;
}

/**
 * Store an animated GIF as its original GIF data URL instead of sending it
 * through CropperJS/canvas, which would flatten it to a single frame.
 * Opening the GIF in the editor later can still create a normal static edit.
 */
export async function importAnimatedGif(source, element) {
    const boxIndex = findBoxIndex(element);

    if (boxIndex < 0) {
        throw new Error("Could not find the selected image box.");
    }

    let blob;

    if (source instanceof Blob) {
        blob = source;
    } else {
        const response = await fetch(source, { mode: "cors" });
        if (!response.ok) {
            throw new Error(`The GIF could not be downloaded (HTTP ${response.status}).`);
        }
        blob = await response.blob();
    }

    if (blob.type && blob.type !== "image/gif") {
        throw new Error("The selected file is not a GIF image.");
    }

    const dataURL = await readBlobAsDataURL(blob);

    if (typeof dataURL !== "string" || !dataURL.startsWith("data:image/gif")) {
        throw new Error("The GIF could not be saved in an animated format.");
    }

    appState.savedImages[boxIndex] = {
        source: dataURL,
        originalSource: dataURL,
        animatedGif: true,
        crop: null,
        rotation: 0,
        flipX: false,
        flipY: false,
        filterName: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        x: 0,
        y: 0,
        zoom: 1
    };

    saveHistoryState();
    await saveBoard();
    renderImage(element, appState.savedImages[boxIndex]);
    window.dispatchEvent(new CustomEvent("animated-gif-added"));
}
