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
// Library Elements
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
// New Grid Modal Elements
// ========================================

const newGridModal =
    document.getElementById(
        "newGridModal"
    );

const newGridNameInput =
    document.getElementById(
        "newGridNameInput"
    );

const cancelNewGridButton =
    document.getElementById(
        "cancelNewGridButton"
    );

const createNewGridButton =
    document.getElementById(
        "createNewGridButton"
    );


// ========================================
// Open Library
// ========================================

function openLibrary() {

    if (!libraryPanel) {
        return;
    }

    libraryPanel.classList.add(
        "open"
    );

    libraryPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    if (libraryOverlay) {

        libraryOverlay.classList.add(
            "visible"
        );
    }

    renderLibrary();
}


// ========================================
// Close Library
// ========================================

function closeLibrary() {

    if (!libraryPanel) {
        return;
    }


    // Remove focus from anything
    // inside the panel before hiding it.

    if (
        document.activeElement &&
        libraryPanel.contains(
            document.activeElement
        )
    ) {

        document.activeElement.blur();
    }


    libraryPanel.classList.remove(
        "open"
    );

    libraryPanel.setAttribute(
        "aria-hidden",
        "true"
    );

    if (libraryOverlay) {

        libraryOverlay.classList.remove(
            "visible"
        );
    }
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


        // ========================================
        // Root Categories
        // ========================================

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


        // ========================================
        // Uncategorized Grids
        // ========================================

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


    // ========================================
    // Header
    // ========================================

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


    // ========================================
    // Children
    // ========================================

    const children =
        document.createElement(
            "div"
        );

    children.className =
        "library-category-children";


    // Child Categories

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


    // Grids Inside Category

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


    // ========================================
    // Collapse / Expand
    // ========================================

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


    // ========================================
    // Load Grid
    // ========================================

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
// Open New Grid Modal
// ========================================

function openNewGridModal() {

    if (!newGridModal) {
        return;
    }

    if (newGridNameInput) {

        newGridNameInput.value =
            "Untitled Grid";
    }

    newGridModal.classList.add(
        "open"
    );

    newGridModal.setAttribute(
        "aria-hidden",
        "false"
    );


    // Focus input after modal opens

    setTimeout(
        () => {

            if (!newGridNameInput) {
                return;
            }

            newGridNameInput.focus();

            newGridNameInput.select();

        },
        0
    );
}


// ========================================
// Close New Grid Modal
// ========================================

function closeNewGridModal() {

    if (!newGridModal) {
        return;
    }


    // Remove focus from anything
    // inside the modal before hiding it.

    if (
        document.activeElement &&
        newGridModal.contains(
            document.activeElement
        )
    ) {

        document.activeElement.blur();
    }


    newGridModal.classList.remove(
        "open"
    );

    newGridModal.setAttribute(
        "aria-hidden",
        "true"
    );
}


// ========================================
// Create New Grid
// ========================================

async function handleCreateNewGrid() {

    const name =
        newGridNameInput?.value.trim() ||
        "Untitled Grid";

    try {

        // Create a completely empty grid

        await createGrid({
            name:
                name
        });


        // Clear current editor state

        appState.savedImages =
            [];

        appState.undoStack =
            [];

        appState.redoStack =
            [];


        // Generate empty board

        generateBoard();


        // Update UI

        updateCurrentGridName();

        closeNewGridModal();

        await renderLibrary();

    } catch (error) {

        console.error(
            "Failed to create new grid:",
            error
        );
    }
}


// ========================================
// Library Button
// ========================================

if (libraryButton) {

    libraryButton.addEventListener(
        "click",
        openLibrary
    );
}


// ========================================
// Close Library
// ========================================

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


// ========================================
// New Grid
// ========================================

if (newGridButton) {

    newGridButton.addEventListener(
        "click",
        openNewGridModal
    );
}


// ========================================
// Cancel New Grid
// ========================================

if (cancelNewGridButton) {

    cancelNewGridButton.addEventListener(
        "click",
        closeNewGridModal
    );
}


// ========================================
// Create New Grid
// ========================================

if (createNewGridButton) {

    createNewGridButton.addEventListener(
        "click",
        handleCreateNewGrid
    );
}


// ========================================
// Click Outside New Grid Modal
// ========================================

if (newGridModal) {

    newGridModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                newGridModal
            ) {

                closeNewGridModal();
            }
        }
    );
}


// ========================================
// New Category
// ========================================

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
// Keyboard Controls
// ========================================

document.addEventListener(
    "keydown",
    event => {

        // Escape New Grid Modal

        if (
            event.key === "Escape" &&
            newGridModal &&
            newGridModal.classList.contains(
                "open"
            )
        ) {

            closeNewGridModal();

            return;
        }


        // Enter New Grid

        if (
            event.key === "Enter" &&
            newGridModal &&
            newGridModal.classList.contains(
                "open"
            )
        ) {

            handleCreateNewGrid();

            return;
        }


        // Escape Library

        if (
            event.key === "Escape" &&
            libraryPanel &&
            libraryPanel.classList.contains(
                "open"
            )
        ) {

            closeLibrary();
        }
    }
);
