import { appState } from "./state.js";

const GIF_SCRIPT_URL = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
const GIF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js";
const FRAME_DELAY_MS = 100;
const FRAME_COUNT = 24;

let gifLibraryPromise;
let gifWorkerUrl;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-gif-encoder="true"]');
        if (window.GIF) {
            resolve();
            return;
        }
        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", () => reject(new Error("Could not load the GIF encoder.")), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.dataset.gifEncoder = "true";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Could not load the GIF encoder. Check your connection and retry."));
        document.head.appendChild(script);
    });
}

async function loadGifLibrary() {
    if (!gifLibraryPromise) {
        gifLibraryPromise = (async () => {
            await loadScript(GIF_SCRIPT_URL);
            const response = await fetch(GIF_WORKER_URL, { mode: "cors" });
            if (!response.ok) throw new Error("Could not load the GIF encoder worker.");
            const workerSource = await response.text();
            gifWorkerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
        })().catch(error => {
            gifLibraryPromise = null;
            throw error;
        });
    }

    await gifLibraryPromise;
    return window.GIF;
}

function drawBoardFrame(ctx, board, boxes, state, boardRect) {
    const width = boardRect.width;
    const height = boardRect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(board).backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const borderSize = Number(state.borderSize) || 0;
    const borderColor = state.borderColor || "#9ca3af";
    const bordersEnabled = state.borderEnabled !== false;

    boxes.forEach((box, index) => {
        const rect = box.getBoundingClientRect();
        const x = rect.left - boardRect.left;
        const y = rect.top - boardRect.top;
        const w = rect.width;
        const h = rect.height;
        const img = box.querySelector("img");
        const hasImage = Boolean(img);
        const drawBorder = borderSize > 0 && (!hasImage || bordersEnabled);

        if (img?.complete && img.naturalWidth && img.naturalHeight) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();

            const imageData = state.savedImages[index] || {};
            ctx.filter = [
                `brightness(${imageData.brightness ?? 100}%)`,
                `contrast(${imageData.contrast ?? 100}%)`,
                `saturate(${imageData.saturation ?? 100}%)`,
                `blur(${imageData.blur ?? 0}px)`,
                `grayscale(${imageData.grayscale ?? 0}%)`,
                `sepia(${imageData.sepia ?? 0}%)`,
                `hue-rotate(${imageData.hueRotate ?? 0}deg)`
            ].join(" ");

            const ratio = img.naturalWidth / img.naturalHeight;
            const boxRatio = w / h;
            let drawW = w;
            let drawH = h;

            if (ratio > boxRatio) {
                drawW = h * ratio;
            } else {
                drawH = w / ratio;
            }

            ctx.drawImage(img, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
            ctx.restore();
        }

        if (drawBorder) {
            ctx.save();
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderSize;
            ctx.strokeRect(x + borderSize / 2, y + borderSize / 2, w - borderSize, h - borderSize);
            ctx.restore();
        }
    });
}

export async function downloadAnimatedGifBoard(board, state = appState) {
    const boxes = Array.from(board.querySelectorAll(".image"));
    if (!boxes.length || !state.savedImages?.some(image => image?.animatedGif)) {
        return;
    }

    const boardRect = board.getBoundingClientRect();
    const width = Math.max(1, Math.round(boardRect.width));
    const height = Math.max(1, Math.round(boardRect.height));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Unable to create the GIF export canvas.");

    const GIF = await loadGifLibrary();
    const encoder = new GIF({
        workers: 2,
        quality: 12,
        width,
        height,
        repeat: 0,
        workerScript: gifWorkerUrl
    });

    const status = document.getElementById("downloadGifButton");
    const originalText = status?.textContent;
    if (status) {
        status.disabled = true;
        status.textContent = "Creating GIF…";
    }

    try {
        for (let frame = 0; frame < FRAME_COUNT; frame++) {
            drawBoardFrame(ctx, board, boxes, state, boardRect);
            encoder.addFrame(ctx, { copy: true, delay: FRAME_DELAY_MS });
            await wait(FRAME_DELAY_MS);
        }

        const blob = await new Promise((resolve, reject) => {
            encoder.on("finished", resolve);
            encoder.on("abort", () => reject(new Error("GIF export was cancelled.")));
            encoder.on("error", reject);
            encoder.render();
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "grid-board.gif";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally {
        if (status) {
            status.disabled = false;
            status.textContent = originalText || "GIF";
        }
    }
}

export function installGifDownloadOption(board, state = appState) {
    const menu = document.getElementById("downloadMenu");
    if (!menu || !board) return;

    let button = document.getElementById("downloadGifButton");
    if (!button) {
        button = document.createElement("button");
        button.id = "downloadGifButton";
        button.type = "button";
        button.dataset.format = "gif";
        button.textContent = "GIF";
        button.hidden = true;
        menu.appendChild(button);
    }

    const updateVisibility = () => {
        const hasAnimatedGif = Boolean(
            state.savedImages?.some(image => image?.animatedGif === true)
        );
        button.hidden = !hasAnimatedGif;
        button.style.display = hasAnimatedGif ? "" : "none";
    };

    const observer = new MutationObserver(updateVisibility);
    observer.observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    window.addEventListener("pageshow", updateVisibility);
    window.addEventListener("animated-gif-added", updateVisibility);
    updateVisibility();
}
