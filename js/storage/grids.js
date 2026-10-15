
import {
    openDatabase,
    GRID_STORE
} from "./database.js";

import {
    generateId,
    cloneData
} from "./helpers.js";

import {
    appState
} from "../state.js";


// ========================================
// Create Grid Data
// ========================================

export function createGridData() {
    const rowsInput = document.getElementById("rows");
    const columnsInput = document.getElementById("columns");
    const ratioInput = document.getElementById("imageRatio");

    return {
        id: generateId("grid"),
        name: "Untitled Grid",
        categoryId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),

        rows: Number(rowsInput?.value ?? 3),
        columns: Number(columnsInput?.value ?? 3),
        ratio: ratioInput?.value ?? "1:1",

        spacing: appState.spacing,
        backgroundColor: appState.backgroundColor,
        borderEnabled: appState.borderEnabled,
        borderSize: appState.borderSize,
        borderColor: appState.borderColor,

        images: cloneData(appState.savedImages),
        undoStack: cloneData(appState.undoStack),
        redoStack: cloneData(appState.redoStack)
    };
}


// ========================================
// Create Empty Grid Data
// ========================================


export function createEmptyGridData() {
    return {
        id: generateId("grid"),
        name: "Untitled Grid",
        categoryId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),

        // Default grid layout
        rows: 3,
        columns: 3,
        ratio: "1:1",

        // Default appearance
        spacing: 0,
        backgroundColor: "#ffffff",
        borderEnabled: true,
        borderSize: 2,
        borderColor: "#9ca3af",

        // Start with no images or history
        images: [],
        undoStack: [],
        redoStack: []
    };
}



// ========================================
// Save Grid
// ========================================

export async function saveGrid(grid) {
    const db = await openDatabase();

    grid.updatedAt = Date.now();

    const transaction = db.transaction(
        GRID_STORE,
        "readwrite"
    );

    const store = transaction.objectStore(GRID_STORE);
    // IndexedDB structured-clones the value passed to put(); an extra deep clone
    // here needlessly duplicates image data in memory before the write.
    const writeRequest = store.put(grid);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(grid);

        transaction.onerror = () => {
            reject(
                writeRequest.error ||
                transaction.error ||
                new Error("Failed to save grid.")
            );
        };

        transaction.onabort = () => {
            reject(
                writeRequest.error ||
                transaction.error ||
                new Error("Grid save transaction aborted.")
            );
        };
    });
}


// ========================================
// Get One Grid
// ========================================

export async function getGrid(gridId) {
    if (!gridId) {
        return null;
    }

    const db = await openDatabase();

    const transaction = db.transaction(
        GRID_STORE,
        "readonly"
    );

    const store = transaction.objectStore(GRID_STORE);
    const request = store.get(gridId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(
                request.result
                    ? cloneData(request.result)
                    : null
            );
        };

        request.onerror = () => {
            reject(
                request.error ||
                new Error("Failed to retrieve grid.")
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error("Grid retrieval transaction aborted.")
            );
        };
    });
}


// ========================================
// Get All Grids
// ========================================

export async function getAllGrids() {
    const db = await openDatabase();

    const transaction = db.transaction(
        GRID_STORE,
        "readonly"
    );

    const store = transaction.objectStore(GRID_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const grids = request.result.map(
                grid => cloneData(grid)
            );

            grids.sort(
                (a, b) =>
                    (b.updatedAt ?? 0) -
                    (a.updatedAt ?? 0)
            );

            resolve(grids);
        };

        request.onerror = () => {
            reject(
                request.error ||
                new Error("Failed to retrieve grids.")
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error("Grid retrieval transaction aborted.")
            );
        };
    });
}


// ========================================
// Get Grid Summaries
// ========================================

/**
 * Get the metadata needed by the library without
 * deep-cloning every grid's images and history.
 *
 * Note: IndexedDB still retrieves the stored records.
 * A separate metadata store would be needed to avoid
 * reading the complete records altogether.
 */
export async function getGridSummaries() {
    const db = await openDatabase();

    const transaction = db.transaction(
        GRID_STORE,
        "readonly"
    );

    const store = transaction.objectStore(GRID_STORE);

    return new Promise((resolve, reject) => {
        const grids = [];

        const request = store.openCursor();

        request.onsuccess = () => {
            const cursor = request.result;

            if (!cursor) {
                grids.sort(
                    (a, b) =>
                        (b.updatedAt ?? 0) -
                        (a.updatedAt ?? 0)
                );

                resolve(grids);
                return;
            }

            const grid = cursor.value;

            grids.push({
                id: grid.id,
                name: grid.name,
                categoryId: grid.categoryId ?? null,
                createdAt: grid.createdAt ?? 0,
                updatedAt: grid.updatedAt ?? 0
            });

            cursor.continue();
        };

        request.onerror = () => {
            reject(
                request.error ||
                new Error("Failed to retrieve grid summaries.")
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error("Grid summary transaction aborted.")
            );
        };
    });
}


// ========================================
// Delete Grid
// ========================================

export async function deleteGrid(gridId) {
    if (!gridId) {
        return;
    }

    const db = await openDatabase();

    const transaction = db.transaction(
        GRID_STORE,
        "readwrite"
    );

    const store = transaction.objectStore(GRID_STORE);

    store.delete(gridId);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            if (appState.currentGridId === gridId) {
                appState.currentGridId = null;
                appState.currentGridName = "Untitled Grid";
            }

            resolve();
        };

        transaction.onerror = () => {
            reject(
                transaction.error ||
                new Error("Failed to delete grid.")
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error("Grid deletion transaction aborted.")
            );
        };
    });
}


// ========================================
// Create New Grid
// ========================================


export async function createGrid(options = {}) {
    const name = String(options.name ?? "Untitled Grid").trim();

    if (!name) {
        throw new Error("Grid name cannot be empty.");
    }

    const grid = createEmptyGridData();
    grid.name = name;

    if (options.categoryId !== undefined) {
        grid.categoryId = options.categoryId;
    }

    const db = await openDatabase();
    const transaction = db.transaction(GRID_STORE, "readwrite");
    const store = transaction.objectStore(GRID_STORE);
    const request = store.getAll();

    let validationError = null;

    request.onsuccess = () => {
        const normalizedName = name.toLowerCase();

        const duplicate = request.result.some(
            existing =>
                String(existing.name ?? "").trim().toLowerCase() ===
                normalizedName
        );

        if (duplicate) {
            validationError = new Error(
                `A grid named "${name}" already exists. Choose a different name.`
            );
            transaction.abort();
            return;
        }

        store.add(grid);
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            appState.currentGridId = grid.id;
            appState.currentGridName = grid.name;
            resolve(grid);
        };

        transaction.onerror = () => {
            reject(
                validationError ||
                transaction.error ||
                new Error("Failed to create grid.")
            );
        };

        transaction.onabort = () => {
            reject(
                validationError ||
                transaction.error ||
                new Error("Grid creation was aborted.")
            );
        };
    });
}



// ========================================
// Apply Grid Data To App State
// ========================================

export function applyGridData(grid) {
    if (!grid) {
        return;
    }

    appState.currentGridId = grid.id;
    appState.currentGridName = grid.name ?? "Untitled Grid";

    appState.savedImages = cloneData(grid.images ?? []);

    appState.spacing = grid.spacing ?? 0;
    appState.backgroundColor = grid.backgroundColor ?? "#ffffff";
    appState.borderEnabled = grid.borderEnabled ?? true;
    appState.borderSize = grid.borderSize ?? 2;
    appState.borderColor = grid.borderColor ?? "#9ca3af";

    appState.undoStack = cloneData(grid.undoStack ?? []);
    appState.redoStack = cloneData(grid.redoStack ?? []);

    const rowsInput = document.getElementById("rows");
    const columnsInput = document.getElementById("columns");
    const ratioInput = document.getElementById("imageRatio");
    const spacingInput = document.getElementById("spacing");
    const backgroundInput = document.getElementById("backgroundColor");
    const borderEnabledInput = document.getElementById("borderEnabled");
    const borderColorInput = document.getElementById("borderColor");
    const borderSizeInput = document.getElementById("borderSize");

    if (rowsInput) {
        rowsInput.value = grid.rows;
    }

    if (columnsInput) {
        columnsInput.value = grid.columns;
    }

    if (ratioInput) {
        ratioInput.value = grid.ratio;
    }

    if (spacingInput) {
        spacingInput.value = appState.spacing;
    }

    if (backgroundInput) {
        backgroundInput.value = appState.backgroundColor;
    }

    if (borderEnabledInput) {
        borderEnabledInput.checked = appState.borderEnabled;
    }

    if (borderColorInput) {
        borderColorInput.value = appState.borderColor;
    }

    if (borderSizeInput) {
        borderSizeInput.value = appState.borderSize;
    }
}


// ========================================
// Load Grid
// ========================================

export async function loadGrid(gridId) {
    const grid = await getGrid(gridId);

    if (!grid) {
        return null;
    }

    applyGridData(grid);

    return grid;
}


// ========================================
// Save Current Grid
// ========================================

// Capture each save request before queueing it. The active grid and app state
// can change while an earlier IndexedDB operation is still in progress.
let currentGridSaveQueue = Promise.resolve();
// A new grid can receive several queued saves before its first write succeeds.
// Keep its ID pending so a later save can create it after a transient failure.
const pendingInitialGridIds = new Set();

function captureCurrentGridSnapshot() {
    let gridId = appState.currentGridId;
    let initialGrid = null;

    // Reserve an ID synchronously so rapid saves made before the first write
    // completes all target the same newly-created grid.
    if (!gridId) {
        initialGrid = createGridData();
        gridId = initialGrid.id;
        appState.currentGridId = gridId;
        appState.currentGridName =
            appState.currentGridName || initialGrid.name;
        pendingInitialGridIds.add(gridId);
    }

    const rowsInput = document.getElementById("rows");
    const columnsInput = document.getElementById("columns");
    const ratioInput = document.getElementById("imageRatio");

    return {
        gridId,
        initialGrid,
        name: appState.currentGridName || "Untitled Grid",
        rows: Number(rowsInput?.value ?? 3),
        columns: Number(columnsInput?.value ?? 3),
        ratio: ratioInput?.value ?? "1:1",
        images: cloneData(appState.savedImages),
        spacing: appState.spacing,
        backgroundColor: appState.backgroundColor,
        borderEnabled: appState.borderEnabled,
        borderSize: appState.borderSize,
        borderColor: appState.borderColor,
        undoStack: cloneData(appState.undoStack),
        redoStack: cloneData(appState.redoStack)
    };
}

export function getSaveErrorMessage(error) {
    if (error?.name === "QuotaExceededError") {
        return "Your browser storage is full, so the latest changes couldn't be saved. Export important grids and free up browser storage before continuing.";
    }

    if (
        error?.name === "SecurityError" ||
        error?.name === "InvalidStateError" ||
        error?.name === "NotSupportedError"
    ) {
        return "Browser storage is unavailable, so the latest changes couldn't be saved. Check your browser's site-storage settings and keep this tab open.";
    }

    return "Couldn't save your latest changes. Keep this tab open and try again. If it keeps happening, export important grids before refreshing.";
}

function updateSaveStatus(message, isError = false) {
    let status = document.getElementById("gridSaveStatus");

    if (!status) {
        status = document.createElement("div");
        status.id = "gridSaveStatus";
        status.setAttribute("role", isError ? "alert" : "status");
        status.setAttribute("aria-live", isError ? "assertive" : "polite");
        Object.assign(status.style, {
            position: "fixed",
            left: "50%",
            bottom: "1rem",
            transform: "translateX(-50%)",
            zIndex: "10000",
            maxWidth: "min(90vw, 36rem)",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            fontSize: "0.95rem",
            textAlign: "center"
        });
        document.body.append(status);
    }

    status.textContent = message;
    status.style.background = isError ? "#991b1b" : "#166534";
    status.style.color = "#ffffff";
    status.setAttribute("role", isError ? "alert" : "status");
    status.setAttribute("aria-live", isError ? "assertive" : "polite");
    status.hidden = !message;
}

export function saveCurrentGrid() {
    const snapshot = captureCurrentGridSnapshot();

    currentGridSaveQueue = currentGridSaveQueue
        .catch(error => {
            // Keep the queue usable even if an unexpected rejection escaped.
            console.error("A previous board save failed:", error);
        })
        .then(async () => {
            try {
                await saveCurrentGridSnapshot(snapshot);
                updateSaveStatus("");
                return true;
            } catch (error) {
                console.error("Failed to save the current grid:", error);
                updateSaveStatus(getSaveErrorMessage(error), true);
                return false;
            }
        });

    return currentGridSaveQueue;
}

async function saveCurrentGridSnapshot(snapshot) {
    const isPendingNewGrid =
        Boolean(snapshot.initialGrid) ||
        pendingInitialGridIds.has(snapshot.gridId);
    let grid = snapshot.initialGrid;

    if (!grid) {
        grid = await getGrid(snapshot.gridId);
    }

    if (!grid && isPendingNewGrid) {
        // The first write may have failed before this grid reached IndexedDB.
        // Rebuild it from the queued snapshot so the next save can recover.
        grid = {
            id: snapshot.gridId,
            name: snapshot.name || "Untitled Grid",
            categoryId: null,
            createdAt: Date.now()
        };
    }

    if (!grid) {
        // If a previously saved grid was deleted while this save was queued,
        // do not resurrect it.
        return null;
    }

    grid.rows = snapshot.rows;
    grid.columns = snapshot.columns;
    grid.ratio = snapshot.ratio;
    grid.name = snapshot.name || grid.name || "Untitled Grid";
    grid.images = snapshot.images;
    grid.spacing = snapshot.spacing;
    grid.backgroundColor = snapshot.backgroundColor;
    grid.borderEnabled = snapshot.borderEnabled;
    grid.borderSize = snapshot.borderSize;
    grid.borderColor = snapshot.borderColor;
    grid.undoStack = snapshot.undoStack;
    grid.redoStack = snapshot.redoStack;
    grid.updatedAt = Date.now();

    // For existing grids, check and write in the same read/write
    // transaction. A separate getGrid() followed by saveGrid() leaves a
    // race where a queued save can recreate a grid deleted in between.
    if (isPendingNewGrid) {
        await saveGrid(grid);
        pendingInitialGridIds.delete(snapshot.gridId);
        return grid;
    }

    const db = await openDatabase();
    const transaction = db.transaction(GRID_STORE, "readwrite");
    const store = transaction.objectStore(GRID_STORE);
    const request = store.get(snapshot.gridId);
    let writeRequest = null;
    let writeError = null;
    let gridStillExists = false;

    request.onsuccess = () => {
        if (!request.result) {
            return;
        }

        gridStillExists = true;
        // IndexedDB clones on put, so avoid an additional full copy of images/history.
        try {
            writeRequest = store.put(grid);
        } catch (error) {
            // A synchronous write failure (such as QuotaExceededError) may cause
            // IndexedDB to abort with a less specific transaction error. Preserve
            // the original exception so the user receives the correct guidance.
            writeError = error;
            try {
                transaction.abort();
            } catch {
                // The transaction may already be aborting.
            }
        }
    };

    await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(
            writeError || writeRequest?.error || request.error || transaction.error ||
            new Error("Failed to save grid.")
        );
        transaction.onabort = () => reject(
            writeError || writeRequest?.error || request.error || transaction.error ||
            new Error("Grid save transaction aborted.")
        );
    });

    return gridStillExists ? grid : null;
}


// ========================================
// Backwards-Compatible Name
// ========================================

export const saveBoard = saveCurrentGrid;


// ========================================
// Load Board
// ========================================

export async function loadBoard() {
    if (appState.currentGridId) {
        const currentGrid = await loadGrid(
            appState.currentGridId
        );

        if (currentGrid) {
            return currentGrid;
        }
    }

    const grids = await getAllGrids();

    if (grids.length === 0) {
        return null;
    }

    const grid = grids[0];

    applyGridData(grid);

    return grid;
}


// ========================================
// Current Grid ID
// ========================================

export function getCurrentGridId() {
    return appState.currentGridId;
}


// ========================================
// Set Current Grid ID
// ========================================

export function setCurrentGridId(gridId) {
    appState.currentGridId = gridId;
}


// ========================================
// Rename Grid — Optimized
// ========================================


export async function renameGrid(gridId, newName) {
    if (!gridId) {
        return null;
    }

    const trimmedName = String(newName ?? "").trim();

    if (!trimmedName) {
        throw new Error("Grid name cannot be empty.");
    }

    const db = await openDatabase();
    const transaction = db.transaction(GRID_STORE, "readwrite");
    const store = transaction.objectStore(GRID_STORE);
    const request = store.getAll();

    let renamedGrid = null;
    let validationError = null;

    request.onsuccess = () => {
        const grids = request.result;
        const currentGrid = grids.find(
            grid => String(grid.id) === String(gridId)
        );

        if (!currentGrid) {
            return;
        }

        const normalizedName = trimmedName.toLowerCase();

        const duplicate = grids.some(
            grid =>
                String(grid.id) !== String(gridId) &&
                String(grid.name ?? "").trim().toLowerCase() ===
                    normalizedName
        );

        if (duplicate) {
            validationError = new Error(
                `A grid named "${trimmedName}" already exists. Choose a different name.`
            );
            transaction.abort();
            return;
        }

        renamedGrid = {
            ...currentGrid,
            name: trimmedName
        };

        // Renaming does not change the grid's content or recency.
        store.put(renamedGrid);
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            if (!renamedGrid) {
                resolve(null);
                return;
            }

            if (appState.currentGridId === gridId) {
                appState.currentGridName = renamedGrid.name;
            }

            resolve(renamedGrid);
        };

        transaction.onerror = () => {
            reject(
                validationError ||
                transaction.error ||
                new Error("Failed to rename grid.")
            );
        };

        transaction.onabort = () => {
            reject(
                validationError ||
                transaction.error ||
                new Error("Grid rename was aborted.")
            );
        };
    });
}
