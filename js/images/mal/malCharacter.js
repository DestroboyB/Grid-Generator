import {
    getCharacterAnime
} from "./malApi.js";


/* ========================================
   Character Anime Cache
======================================== */

const characterAnimeCache = new Map();


/* ========================================
   Character Anime Request Queue
======================================== */

const CHARACTER_ANIME_CONCURRENCY = 3;

let activeCharacterAnimeRequests = 0;

const characterAnimeQueue = [];


/* ========================================
   Queue Character Anime Request
======================================== */

export function queueCharacterAnimeRequest(
    character,
    typeElement
) {
    if (!character || !character.malId) {
        return;
    }

    characterAnimeQueue.push({
        character,
        typeElement
    });

    processCharacterAnimeQueue();
}


/* ========================================
   Process Request Queue
======================================== */

function processCharacterAnimeQueue() {
    while (
        activeCharacterAnimeRequests <
            CHARACTER_ANIME_CONCURRENCY &&
        characterAnimeQueue.length > 0
    ) {
        const request =
            characterAnimeQueue.shift();

        activeCharacterAnimeRequests++;

        loadCharacterAnime(
            request.character,
            request.typeElement
        ).finally(() => {
            activeCharacterAnimeRequests--;

            processCharacterAnimeQueue();
        });
    }
}


/* ========================================
   Load Character Anime
======================================== */

async function loadCharacterAnime(
    character,
    typeElement
) {
    const characterId = character.malId;

    if (!characterId || !typeElement) {
        return;
    }

    /* ------------------------------------
       Use Cached Result
    ------------------------------------ */

    if (characterAnimeCache.has(characterId)) {
        typeElement.textContent =
            characterAnimeCache.get(characterId);

        return;
    }


    /* ------------------------------------
       Show Loading State
    ------------------------------------ */

    typeElement.textContent =
        "Loading anime...";


    try {
        const response =
            await getCharacterAnime(characterId);

        const appearances =
            Array.isArray(response?.data)
                ? response.data
                : [];


        /* --------------------------------
           Find First Anime Appearance
        -------------------------------- */

        let firstAppearance =
            appearances.length > 0
                ? appearances[0]
                : null;

        let animeTitle = "";


        if (firstAppearance) {

            /*
             * Some API responses return:
             *
             * {
             *     title: "..."
             * }
             */

            if (firstAppearance.title) {
                animeTitle =
                    firstAppearance.title;
            }


            /*
             * Some responses return:
             *
             * {
             *     anime: {
             *         title: "..."
             *     }
             * }
             */

            if (
                !animeTitle &&
                firstAppearance.anime
            ) {
                animeTitle =
                    firstAppearance.anime.title ||
                    firstAppearance.anime.name ||
                    "";
            }


            /*
             * Some responses may use:
             *
             * {
             *     entry: {
             *         title: "..."
             *     }
             * }
             */

            if (
                !animeTitle &&
                firstAppearance.entry
            ) {
                animeTitle =
                    firstAppearance.entry.title ||
                    firstAppearance.entry.name ||
                    "";
            }


            /*
             * Some responses may wrap the
             * actual data object.
             */

            if (
                !animeTitle &&
                firstAppearance.data
            ) {
                animeTitle =
                    firstAppearance.data.title ||
                    firstAppearance.data.name ||
                    "";
            }
        }


        /* --------------------------------
           Final Result
        -------------------------------- */

        if (animeTitle) {
            characterAnimeCache.set(
                characterId,
                animeTitle
            );

            typeElement.textContent =
                animeTitle;
        } else {
            characterAnimeCache.set(
                characterId,
                "Anime unavailable"
            );

            typeElement.textContent =
                "Anime unavailable";
        }

    } catch (error) {

        /*
         * Do NOT cache errors.
         *
         * If the request failed because of
         * rate limiting or a temporary API
         * problem, a later attempt should
         * still be allowed to try again.
         */

        console.warn(
            `Unable to load anime for character ${characterId}:`,
            error
        );

        typeElement.textContent =
            "Anime unavailable";
    }
}


/* ========================================
   Cache Management
======================================== */

export function clearCharacterAnimeCache() {
    characterAnimeCache.clear();
}