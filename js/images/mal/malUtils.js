/* ========================================
   MAL Item Names
======================================== */

export function getItemName(item, mode) {
    if (!item) {
        return "Unknown";
    }

    if (mode === "character") {
        return item.name || "Unknown Character";
    }

    return item.title || "Unknown Anime";
}


/* ========================================
   MAL Search Result Images
======================================== */

export function getImageURL(item) {
    if (!item) {
        return "";
    }

    if (item.imageUrl) {
        return item.imageUrl;
    }

    if (item.images) {
        if (item.images.large) {
            return item.images.large;
        }

        if (item.images.medium) {
            return item.images.medium;
        }

        if (item.images.small) {
            return item.images.small;
        }

        if (item.images.jpg) {
            if (item.images.jpg.large_image_url) {
                return item.images.jpg.large_image_url;
            }

            if (item.images.jpg.image_url) {
                return item.images.jpg.image_url;
            }
        }

        if (item.images.webp) {
            if (item.images.webp.large_image_url) {
                return item.images.webp.large_image_url;
            }

            if (item.images.webp.image_url) {
                return item.images.webp.image_url;
            }
        }
    }

    return "";
}


/* ========================================
   MAL Gallery Images
======================================== */

export function getPictureURL(picture) {
    if (!picture) {
        return "";
    }

    if (picture.imageUrl) {
        return picture.imageUrl;
    }

    if (picture.large) {
        return picture.large;
    }

    if (picture.medium) {
        return picture.medium;
    }

    if (picture.small) {
        return picture.small;
    }

    if (picture.images) {
        if (picture.images.jpg) {
            if (picture.images.jpg.large_image_url) {
                return picture.images.jpg.large_image_url;
            }

            if (picture.images.jpg.image_url) {
                return picture.images.jpg.image_url;
            }
        }

        if (picture.images.webp) {
            if (picture.images.webp.large_image_url) {
                return picture.images.webp.large_image_url;
            }

            if (picture.images.webp.image_url) {
                return picture.images.webp.image_url;
            }
        }
    }

    return "";
}