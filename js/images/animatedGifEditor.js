import { importAnimatedGif } from "./animatedGif.js";

let animatedGifSource = null;
let animatedGifTarget = null;
let toggle = null;
let previewObserver = null;
let lastFrozenFrame = null;

function getCropperImage() {
    return document.querySelector("#cropModal .cropper-canvas img");
}

function setCropperImageSource(source) {
    const cropperImage = getCropperImage();
    if (!cropperImage || !source) return false;

    if (cropperImage.dataset.gifSource !== source || cropperImage.src !== source) {
        cropperImage.dataset.gifSource = source;
        cropperImage.src = source;
    }
    return true;
}

function freezeCurrentFrame() {
    const cropperImage = getCropperImage();
    if (!cropperImage?.complete || !cropperImage.naturalWidth || !cropperImage.naturalHeight) {
        return;
    }

    try {
        const canvas = document.createElement("canvas");
        canvas.width = cropperImage.naturalWidth;
        canvas.height = cropperImage.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) return;

        // Drawing an animated HTMLImageElement captures the frame currently
        // being displayed. Replacing Cropper's image with this snapshot keeps
        // the crop box and transforms intact while ensuring Apply saves it.
        context.drawImage(cropperImage, 0, 0, canvas.width, canvas.height);
        lastFrozenFrame = canvas.toDataURL("image/png");
        cropperImage.dataset.gifSource = "";
        cropperImage.src = lastFrozenFrame;
    } catch (error) {
        console.error("Unable to freeze the current GIF frame:", error);
    }
}

function applyPreviewMode() {
    const editorPreview = document.querySelector("#cropModal .editor-preview");
    if (!editorPreview || !toggle) return;

    // Keep Cropper's actual image and controls visible in both modes.
    // Its image element itself is switched between the animated source and
    // a still-frame snapshot, so crop/rotate/adjust tools remain functional.
    editorPreview.style.position = "";

    if (toggle.checked && animatedGifSource) {
        setCropperImageSource(animatedGifSource);
    }
}

function handleToggleChange() {
    if (toggle?.checked) {
        lastFrozenFrame = null;
        setCropperImageSource(animatedGifSource);
    } else {
        freezeCurrentFrame();
    }
    applyPreviewMode();
}

function getControls() {
    if (toggle) return { toggle };

    const footer = document.querySelector("#cropModal .editor-footer");
    const editorPreview = document.querySelector("#cropModal .editor-preview");
    if (!footer || !editorPreview) return {};

    const label = document.createElement("label");
    label.id = "animatedGifToggleLabel";
    Object.assign(label.style, {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        cursor: "pointer",
        marginRight: "12px"
    });
    label.title = "Keep the original GIF animation, or turn it off to edit and save a single frame.";

    toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "animatedGifToggle";
    toggle.addEventListener("change", handleToggleChange);

    const text = document.createElement("span");
    text.textContent = "Keep animation";
    label.append(toggle, text);

    const applyButton = footer.querySelector("#cropButton");
    footer.insertBefore(label, applyButton || null);

    if (!previewObserver) {
        previewObserver = new MutationObserver(applyPreviewMode);
        previewObserver.observe(editorPreview, { childList: true, subtree: true });
    }

    return { toggle };
}

export function showAnimatedGifOption(source, target, enabled = true) {
    animatedGifSource = source;
    animatedGifTarget = target;

    const controls = getControls();
    if (!controls.toggle) return;

    controls.toggle.closest("label").hidden = false;
    controls.toggle.checked = Boolean(enabled);
    lastFrozenFrame = null;
    applyPreviewMode();
}

export function hideAnimatedGifOption() {
    animatedGifSource = null;
    animatedGifTarget = null;
    lastFrozenFrame = null;

    if (toggle) {
        toggle.checked = false;
        toggle.closest("label").hidden = true;
    }
}

export function isAnimatedGifMode() {
    return Boolean(toggle?.checked && animatedGifSource && animatedGifTarget);
}

export function getAnimatedGifSource() {
    return animatedGifSource;
}

export function getFrozenGifFrame() {
    return lastFrozenFrame;
}

export async function applyAnimatedGifMode() {
    if (!isAnimatedGifMode()) return false;

    await importAnimatedGif(animatedGifSource, animatedGifTarget);
    return true;
}
