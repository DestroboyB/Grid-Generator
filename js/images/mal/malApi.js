const MAL_API_BASE = "https://jikan.lucashdo.com/v1";

export class MalApiError extends Error {
    constructor(message, status = 0) {
        super(message);
        this.name = "MalApiError";
        this.status = status;
    }
}


/* ========================================
   Generic Fetch
======================================== */

export async function fetchMAL(url) {

    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {

        let response;

        try {

            response = await fetch(url);

        } catch (error) {

            throw new MalApiError(
                "Unable to connect to MyAnimeList right now."
            );
        }


        /*
         * Retry rate limits and temporary gateway/server errors.
         * These can happen intermittently on the third-party API.
         */

        const isRetryableStatus =
            response.status === 429 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504;

        if (isRetryableStatus) {

            if (attempt < MAX_RETRIES) {

                const delay =
                    1000 * (attempt + 1);

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            delay
                        )
                );

                continue;
            }

            const message = response.status === 429
                ? "MyAnimeList is temporarily rate limiting requests."
                : "MyAnimeList is temporarily unavailable. Please try again.";

            throw new MalApiError(
                message,
                response.status
            );
        }


        if (!response.ok) {

            throw new MalApiError(
                `MyAnimeList request failed (${response.status}).`,
                response.status
            );
        }


        try {

            return await response.json();

        } catch {

            throw new MalApiError(
                "MyAnimeList returned an invalid response."
            );
        }
    }


    /*
     * This should never be reached, but keeps
     * the function safely defined.
     */

    throw new MalApiError(
        "Unable to complete the MyAnimeList request."
    );
}


/* ========================================
   Search
======================================== */

export async function searchCharacters(
    query,
    page = 1
) {

    const url =
        `${MAL_API_BASE}/characters` +
        `?q=${encodeURIComponent(query)}` +
        `&page=${page}`;

    return fetchMAL(url);
}


export async function searchAnime(
    query,
    page = 1
) {

    const url =
        `${MAL_API_BASE}/anime` +
        `?q=${encodeURIComponent(query)}` +
        `&page=${page}`;

    return fetchMAL(url);
}


/* ========================================
   Details
======================================== */

export async function getCharacter(
    characterId
) {

    return fetchMAL(
        `${MAL_API_BASE}/characters/${characterId}`
    );
}


export async function getAnime(
    animeId
) {

    return fetchMAL(
        `${MAL_API_BASE}/anime/${animeId}`
    );
}


/* ========================================
   Pictures
======================================== */

export async function getCharacterPictures(
    characterId
) {

    return fetchMAL(
        `${MAL_API_BASE}/characters/${characterId}/pictures`
    );
}


export async function getAnimePictures(
    animeId
) {

    return fetchMAL(
        `${MAL_API_BASE}/anime/${animeId}/pictures`
    );
}


/* ========================================
   Character Animeography
======================================== */

export async function getCharacterAnime(
    characterId
) {

    return fetchMAL(
        `${MAL_API_BASE}/characters/${characterId}/anime`
    );
}


/* ========================================
   Generic Helpers
======================================== */

const inFlightDetailRequests = new Map();

export function getItemDetail(
    mode,
    malId
) {
    const itemType = mode === "character" ? "character" : "anime";
    const key = `${itemType}:${malId}`;

    // Reuse a request already in progress for this same item.
    if (inFlightDetailRequests.has(key)) {
        return inFlightDetailRequests.get(key);
    }

    const request = itemType === "character"
        ? getCharacter(malId)
        : getAnime(malId);

    inFlightDetailRequests.set(key, request);

    // Only deduplicate concurrent requests; later calls can retry normally.
    const clearRequest = () => {
        if (inFlightDetailRequests.get(key) === request) {
            inFlightDetailRequests.delete(key);
        }
    };

    request.then(clearRequest, clearRequest);

    return request;
}


export async function getItemPictures(
    mode,
    malId
) {

    if (mode === "character") {

        return getCharacterPictures(malId);
    }

    return getAnimePictures(malId);
}