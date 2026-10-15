import { importAnimatedGif } from "./animatedGif.js";

let animatedGifSource = null;
let animatedGifTarget = null;
let toggle = null;
let preview = null;
let previewObjectURL = null;
let previewObserver = null;

function sourceForPreview(source) {
    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }

    if (source instanceof Blob) {
        previewObjectURL = URL.createObjectURL(source);
        return previewObjectURL;
    }

    return source || "";
}

function applyPreviewMode() {
    const editorPreview = document.querySelector("#cropModal .editor-preview");
    if (!editorPreview || !preview || !toggle) return;

    const animatedMode = toggle.checked;
    const cropperContainer = editorPreview.querySelector(".cropper-container");

    if (cropperContainer) {
        cropperContainer.style.visibility = animatedMode ? "hidden" : "";
        cropperContainer.style.pointerEvents = animatedMode ? "none" : "";
    }

    preview.hidden = !animatedMode;
    editorPreview.style.position = "relative";
}

function getControls() {
    if (toggle && preview) return { toggle, preview };

    const footer = document.querySelector("#cropModal .editor-footer");
    const editorPreview = document.querySelector("#cropModal .editor-preview");
    if (!footer || !editorPreview) return {};

    const label = document.createElement("label");
    label.id = "animatedGifToggleLabel";
    label.style.display = "inline-flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.cursor = "pointer";
    label.style.marginRight = "12px";
    label.title = "Switch between editing a still frame and keeping the original GIF animation.";

    toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "animatedGifToggle";
    toggle.addEventListener("change", applyPreviewMode);

    const text = document.createElement("span");
    text.textContent = "Keep animation";
    label.append(toggle, text);

    const applyButton = footer.querySelector("#cropButton");
    footer.insertBefore(label, applyButton || null);

    preview = document.createElement("img");
    preview.id = "animatedGifPreview";
    preview.alt = "Animated GIF preview";
    preview.hidden = true;
    Object.assign(preview.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        zIndex: "10",
        background: "var(--editor-preview-background, #111)"
    });
    editorPreview.appendChild(preview);

    if (!previewObserver) {
        previewObserver = new MutationObserver(applyPreviewMode);
        previewObserver.observe(editorPreview, { childList: true, subtree: true });
    }

    return { toggle, preview };
}

export function showAnimatedGifOption(source, target, enabled = false) {
    animatedGifSource = source;
    animatedGifTarget = target;

    const controls = getControls();
    if (!controls.toggle || !controls.preview) return;

    controls.toggle.closest("label").hidden = false;
    controls.toggle.checked = Boolean(enabled);
    controls.preview.src = sourceForPreview(source);
    applyPreviewMode();
}

export function hideAnimatedGifOption() {
    animatedGifSource = null;
    animatedGifTarget = null;

    if (toggle) {
        toggle.checked = false;
        toggle.closest("label").hidden = true;
    }

    if (preview) {
        preview.hidden = true;
        preview.removeAttribute("src");
    }

    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }

    applyPreviewMode();
}

export function isAnimatedGifMode() {
    return Boolean(toggle?.checked && animatedGifSource && animatedGifTarget);
}

export function getAnimatedGifSource() {
    return animatedGifSource;
}

export async function applyAnimatedGifMode() {
    if (!isAnimatedGifMode()) return false;

    await importAnimatedGif(animatedGifSource, animatedGifTarget);
    return true;
}
