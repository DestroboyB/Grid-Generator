// ========================================
// Database Migration
// ========================================

const GRID_STORE =
    "grids";


// ========================================
// Migration: Version 1 → Version 2
// ========================================
//
// Old database:
//
// boards
// └── currentBoard
//
// New database:
//
// grids
// ├── grid_...
// └── ...
//
// categories
// ├── ...
// └── ...
//
// ========================================

export function migrateV1ToV2(
    db,
    transaction
) {

    // ----------------------------------------
    // Check for Old Boards Store
    // ----------------------------------------

    if (
        !db.objectStoreNames.contains(
            "boards"
        )
    ) {

        return;
    }


    let oldStore;

    try {

        oldStore =
            transaction.objectStore(
                "boards"
            );

    } catch (error) {

        console.warn(
            "Could not access old boards store:",
            error
        );

        return;
    }


    // ----------------------------------------
    // New Grid Store
    // ----------------------------------------

    const gridStore =
        transaction.objectStore(
            GRID_STORE
        );


    // ----------------------------------------
    // Read Old Board
    // ----------------------------------------

    const request =
        oldStore.get(
            "currentBoard"
        );


    request.onsuccess =
        () => {

            const oldBoard =
                request.result;


            if (
                !oldBoard ||
                !oldBoard.data
            ) {

                return;
            }


            const now =
                Date.now();


            const gridId =
                "grid_" +
                now.toString(36) +
                "_" +
                Math.random()
                    .toString(36)
                    .substring(2, 8);


            const oldData =
                oldBoard.data;


            // ----------------------------------------
            // Create New Grid
            // ----------------------------------------

            const newGrid = {

                id: gridId,

                name:
                    "Untitled Grid",

                categoryId:
                    null,

                createdAt:
                    now,

                updatedAt:
                    now,

                rows:
                    oldData.rows ?? 3,

                columns:
                    oldData.columns ?? 3,

                ratio:
                    oldData.ratio ?? "1:1",

                spacing:
                    oldData.spacing ?? 0,

                backgroundColor:
                    oldData.backgroundColor ??
                    "#ffffff",

                images:
                    oldData.images ??
                    [],

                undoStack:
                    oldData.undoStack ??
                    [],

                redoStack:
                    oldData.redoStack ??
                    []
            };


            // ----------------------------------------
            // Save Migrated Grid
            // ----------------------------------------

            gridStore.put(
                newGrid
            );


            console.log(
                "Migrated old board into grid:",
                gridId
            );
        };


    request.onerror =
        () => {

            console.error(
                "Failed to migrate old board:",
                request.error
            );
        };


    // ----------------------------------------
    // Note
    // ----------------------------------------
    //
    // We intentionally leave the old
    // "boards" store alone for now.
    //
    // This makes the migration safer.
    //
    // It can be removed in a future
    // database version after everything
    // has been verified.
    //
}