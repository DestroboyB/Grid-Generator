// ========================================
// Storage Helpers
// ========================================


// ========================================
// Generate ID
// ========================================

export function generateId(
    prefix = "id"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}


// ========================================
// Deep Clone
// ========================================

export function cloneData(
    data
) {

    if (data === undefined) {
        return undefined;
    }

    return structuredClone(data);
}


// ========================================
// Promise Wrapper
// ========================================

export function requestToPromise(
    request
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            request.onsuccess =
                () => resolve(
                    request.result
                );

            request.onerror =
                () => reject(
                    request.error
                );
        }
    );
}