// ========================================
// Category Storage
// ========================================

import {
    openDatabase,
    CATEGORY_STORE,
    GRID_STORE
} from "./database.js";

import {
    generateId,
    cloneData
} from "./helpers.js";


// ========================================
// Create Category
// ========================================

export async function createCategory(
    name,
    parentId = null
) {

    const category = {

        id:
            generateId("category"),

        name:
            String(
                name
            ).trim() ||
            "Untitled Category",

        parentId:
            parentId,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()
    };


    const db =
        await openDatabase();


    const transaction =
        db.transaction(
            CATEGORY_STORE,
            "readwrite"
        );


    transaction
        .objectStore(
            CATEGORY_STORE
        )
        .put(
            category
        );


    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => resolve(
                    cloneData(
                        category
                    )
                );

            transaction.onerror =
                () => reject(
                    transaction.error
                );
        }
    );
}


// ========================================
// Get Category
// ========================================

export async function getCategory(
    categoryId
) {

    if (!categoryId) {
        return null;
    }


    const db =
        await openDatabase();


    const transaction =
        db.transaction(
            CATEGORY_STORE,
            "readonly"
        );


    const request =
        transaction
            .objectStore(
                CATEGORY_STORE
            )
            .get(
                categoryId
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
// Get All Categories
// ========================================

export async function getAllCategories() {

    const db =
        await openDatabase();


    const transaction =
        db.transaction(
            CATEGORY_STORE,
            "readonly"
        );


    const request =
        transaction
            .objectStore(
                CATEGORY_STORE
            )
            .getAll();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            request.onsuccess =
                () => {

                    const categories =
                        request.result
                            .map(
                                category =>
                                    cloneData(
                                        category
                                    )
                            );


                    categories.sort(
                        (
                            a,
                            b
                        ) =>
                            a.name.localeCompare(
                                b.name
                            )
                    );


                    resolve(
                        categories
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
// Rename Category
// ========================================

export async function renameCategory(
    categoryId,
    newName
) {

    const category =
        await getCategory(
            categoryId
        );


    if (!category) {

        return null;
    }


    category.name =
        String(
            newName
        ).trim() ||
        "Untitled Category";


    category.updatedAt =
        Date.now();


    const db =
        await openDatabase();


    const transaction =
        db.transaction(
            CATEGORY_STORE,
            "readwrite"
        );


    transaction
        .objectStore(
            CATEGORY_STORE
        )
        .put(
            category
        );


    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => resolve(
                    cloneData(
                        category
                    )
                );

            transaction.onerror =
                () => reject(
                    transaction.error
                );
        }
    );
}


// ========================================
// Move Category
// ========================================

export async function moveCategory(
    categoryId,
    newParentId
) {

    const category =
        await getCategory(
            categoryId
        );


    if (!category) {

        return null;
    }


    // Prevent category from becoming
    // its own parent.

    if (
        categoryId ===
        newParentId
    ) {

        throw new Error(
            "A category cannot be its own parent."
        );
    }


    category.parentId =
        newParentId ??
        null;


    category.updatedAt =
        Date.now();


    const db =
        await openDatabase();


    const transaction =
        db.transaction(
            CATEGORY_STORE,
            "readwrite"
        );


    transaction
        .objectStore(
            CATEGORY_STORE
        )
        .put(
            category
        );


    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => resolve(
                    cloneData(
                        category
                    )
                );

            transaction.onerror =
                () => reject(
                    transaction.error
                );
        }
    );
}


// ========================================
// Delete Category
// ========================================
//
// Grids inside the category are not
// deleted.
//
// Their categoryId is changed to null.
//
// ========================================

export async function deleteCategory(
    categoryId
) {

    if (!categoryId) {
        return;
    }


    const db =
        await openDatabase();


    const transaction =
        db.transaction(
            [
                CATEGORY_STORE,
                GRID_STORE
            ],
            "readwrite"
        );


    const categoryStore =
        transaction.objectStore(
            CATEGORY_STORE
        );

    const gridStore =
        transaction.objectStore(
            GRID_STORE
        );


    // ----------------------------------------
    // Delete Category
    // ----------------------------------------

    categoryStore.delete(
        categoryId
    );


    // ----------------------------------------
    // Remove Category From Grids
    // ----------------------------------------

    const request =
        gridStore.getAll();


    request.onsuccess =
        () => {

            const grids =
                request.result;


            for (
                const grid
                of grids
            ) {

                if (
                    grid.categoryId ===
                    categoryId
                ) {

                    grid.categoryId =
                        null;

                    grid.updatedAt =
                        Date.now();

                    gridStore.put(
                        grid
                    );
                }
            }
        };


    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => resolve();

            transaction.onerror =
                () => reject(
                    transaction.error
                );
        }
    );
}