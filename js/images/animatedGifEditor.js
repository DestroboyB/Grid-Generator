import { importAnimatedGif } from "./animatedGif.js";

let animatedGifSource = null;
let animatedGifTarget = null;
let toggle = null;
let preview = null;
let previewObserver = null;
let lastFrozenFrame = null;

function getCropperImage() {
    return document.querySelector("#cropModal .cropper-canvas img:not(#animatedGifPreview)");
}

function getCropperCanvas() {
    return document.querySelector("#cropModal .cropper-canvas");
}

function attachPreviewToCropper() {
    const canvas = getCropperCanvas();
    if (!canvas || !preview) return;

    if (preview.parentElement !== canvas) {
        canvas.appendChild(preview);
    }
}

function setPreviewSource(source) {
    if (!preview || !source) return;
    const crossOrigin = /^data:/i.test(source) ? null : "anonymous";
    if (preview.crossOrigin !== crossOrigin) preview.crossOrigin = crossOrigin;
    if (preview.src !== source) preview.src = source;
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
    const sourceImage = preview?.complete && preview.naturalWidth ? preview : getCropperImage();
    const cropperImage = getCropperImage();
    if (!sourceImage?.complete || !sourceImage.naturalWidth || !sourceImage.naturalHeight || !cropperImage) {
        return;
    }

    try {
        const canvas = document.createElement("canvas");
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) return;

        context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
        lastFrozenFrame = canvas.toDataURL("image/png");
        cropperImage.dataset.gifSource = "";
        cropperImage.src = lastFrozenFrame;
    } catch (error) {
        console.error("Unable to freeze the current GIF frame:", error);
    }
}

function applyPreviewMode() {
    const editorPreview = document.querySelector("#cropModal .editor-preview");
    const cropperCanvas = getCropperCanvas();
    const cropperImage = getCropperImage();
    if (!editorPreview || !toggle) return;

    // The animated image is a child of Cropper's moving/scaling canvas, so
    // it follows the same crop box and transformations. Cropper's image stays
    // present and its controls remain interactive in either mode.
    if (toggle.checked && animatedGifSource) {
        attachPreviewToCropper();
        setPreviewSource(animatedGifSource);
        if (cropperImage) {
            cropperImage.style.opacity = "0";
            cropperImage.style.pointerEvents = "none";
        }
        if (preview) {
            Object.assign(preview.style, {
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "fill",
                zIndex: "1",
                pointerEvents: "none"
            });
            preview.hidden = false;
        }
    } else {
        if (preview) preview.hidden = true;
        if (cropperImage) {
            cropperImage.style.opacity = "";
            cropperImage.style.pointerEvents = "";
        }
    }

    if (cropperCanvas) cropperCanvas.style.position = "absolute";
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
    if (toggle && preview) return { toggle, preview };

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

    preview = document.createElement("img");
    preview.id = "animatedGifPreview";
    preview.alt = "Animated GIF preview";
    preview.hidden = true;

    if (!previewObserver) {
        previewObserver = new MutationObserver(() => {
            attachPreviewToCropper();
            applyPreviewMode();
        });
        previewObserver.observe(editorPreview, { childList: true, subtree: true });
    }

    return { toggle, preview };
}

export function showAnimatedGifOption(source, target, enabled = true) {
    animatedGifSource = source;
    animatedGifTarget = target;

    const controls = getControls();
    if (!controls.toggle || !controls.preview) return;

    controls.toggle.closest("label").hidden = false;
    controls.toggle.checked = Boolean(enabled);
    lastFrozenFrame = null;
    if (source) setPreviewSource(source);
    setCropperImageSource(source);
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

    if (preview) preview.hidden = true;
    const cropperImage = getCropperImage();
    if (cropperImage) {
        cropperImage.style.opacity = "";
        cropperImage.style.pointerEvents = "";
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

export async function applyAnimatedGifMode(editState = {}) {
    if (!isAnimatedGifMode()) return false;

    await importAnimatedGif(animatedGifSource, animatedGifTarget, editState);
    return true;
}
