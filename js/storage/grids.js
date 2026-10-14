
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

    store.put(cloneData(grid));

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(grid);

        transaction.onerror = () => {
            reject(
                transaction.error ||
                new Error("Failed to save grid.")
            );
        };

        transaction.onabort = () => {
            reject(
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

export async function saveCurrentGrid() {
    let grid;

    if (appState.currentGridId) {
        grid = await getGrid(appState.currentGridId);
    }

    if (!grid) {
        grid = createGridData();

        appState.currentGridId = grid.id;
        appState.currentGridName = grid.name;
    }

    const rowsInput = document.getElementById("rows");
    const columnsInput = document.getElementById("columns");
    const ratioInput = document.getElementById("imageRatio");

    if (rowsInput) {
        grid.rows = Number(rowsInput.value);
    }

    if (columnsInput) {
        grid.columns = Number(columnsInput.value);
    }

    if (ratioInput) {
        grid.ratio = ratioInput.value;
    }

    grid.name =
        appState.currentGridName ||
        grid.name ||
        "Untitled Grid";

    grid.images = cloneData(appState.savedImages);

    grid.spacing = appState.spacing;
    grid.backgroundColor = appState.backgroundColor;
    grid.borderEnabled = appState.borderEnabled;
    grid.borderSize = appState.borderSize;
    grid.borderColor = appState.borderColor;

    grid.undoStack = cloneData(appState.undoStack);
    grid.redoStack = cloneData(appState.redoStack);

    grid.updatedAt = Date.now();

    await saveGrid(grid);

    return grid;
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
