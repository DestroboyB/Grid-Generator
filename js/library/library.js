// ========================================
// Grid Library
// ========================================

import {
    getAllGrids,
    loadGrid,
    createGrid,
    renameGrid,
    deleteGrid
} from "../storage/grids.js";

import {
    getAllCategories
} from "../storage/categories.js";

import {
    appState
} from "../state.js";

import {
    generateBoard
} from "../board.js";


// ========================================
// DOM Elements
// ========================================

const libraryButton =
    document.getElementById(
        "libraryButton"
    );

const libraryPanel =
    document.getElementById(
        "libraryPanel"
    );

const libraryOverlay =
    document.getElementById(
        "libraryOverlay"
    );

const libraryCloseButton =
    document.getElementById(
        "libraryCloseButton"
    );

const libraryContent =
    document.getElementById(
        "libraryContent"
    );

const newGridButton =
    document.getElementById(
        "newGridButton"
    );

const newCategoryButton =
    document.getElementById(
        "newCategoryButton"
    );

const currentGridName =
    document.getElementById(
        "currentGridName"
    );


// ========================================
// Open Library
// ========================================

function openLibrary() {

    libraryPanel.classList.add(
        "open"
    );

    libraryPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    libraryOverlay.classList.add(
        "visible"
    );


    renderLibrary();
}


// ========================================
// Close Library
// ========================================

function closeLibrary() {

    libraryPanel.classList.remove(
        "open"
    );

    libraryPanel.setAttribute(
        "aria-hidden",
        "true"
    );

    libraryOverlay.classList.remove(
        "visible"
    );
}


// ========================================
// Update Current Grid Name
// ========================================

function updateCurrentGridName() {

    if (!currentGridName) {
        return;
    }


    currentGridName.textContent =
        appState.currentGridName ||
        "Untitled Grid";
}


// ========================================
// Render Library
// ========================================

export async function renderLibrary() {

    if (!libraryContent) {
        return;
    }


    libraryContent.innerHTML =
        `
            <div class="library-empty">
                Loading...
            </div>
        `;


    try {

        const [
            grids,
            categories
        ] =
            await Promise.all([
                getAllGrids(),
                getAllCategories()
            ]);


        updateCurrentGridName();


        libraryContent.innerHTML =
            "";


        if (
            grids.length === 0 &&
            categories.length === 0
        ) {

            libraryContent.innerHTML =
                `
                    <div class="library-empty">
                        No grids yet.
                    </div>
                `;

            return;
        }


        // ----------------------------------------
        // Build Category Tree
        // ----------------------------------------

        const rootCategories =
            categories.filter(
                category =>
                    !category.parentId
            );


        for (
            const category
            of rootCategories
        ) {

            const element =
                createCategoryElement(
                    category,
                    categories,
                    grids
                );


            libraryContent.appendChild(
                element
            );
        }


        // ----------------------------------------
        // Uncategorized Grids
        // ----------------------------------------

        const uncategorized =
            grids.filter(
                grid =>
                    !grid.categoryId
            );


        for (
            const grid
            of uncategorized
        ) {

            libraryContent.appendChild(
                createGridElement(
                    grid
                )
            );
        }

    } catch (error) {

        console.error(
            "Failed to render library:",
            error
        );


        libraryContent.innerHTML =
            `
                <div class="library-empty">
                    Failed to load library.
                </div>
            `;
    }
}


// ========================================
// Create Category Element
// ========================================

function createCategoryElement(
    category,
    categories,
    grids
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "library-category";


    // ----------------------------------------
    // Header
    // ----------------------------------------

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "library-category-header";


    const arrow =
        document.createElement(
            "span"
        );


    arrow.className =
        "library-category-arrow";


    arrow.textContent =
        "▼";


    const name =
        document.createElement(
            "span"
        );


    name.className =
        "library-category-name";


    name.textContent =
        category.name;


    header.appendChild(
        arrow
    );

    header.appendChild(
        name
    );


    // ----------------------------------------
    // Children
    // ----------------------------------------

    const children =
        document.createElement(
            "div"
        );


    children.className =
        "library-category-children";


    const childCategories =
        categories.filter(
            child =>
                child.parentId ===
                category.id
        );


    for (
        const child
        of childCategories
    ) {

        children.appendChild(
            createCategoryElement(
                child,
                categories,
                grids
            )
        );
    }


    const categoryGrids =
        grids.filter(
            grid =>
                grid.categoryId ===
                category.id
        );


    for (
        const grid
        of categoryGrids
    ) {

        children.appendChild(
            createGridElement(
                grid
            )
        );
    }


    wrapper.appendChild(
        header
    );

    wrapper.appendChild(
        children
    );


    // ----------------------------------------
    // Collapse / Expand
    // ----------------------------------------

    header.addEventListener(
        "click",
        () => {

            const isOpen =
                children.style.display !==
                "none";


            children.style.display =
                isOpen
                    ? "none"
                    : "";


            arrow.textContent =
                isOpen
                    ? "▶"
                    : "▼";
        }
    );


    return wrapper;
}


// ========================================
// Create Grid Element
// ========================================

function createGridElement(
    grid
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "library-grid";


    if (
        grid.id ===
        appState.currentGridId
    ) {

        element.classList.add(
            "active"
        );
    }


    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "library-grid-icon";


    icon.textContent =
        "▣";


    const name =
        document.createElement(
            "span"
        );


    name.className =
        "library-grid-name";


    name.textContent =
        grid.name ||
        "Untitled Grid";


    element.appendChild(
        icon
    );

    element.appendChild(
        name
    );


    // ----------------------------------------
    // Load Grid
    // ----------------------------------------

    element.addEventListener(
        "click",
        async () => {

            try {

                const loaded =
                    await loadGrid(
                        grid.id
                    );


                if (!loaded) {
                    return;
                }


                generateBoard();


                updateCurrentGridName();


                await renderLibrary();

            } catch (error) {

                console.error(
                    "Failed to load grid:",
                    error
                );
            }
        }
    );


    return element;
}


// ========================================
// New Grid
// ========================================

async function handleNewGrid() {

    const name =
        prompt(
            "Enter a name for the new grid:",
            "Untitled Grid"
        );


    if (name === null) {
        return;
    }


    const grid =
        await createGrid({
            name:
                name.trim() ||
                "Untitled Grid"
        });


    appState.savedImages =
        [];

    appState.undoStack =
        [];

    appState.redoStack =
        [];


    generateBoard();


    updateCurrentGridName();


    await renderLibrary();
}


// ========================================
// Event Listeners
// ========================================

if (libraryButton) {

    libraryButton.addEventListener(
        "click",
        openLibrary
    );
}


if (libraryCloseButton) {

    libraryCloseButton.addEventListener(
        "click",
        closeLibrary
    );
}


if (libraryOverlay) {

    libraryOverlay.addEventListener(
        "click",
        closeLibrary
    );
}


if (newGridButton) {

    newGridButton.addEventListener(
        "click",
        handleNewGrid
    );
}


// Placeholder for category creation.
// We'll implement this next.

if (newCategoryButton) {

    newCategoryButton.addEventListener(
        "click",
        () => {

            alert(
                "Category management is the next step."
            );
        }
    );
}


// ========================================
// Escape Key
// ========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            libraryPanel.classList.contains(
                "open"
            )
        ) {

            closeLibrary();
        }
    }
);