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
         * MyAnimeList/Jikan rate limit.
         *
         * Wait before retrying instead of immediately
         * giving up.
         */

        if (response.status === 429) {

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

            throw new MalApiError(
                "MyAnimeList is temporarily rate limiting requests.",
                429
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

export async function getItemDetail(
    mode,
    malId
) {

    if (mode === "character") {

        return getCharacter(malId);
    }

    return getAnime(malId);
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