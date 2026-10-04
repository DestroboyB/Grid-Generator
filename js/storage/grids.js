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

    const rowsInput =
        document.getElementById(
            "rows"
        );

    const columnsInput =
        document.getElementById(
            "columns"
        );

    const ratioInput =
        document.getElementById(
            "imageRatio"
        );

    return {

        id:
            generateId("grid"),

        name:
            "Untitled Grid",

        categoryId:
            null,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now(),

        rows:
            Number(
                rowsInput?.value ?? 3
            ),

        columns:
            Number(
                columnsInput?.value ?? 3
            ),

        ratio:
            ratioInput?.value ??
            "1:1",

        spacing:
            appState.spacing,

        backgroundColor:
            appState.backgroundColor,

        images:
            cloneData(
                appState.savedImages
            ),

        undoStack:
            cloneData(
                appState.undoStack
            ),

        redoStack:
            cloneData(
                appState.redoStack
            )
    };
}


// ========================================
// Create Empty Grid Data
// ========================================

export function createEmptyGridData() {

    const rowsInput =
        document.getElementById(
            "rows"
        );

    const columnsInput =
        document.getElementById(
            "columns"
        );

    const ratioInput =
        document.getElementById(
            "imageRatio"
        );

    return {

        id:
            generateId("grid"),

        name:
            "Untitled Grid",

        categoryId:
            null,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now(),

        rows:
            Number(
                rowsInput?.value ?? 3
            ),

        columns:
            Number(
                columnsInput?.value ?? 3
            ),

        ratio:
            ratioInput?.value ??
            "1:1",

        spacing:
            appState.spacing,

        backgroundColor:
            appState.backgroundColor,

        images:
            [],

        undoStack:
            [],

        redoStack:
            []
    };
}


// ========================================
// Save Grid
// ========================================

export async function saveGrid(
    grid
) {

    const db =
        await openDatabase();

    grid.updatedAt =
        Date.now();

    const transaction =
        db.transaction(
            GRID_STORE,
            "readwrite"
        );

    const store =
        transaction.objectStore(
            GRID_STORE
        );

    store.put(
        cloneData(grid)
    );

    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => resolve(
                    grid
                );

            transaction.onerror =
                () => reject(
                    transaction.error
                );

            transaction.onabort =
                () => reject(
                    transaction.error
                );
        }
    );
}


// ========================================
// Get One Grid
// ========================================

export async function getGrid(
    gridId
) {

    if (!gridId) {
        return null;
    }

    const db =
        await openDatabase();

    const transaction =
        db.transaction(
            GRID_STORE,
            "readonly"
        );

    const store =
        transaction.objectStore(
            GRID_STORE
        );

    const request =
        store.get(
            gridId
        );

    return new Promise(
        (
            resolve,
            reject
        ) => {

            request.onsuccess =
                () => {

                    resolve(
                        request.result
                            ? cloneData(
                                request.result
                            )
                            : null
                    );
                };

            request.onerror =
                () => reject(
                    request.error
                );
        }
    );
}


// ========================================
// Get All Grids
// ========================================

export async function getAllGrids() {

    const db =
        await openDatabase();

    const transaction =
        db.transaction(
            GRID_STORE,
            "readonly"
        );

    const store =
        transaction.objectStore(
            GRID_STORE
        );

    const request =
        store.getAll();

    return new Promise(
        (
            resolve,
            reject
        ) => {

            request.onsuccess =
                () => {

                    const grids =
                        request.result
                            .map(
                                grid =>
                                    cloneData(
                                        grid
                                    )
                            );

                    grids.sort(
                        (
                            a,
                            b
                        ) =>
                            (b.updatedAt ?? 0) -
                            (a.updatedAt ?? 0)
                    );

                    resolve(
                        grids
                    );
                };

            request.onerror =
                () => reject(
                    request.error
                );
        }
    );
}


// ========================================
// Delete Grid
// ========================================

export async function deleteGrid(
    gridId
) {

    if (!gridId) {
        return;
    }

    const db =
        await openDatabase();

    const transaction =
        db.transaction(
            GRID_STORE,
            "readwrite"
        );

    const store =
        transaction.objectStore(
            GRID_STORE
        );

    store.delete(
        gridId
    );

    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => {

                    if (
                        appState.currentGridId ===
                        gridId
                    ) {

                        appState.currentGridId =
                            null;

                        appState.currentGridName =
                            "Untitled Grid";
                    }

                    resolve();
                };

            transaction.onerror =
                () => reject(
                    transaction.error
                );
        }
    );
}


// ========================================
// Create New Grid
// ========================================

export async function createGrid(
    options = {}
) {

    const grid =
        createEmptyGridData();

    if (options.name) {

        grid.name =
            options.name;
    }

    if (
        options.categoryId !==
        undefined
    ) {

        grid.categoryId =
            options.categoryId;
    }

    await saveGrid(
        grid
    );

    appState.currentGridId =
        grid.id;

    appState.currentGridName =
        grid.name;

    return grid;
}


// ========================================
// Apply Grid Data To App State
// ========================================

export function applyGridData(
    grid
) {

    if (!grid) {
        return;
    }

    appState.currentGridId =
        grid.id;

    appState.currentGridName =
        grid.name ??
        "Untitled Grid";

    appState.savedImages =
        cloneData(
            grid.images ?? []
        );

    appState.spacing =
        grid.spacing ?? 0;

    appState.backgroundColor =
        grid.backgroundColor ??
        "#ffffff";

    appState.undoStack =
        cloneData(
            grid.undoStack ?? []
        );

    appState.redoStack =
        cloneData(
            grid.redoStack ?? []
        );


    // ========================================
    // Update Controls
    // ========================================

    const rowsInput =
        document.getElementById(
            "rows"
        );

    const columnsInput =
        document.getElementById(
            "columns"
        );

    const ratioInput =
        document.getElementById(
            "imageRatio"
        );

    const spacingInput =
        document.getElementById(
            "spacing"
        );

    const backgroundInput =
        document.getElementById(
            "backgroundColor"
        );


    if (rowsInput) {

        rowsInput.value =
            grid.rows;
    }

    if (columnsInput) {

        columnsInput.value =
            grid.columns;
    }

    if (ratioInput) {

        ratioInput.value =
            grid.ratio;
    }

    if (spacingInput) {

        spacingInput.value =
            grid.spacing;

    }

    if (backgroundInput) {

        backgroundInput.value =
            grid.backgroundColor;
    }
}


// ========================================
// Load Grid
// ========================================

export async function loadGrid(
    gridId
) {

    const grid =
        await getGrid(
            gridId
        );

    if (!grid) {

        return null;
    }

    applyGridData(
        grid
    );

    return grid;
}


// ========================================
// Save Current Grid
// ========================================

export async function saveCurrentGrid() {

    let grid;

    if (
        appState.currentGridId
    ) {

        grid =
            await getGrid(
                appState.currentGridId
            );
    }


    // ========================================
    // No Existing Grid
    // ========================================

    if (!grid) {

        grid =
            createGridData();

        appState.currentGridId =
            grid.id;

        appState.currentGridName =
            grid.name;
    }


    // ========================================
    // Read Current Controls
    // ========================================

    const rowsInput =
        document.getElementById(
            "rows"
        );

    const columnsInput =
        document.getElementById(
            "columns"
        );

    const ratioInput =
        document.getElementById(
            "imageRatio"
        );


    if (rowsInput) {

        grid.rows =
            Number(
                rowsInput.value
            );
    }

    if (columnsInput) {

        grid.columns =
            Number(
                columnsInput.value
            );
    }

    if (ratioInput) {

        grid.ratio =
            ratioInput.value;
    }


    // ========================================
    // Save Current State
    // ========================================

    grid.name =
        appState.currentGridName ||
        grid.name ||
        "Untitled Grid";

    grid.images =
        cloneData(
            appState.savedImages
        );

    grid.spacing =
        appState.spacing;

    grid.backgroundColor =
        appState.backgroundColor;

    grid.undoStack =
        cloneData(
            appState.undoStack
        );

    grid.redoStack =
        cloneData(
            appState.redoStack
        );

    grid.updatedAt =
        Date.now();


    await saveGrid(
        grid
    );

    return grid;
}


// ========================================
// Backwards-Compatible Name
// ========================================

export const saveBoard =
    saveCurrentGrid;


// ========================================
// Load Board
// ========================================

export async function loadBoard() {

    // Try current grid first
    if (
        appState.currentGridId
    ) {

        const currentGrid =
            await loadGrid(
                appState.currentGridId
            );

        if (currentGrid) {

            return currentGrid;
        }
    }


    // Otherwise load most recently updated grid
    const grids =
        await getAllGrids();

    if (
        grids.length === 0
    ) {

        return null;
    }

    const grid =
        grids[0];

    applyGridData(
        grid
    );

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

export function setCurrentGridId(
    gridId
) {

    appState.currentGridId =
        gridId;
}


// ========================================
// Rename Grid
// ========================================

export async function renameGrid(
    gridId,
    newName
) {

    const grid =
        await getGrid(
            gridId
        );

    if (!grid) {

        return null;
    }

    const trimmedName =
        String(
            newName
        ).trim();

    grid.name =
        trimmedName ||
        "Untitled Grid";

    await saveGrid(
        grid
    );

    if (
        appState.currentGridId ===
        gridId
    ) {

        appState.currentGridName =
            grid.name;
    }

    return grid;
}