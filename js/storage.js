import { appState } from "./state.js";

const DATABASE_NAME =
    "gridBoardDatabase";

const DATABASE_VERSION =
    1;

const STORE_NAME =
    "boards";

const BOARD_KEY =
    "currentBoard";

let saveQueue =
    Promise.resolve();


function openDatabase() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    DATABASE_NAME,
                    DATABASE_VERSION
                );

            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;

                    if (
                        !db.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {
                        db.createObjectStore(
                            STORE_NAME
                        );
                    }
                };

            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );
                };

            request.onerror =
                () => {

                    reject(
                        request.error
                    );
                };
        }
    );
}


function cloneData(
    data
) {

    return JSON.parse(
        JSON.stringify(data)
    );
}


function getIndexedDBBoard() {

    return openDatabase()
        .then(
            db => {

                return new Promise(
                    (resolve, reject) => {

                        const transaction =
                            db.transaction(
                                STORE_NAME,
                                "readonly"
                            );

                        const store =
                            transaction.objectStore(
                                STORE_NAME
                            );

                        const request =
                            store.get(
                                BOARD_KEY
                            );

                        request.onsuccess =
                            () => {

                                resolve(
                                    request.result ||
                                    null
                                );
                            };

                        request.onerror =
                            () => {

                                reject(
                                    request.error
                                );
                            };

                        transaction.oncomplete =
                            () => {

                                db.close();
                            };
                    }
                );
            }
        );
}


function saveIndexedDBBoard(
    boardData
) {

    return openDatabase()
        .then(
            db => {

                return new Promise(
                    (resolve, reject) => {

                        const transaction =
                            db.transaction(
                                STORE_NAME,
                                "readwrite"
                            );

                        const store =
                            transaction.objectStore(
                                STORE_NAME
                            );

                        store.put(
                            boardData,
                            BOARD_KEY
                        );

                        transaction.oncomplete =
                            () => {

                                db.close();

                                resolve();
                            };

                        transaction.onerror =
                            () => {

                                db.close();

                                reject(
                                    transaction.error
                                );
                            };
                    }
                );
            }
        );
}


function deleteIndexedDBBoard() {

    return openDatabase()
        .then(
            db => {

                return new Promise(
                    (resolve, reject) => {

                        const transaction =
                            db.transaction(
                                STORE_NAME,
                                "readwrite"
                            );

                        const store =
                            transaction.objectStore(
                                STORE_NAME
                            );

                        store.delete(
                            BOARD_KEY
                        );

                        transaction.oncomplete =
                            () => {

                                db.close();

                                resolve();
                            };

                        transaction.onerror =
                            () => {

                                db.close();

                                reject(
                                    transaction.error
                                );
                            };
                    }
                );
            }
        );
}


function createBoardData() {

    const rowsInput =
        document.getElementById(
            "rows"
        );

    const columnsInput =
        document.getElementById(
            "columns"
        );

    const imageRatioInput =
        document.getElementById(
            "imageRatio"
        );

    return {

        rows:
            rowsInput.value,

        columns:
            columnsInput.value,

        ratio:
            imageRatioInput.value,

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


function applyBoardData(
    boardData
) {

    const rowsInput =
        document.getElementById(
            "rows"
        );

    const columnsInput =
        document.getElementById(
            "columns"
        );

    const imageRatioInput =
        document.getElementById(
            "imageRatio"
        );

    rowsInput.value =
        boardData.rows;

    columnsInput.value =
        boardData.columns;

    imageRatioInput.value =
        boardData.ratio;

    appState.spacing =
        boardData.spacing ?? 0;

    appState.backgroundColor =
        boardData.backgroundColor ??
        "#ffffff";

    appState.savedImages =
        cloneData(
            boardData.images || []
        );

    appState.undoStack =
        cloneData(
            boardData.undoStack || []
        );

    appState.redoStack =
        cloneData(
            boardData.redoStack || []
        );
}


export function saveBoard() {

    const boardData =
        createBoardData();

    /*
     * Queue saves so multiple rapid
     * changes are written in order.
     */
    saveQueue =
        saveQueue
            .then(
                () => {

                    return saveIndexedDBBoard(
                        boardData
                    );
                }
            )
            .catch(
                error => {

                    console.error(
                        "IndexedDB save failed:",
                        error
                    );
                }
            );

    return saveQueue;
}


export async function loadBoard() {

    try {

        const boardData =
            await getIndexedDBBoard();

        if (!boardData) {
            return false;
        }

        applyBoardData(
            boardData
        );

        return true;

    } catch (error) {

        console.error(
            "Unable to load board from IndexedDB:",
            error
        );

        return false;
    }
}


export function clearSavedBoard() {

    appState.savedImages =
        [];

    appState.undoStack =
        [];

    appState.redoStack =
        [];

    saveQueue =
        saveQueue
            .then(
                () => {

                    return deleteIndexedDBBoard();
                }
            )
            .catch(
                error => {

                    console.error(
                        "Unable to clear IndexedDB board:",
                        error
                    );
                }
            );

    return saveQueue;
}