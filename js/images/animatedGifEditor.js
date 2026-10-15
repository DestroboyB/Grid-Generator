import { importAnimatedGif } from "./animatedGif.js";

let animatedGifSource = null;
let animatedGifTarget = null;
let animatedGifButton = null;

function getAnimatedGifButton() {
    if (animatedGifButton) return animatedGifButton;

    const footer = document.querySelector("#cropModal .editor-footer");
    if (!footer) return null;

    animatedGifButton = document.createElement("button");
    animatedGifButton.id = "useAnimatedGifButton";
    animatedGifButton.type = "button";
    animatedGifButton.textContent = "Keep Animation";
    animatedGifButton.title = "Add the original GIF without flattening its animation";
    animatedGifButton.hidden = true;
    animatedGifButton.addEventListener("click", async () => {
        if (!animatedGifSource || !animatedGifTarget) return;

        animatedGifButton.disabled = true;
        animatedGifButton.textContent = "Adding GIF…";

        try {
            await importAnimatedGif(animatedGifSource, animatedGifTarget);
            document.getElementById("cancelButton")?.click();
        } catch (error) {
            console.error("Unable to preserve animated GIF:", error);
            alert(error.message || "Unable to add this animated GIF.");
        } finally {
            animatedGifButton.disabled = false;
            animatedGifButton.textContent = "Keep Animation";
            hideAnimatedGifOption();
        }
    });

    const applyButton = footer.querySelector("#cropButton");
    footer.insertBefore(animatedGifButton, applyButton || null);
    return animatedGifButton;
}

export function showAnimatedGifOption(source, target) {
    animatedGifSource = source;
    animatedGifTarget = target;

    const button = getAnimatedGifButton();
    if (button) button.hidden = false;
}

export function hideAnimatedGifOption() {
    animatedGifSource = null;
    animatedGifTarget = null;

    const button = getAnimatedGifButton();
    if (button) button.hidden = true;
}
