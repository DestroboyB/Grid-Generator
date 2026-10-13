
import {
    openDatabase,
    CATEGORY_STORE,
    GRID_STORE
} from "./database.js";

import { generateId, cloneData } from "./helpers.js";


// ========================================
// Create Category
// ========================================

export async function createCategory(name, parentId = null) {
    const trimmedName = String(name ?? "").trim();

    if (!trimmedName) {
        throw new Error("Category name cannot be empty.");
    }

    const db = await openDatabase();

    if (parentId != null) {
        const parent = await getCategory(parentId);

        if (!parent) {
            throw new Error("The parent category could not be found.");
        }
    }

    const category = {
        id: generateId("category"),
        name: trimmedName,
        parentId: parentId ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const transaction = db.transaction(CATEGORY_STORE, "readwrite");
    transaction.objectStore(CATEGORY_STORE).add(category);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(cloneData(category));
        transaction.onerror = () =>
            reject(transaction.error || new Error("Failed to create category."));
        transaction.onabort = () =>
            reject(transaction.error || new Error("Category creation aborted."));
    });
}


// ========================================
// Get Category
// ========================================

export async function getCategory(categoryId) {
    if (categoryId == null) {
        return null;
    }

    const db = await openDatabase();
    const transaction = db.transaction(CATEGORY_STORE, "readonly");
    const request = transaction.objectStore(CATEGORY_STORE).get(categoryId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () =>
            resolve(request.result ? cloneData(request.result) : null);

        request.onerror = () =>
            reject(request.error || new Error("Failed to retrieve category."));

        transaction.onabort = () =>
            reject(transaction.error || new Error("Category retrieval aborted."));
    });
}


// ========================================
// Get All Categories
// ========================================

export async function getAllCategories() {
    const db = await openDatabase();
    const transaction = db.transaction(CATEGORY_STORE, "readonly");
    const request = transaction.objectStore(CATEGORY_STORE).getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const categories = request.result.map(cloneData);

            categories.sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            resolve(categories);
        };

        request.onerror = () =>
            reject(request.error || new Error("Failed to retrieve categories."));

        transaction.onabort = () =>
            reject(transaction.error || new Error("Category retrieval aborted."));
    });
}


// ========================================
// Rename Category
// ========================================

export async function renameCategory(categoryId, newName) {
    const trimmedName = String(newName ?? "").trim();

    if (!trimmedName) {
        throw new Error("Category name cannot be empty.");
    }

    const db = await openDatabase();
    const transaction = db.transaction(CATEGORY_STORE, "readwrite");
    const store = transaction.objectStore(CATEGORY_STORE);
    const request = store.get(categoryId);

    let updatedCategory = null;

    request.onsuccess = () => {
        if (!request.result) {
            return;
        }

        updatedCategory = {
            ...request.result,
            name: trimmedName,
            updatedAt: Date.now()
        };

        store.put(updatedCategory);
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () =>
            resolve(updatedCategory ? cloneData(updatedCategory) : null);

        transaction.onerror = () =>
            reject(transaction.error || new Error("Failed to rename category."));

        transaction.onabort = () =>
            reject(transaction.error || new Error("Category rename aborted."));
    });
}


// ========================================
// Get Descendant Category IDs
// ========================================

function getDescendantIds(categoryId, categories) {
    const descendants = new Set();
    const pending = [categoryId];

    while (pending.length) {
        const currentId = pending.pop();

        for (const category of categories) {
            if (
                category.parentId === currentId &&
                !descendants.has(category.id)
            ) {
                descendants.add(category.id);
                pending.push(category.id);
            }
        }
    }

    return descendants;
}


// ========================================
// Move Category
// ========================================

export async function moveCategory(categoryId, newParentId = null) {
    const categories = await getAllCategories();
    const category = categories.find(item => item.id === categoryId);

    if (!category) {
        return null;
    }

    if (newParentId != null) {
        const parent = categories.find(item => item.id === newParentId);

        if (!parent) {
            throw new Error("The destination category could not be found.");
        }

        if (newParentId === categoryId) {
            throw new Error("A category cannot be its own parent.");
        }

        const descendants = getDescendantIds(categoryId, categories);

        if (descendants.has(newParentId)) {
            throw new Error("A category cannot be moved inside its own subcategory.");
        }
    }

    const db = await openDatabase();
    const transaction = db.transaction(CATEGORY_STORE, "readwrite");
    const store = transaction.objectStore(CATEGORY_STORE);

    const updatedCategory = {
        ...category,
        parentId: newParentId ?? null,
        updatedAt: Date.now()
    };

    store.put(updatedCategory);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () =>
            resolve(cloneData(updatedCategory));

        transaction.onerror = () =>
            reject(transaction.error || new Error("Failed to move category."));

        transaction.onabort = () =>
            reject(transaction.error || new Error("Category move aborted."));
    });
}


// ========================================
// Move Grid Into a Category
// ========================================

export async function moveGridToCategory(gridId, categoryId = null) {
    const db = await openDatabase();

    if (categoryId != null) {
        const category = await getCategory(categoryId);

        if (!category) {
            throw new Error("The destination category could not be found.");
        }
    }

    const transaction = db.transaction(GRID_STORE, "readwrite");
    const store = transaction.objectStore(GRID_STORE);
    const request = store.get(gridId);

    let updatedGrid = null;

    request.onsuccess = () => {
        if (!request.result) {
            return;
        }

        updatedGrid = {
            ...request.result,
            categoryId: categoryId ?? null,
            updatedAt: Date.now()
        };

        store.put(updatedGrid);
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () =>
            resolve(updatedGrid ? cloneData(updatedGrid) : null);

        transaction.onerror = () =>
            reject(transaction.error || new Error("Failed to move grid."));

        transaction.onabort = () =>
            reject(transaction.error || new Error("Grid move aborted."));
    });
}


// ========================================
// Delete Category Safely
// ========================================
//
// - Keeps all grids.
// - Makes grids directly assigned to this category uncategorized.
// - Moves immediate subcategories to this category's parent.
// - Preserves deeper nesting under those subcategories.
// ========================================

export async function deleteCategory(categoryId) {
    if (categoryId == null) {
        return;
    }

    const db = await openDatabase();

    const transaction = db.transaction(
        [CATEGORY_STORE, GRID_STORE],
        "readwrite"
    );

    const categoryStore = transaction.objectStore(CATEGORY_STORE);
    const gridStore = transaction.objectStore(GRID_STORE);

    const categoryRequest = categoryStore.get(categoryId);
    const gridsRequest = gridStore.openCursor();
    const categoriesRequest = categoryStore.openCursor();

    let parentId = null;
    let categoryFound = false;

    categoryRequest.onsuccess = () => {
        const category = categoryRequest.result;

        if (!category) {
            return;
        }

        categoryFound = true;
        parentId = category.parentId ?? null;
        categoryStore.delete(categoryId);
    };

    categoriesRequest.onsuccess = () => {
        const cursor = categoriesRequest.result;

        if (!cursor) {
            return;
        }

        const category = cursor.value;

        if (category.parentId === categoryId) {
            cursor.update({
                ...category,
                parentId,
                updatedAt: Date.now()
            });
        }

        cursor.continue();
    };

    gridsRequest.onsuccess = () => {
        const cursor = gridsRequest.result;

        if (!cursor) {
            return;
        }

        const grid = cursor.value;

        if (grid.categoryId === categoryId) {
            cursor.update({
                ...grid,
                categoryId: null,
                updatedAt: Date.now()
            });
        }

        cursor.continue();
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(categoryFound);

        transaction.onerror = () =>
            reject(transaction.error || new Error("Failed to delete category."));

        transaction.onabort = () =>
            reject(transaction.error || new Error("Category deletion aborted."));
    });
}
