// ========================================
// IndexedDB Configuration
// ========================================

export const DATABASE_NAME =
    "gridBoardDatabase";

export const DATABASE_VERSION =
    2;


// ========================================
// Object Stores
// ========================================

export const GRID_STORE =
    "grids";

export const CATEGORY_STORE =
    "categories";


// ========================================
// Open Database
// ========================================

import {
    migrateV1ToV2
} from "./migration.js";


let databasePromise = null;


export function openDatabase() {

    if (databasePromise) {
        return databasePromise;
    }

    const openingPromise = new Promise(
        (resolve, reject) => {
            let request;

            try {
                request = indexedDB.open(
                    DATABASE_NAME,
                    DATABASE_VERSION
                );
            } catch (error) {
                reject(error);
                return;
            }

            // ========================================
            // Database Upgrade
            // ========================================
            request.onupgradeneeded = event => {
                const db = event.target.result;
                const transaction = event.target.transaction;
                const oldVersion = event.oldVersion;

                if (!db.objectStoreNames.contains(GRID_STORE)) {
                    db.createObjectStore(GRID_STORE, { keyPath: "id" });
                }

                if (!db.objectStoreNames.contains(CATEGORY_STORE)) {
                    const categoryStore = db.createObjectStore(
                        CATEGORY_STORE,
                        { keyPath: "id" }
                    );
                    categoryStore.createIndex(
                        "parentId",
                        "parentId",
                        { unique: false }
                    );
                }

                if (oldVersion < 2) {
                    migrateV1ToV2(db, transaction);
                }
            };

            // ========================================
            // Success
            // ========================================
            request.onsuccess = event => {
                const db = event.target.result;

                db.onversionchange = () => {
                    db.close();
                    databasePromise = null;
                };

                resolve(db);
            };

            // ========================================
            // Error
            // ========================================
            request.onerror = () => {
                console.error(
                    "Failed to open IndexedDB:",
                    request.error
                );
                reject(
                    request.error ||
                    new Error("Failed to open IndexedDB.")
                );
            };
        }
    );

    // A failed open must not poison the cached promise permanently. This lets
    // later saves retry after transient browser/storage errors or a temporary
    // IndexedDB failure.
    databasePromise = openingPromise.catch(error => {
        databasePromise = null;
        throw error;
    });

    return databasePromise;
}
