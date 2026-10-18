import {
    applyGridData,
    createEmptyGridData,
    getAllGrids,
    getGrid,
    saveGrid
} from "./storage/grids.js";
import { generateBoard } from "./board.js";
import { appState } from "./state.js";

const PROJECT_FORMAT = "grid-generator-project";
const PROJECT_VERSION = 1;
const RATIOS = new Set(["1:1", "4:3", "3:2", "16:9", "3:4", "2:3", "9:16"]);
const MAX_PROJECT_FILE_BYTES = 50 * 1024 * 1024;

function validateProject(project) {
    if (!project || project.format !== PROJECT_FORMAT || project.version !== PROJECT_VERSION || !project.grid || typeof project.grid !== "object") {
        throw new Error("This file is not a supported Grid Generator project.");
    }

    const grid = project.grid;
    const rows = Number(grid.rows);
    const columns = Number(grid.columns);
    if (!Number.isInteger(rows) || rows < 1 || rows > 10 ||
        !Number.isInteger(columns) || columns < 1 || columns > 10) {
        throw new Error("The project has invalid grid dimensions.");
    }
    if (!RATIOS.has(grid.ratio)) {
        throw new Error("The project has an unsupported image ratio.");
    }
    if (!Array.isArray(grid.images) || grid.images.length > rows * columns) {
        throw new Error("The project has invalid image data.");
    }
    for (const image of grid.images) {
        if (image === null) continue;
        if (typeof image === "string") {
            if (!image.startsWith("data:image/")) throw new Error("The project contains an invalid image.");
            continue;
        }
        if (!image || typeof image !== "object" ||
            (typeof image.source !== "string" || !image.source.startsWith("data:image/"))) {
            throw new Error("The project contains an invalid image.");
        }
    }
    if (grid.backgroundColor !== undefined &&
        (typeof grid.backgroundColor !== "string" || !/^#[0-9a-f]{6}$/i.test(grid.backgroundColor))) {
        throw new Error("The project has an invalid background color.");
    }
    if (grid.borderColor !== undefined &&
        (typeof grid.borderColor !== "string" || !/^#[0-9a-f]{6}$/i.test(grid.borderColor))) {
        throw new Error("The project has an invalid border color.");
    }
    if (grid.spacing !== undefined && (!Number.isFinite(grid.spacing) || grid.spacing < 0 || grid.spacing > 50)) {
        throw new Error("The project has invalid spacing.");
    }
    if (grid.borderSize !== undefined && (!Number.isFinite(grid.borderSize) || grid.borderSize < 0 || grid.borderSize > 10)) {
        throw new Error("The project has an invalid border size.");
    }
    return grid;
}

function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(name) {
    return String(name || "grid-project")
        .trim()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "grid-project";
}

async function exportCurrentProject() {
    // Export the live editor state, not a possibly stale IndexedDB snapshot.
    // Some settings and layout changes are saved asynchronously, and empty
    // boards intentionally keep savedImages sparse.
    const stored = appState.currentGridId
        ? await getGrid(appState.currentGridId)
        : null;
    const rows = Number(document.getElementById("rows")?.value ?? 3);
    const columns = Number(document.getElementById("columns")?.value ?? 3);
    const grid = {
        ...(stored || {}),
        name: appState.currentGridName || stored?.name || "Untitled Grid",
        rows,
        columns,
        ratio: document.getElementById("imageRatio")?.value ?? stored?.ratio ?? "1:1",
        spacing: appState.spacing,
        backgroundColor: appState.backgroundColor,
        borderEnabled: appState.borderEnabled,
        borderSize: appState.borderSize,
        borderColor: appState.borderColor,
        images: Array.from({ length: rows * columns }, (_, index) =>
            appState.savedImages[index] == null ? null : structuredClone(appState.savedImages[index])
        ),
        undoStack: structuredClone(appState.undoStack),
        redoStack: structuredClone(appState.redoStack)
    };
    downloadJson({
        format: PROJECT_FORMAT,
        version: PROJECT_VERSION,
        exportedAt: new Date().toISOString(),
        grid
    }, safeFilename(grid.name) + ".gridproject");
}

async function importProjectFile(file) {
    if (!file) return;
    if (file.size > MAX_PROJECT_FILE_BYTES) {
        throw new Error("Project files must be 50 MB or smaller.");
    }
    const project = JSON.parse(await file.text());
    const source = validateProject(project);
    const existing = await getAllGrids();
    const baseName = String(source.name || "Imported Grid").trim().slice(0, 100) || "Imported Grid";
    let name = baseName;
    let suffix = 2;
    const used = new Set(existing.map(grid => String(grid.name || "").trim().toLowerCase()));
    while (used.has(name.toLowerCase())) {
        name = `${baseName.slice(0, Math.max(1, 94 - String(suffix).length))} (${suffix++})`;
    }

    // Create a separate grid. The active project is untouched until the file
    // has been parsed and fully validated.
    const grid = createEmptyGridData();
    Object.assign(grid, {
        name,
        categoryId: null,
        categoryIds: [],
        rows: Number(source.rows),
        columns: Number(source.columns),
        ratio: source.ratio,
        spacing: source.spacing ?? 0,
        backgroundColor: source.backgroundColor ?? "#ffffff",
        borderEnabled: source.borderEnabled ?? true,
        borderSize: source.borderSize ?? 2,
        borderColor: source.borderColor ?? "#9ca3af",
        images: structuredClone(source.images),
        undoStack: Array.isArray(source.undoStack) ? structuredClone(source.undoStack) : [],
        redoStack: Array.isArray(source.redoStack) ? structuredClone(source.redoStack) : []
    });
    grid.images.length = grid.rows * grid.columns;
    await saveGrid(grid);
    applyGridData(grid);
    generateBoard();
    document.dispatchEvent(new CustomEvent("grid-generator:grid-imported", { detail: { gridId: grid.id } }));
}

export function initializeProjectFileControls() {
    const exportButton = document.getElementById("exportProjectButton");
    const importButton = document.getElementById("importProjectButton");
    if (!exportButton || !importButton) return;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".gridproject,.json,application/json";
    fileInput.hidden = true;
    fileInput.id = "projectFileInput";
    document.body.appendChild(fileInput);

    exportButton.addEventListener("click", async () => {
        try {
            await exportCurrentProject();
        } catch (error) {
            console.error("Project export failed:", error);
            alert("Couldn't export this project. Please try again.");
        }
    });

    importButton.addEventListener("click", () => {
        fileInput.value = "";
        fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
            await importProjectFile(file);
            alert("Project imported successfully.");
        } catch (error) {
            console.error("Project import failed:", error);
            alert(error instanceof SyntaxError
                ? "This project file isn't valid JSON."
                : (error?.message || "Couldn't import this project file."));
        }
    });
}
