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




function createGridElement(grid) {
    const element = document.createElement("div");
    element.className = "library-grid";

    if (grid.id === appState.currentGridId) {
        element.classList.add("active");
    }

    const icon = document.createElement("span");
    icon.className = "library-grid-icon";
    icon.textContent = "▣";

    const name = document.createElement("span");
    name.className = "library-grid-name";
    name.textContent = grid.name || "Untitled Grid";

    const actions = document.createElement("div");
    actions.className = "library-grid-actions";

    // Rename button
    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "library-grid-action";
    renameButton.textContent = "Rename";
    renameButton.title = "Rename this grid";

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "library-grid-action delete";
    deleteButton.textContent = "Delete";
    deleteButton.title = "Delete this grid";

    // ========================================
    // Rename Grid — Inline Editing
    // ========================================

    renameButton.addEventListener("click", event => {
        event.stopPropagation();

        // Don't start a second editing session.
        if (element.querySelector(".library-grid-rename-input")) {
            return;
        }

        const input = document.createElement("input");
        input.type = "text";
        input.className = "library-grid-rename-input";
        input.value = grid.name || "Untitled Grid";
        input.setAttribute("aria-label", "New grid name");

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "library-grid-action";
        saveButton.textContent = "Save";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "library-grid-action";
        cancelButton.textContent = "Cancel";

        name.replaceWith(input);

        renameButton.hidden = true;
        deleteButton.hidden = true;

        actions.appendChild(saveButton);
        actions.appendChild(cancelButton);

        input.focus();
        input.select();

        let finished = false;

        async function finishRename(shouldSave) {
            if (finished) {
                return;
            }

            if (!shouldSave) {
                finished = true;
                await renderLibrary();
                return;
            }

            const newName = input.value.trim();

            if (!newName) {
                alert("Grid name cannot be empty.");
                input.focus();
                return;
            }

            finished = true;
            saveButton.disabled = true;
            cancelButton.disabled = true;

            try {
                const renamedGrid = await renameGrid(grid.id, newName);

                if (!renamedGrid) {
                    alert("This grid could not be found.");
                    await renderLibrary();
                    return;
                }

                updateCurrentGridName();
                await renderLibrary();
            } catch (error) {
                console.error("Failed to rename grid:", error);
                alert("Failed to rename the grid. Please try again.");

                finished = false;
                saveButton.disabled = false;
                cancelButton.disabled = false;
                input.focus();
                input.select();
            }
        }

        saveButton.addEventListener("click", event => {
            event.stopPropagation();
            finishRename(true);
        });

        cancelButton.addEventListener("click", event => {
            event.stopPropagation();
            finishRename(false);
        });

        input.addEventListener("click", event => {
            event.stopPropagation();
        });

        input.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                finishRename(true);
            } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                finishRename(false);
            }
        });
    });

    // ========================================
    // Delete Grid
    // ========================================

    deleteButton.addEventListener("click", async event => {
        event.stopPropagation();

        const gridName = grid.name || "Untitled Grid";

        if (!confirm(`Delete "${gridName}" permanently? This cannot be undone.`)) {
            return;
        }

        try {
            const deletingCurrentGrid =
                grid.id === appState.currentGridId;

            await deleteGrid(grid.id);

            if (deletingCurrentGrid) {
                // Look for another saved grid to open.
                const remainingGrids = await getAllGrids();

                if (remainingGrids.length > 0) {
                    await loadGrid(remainingGrids[0].id);
                } else {
                    // Leave an empty board without saving a new grid.
                    appState.currentGridId = null;
                    appState.currentGridName = "Untitled Grid";
                    appState.savedImages = [];
                    appState.undoStack = [];
                    appState.redoStack = [];
                }

                generateBoard();
                updateCurrentGridName();
            }

            await renderLibrary();
        } catch (error) {
            console.error("Failed to delete grid:", error);
            alert("Failed to delete the grid. Please try again.");
        }
    });

    actions.appendChild(renameButton);
    actions.appendChild(deleteButton);

    element.appendChild(icon);
    element.appendChild(name);
    element.appendChild(actions);

    // Clicking the entry loads the grid.
    element.addEventListener("click", async () => {
        try {
            const loaded = await loadGrid(grid.id);

            if (!loaded) {
                return;
            }

            generateBoard();
            updateCurrentGridName();
            await renderLibrary();
        } catch (error) {
            console.error("Failed to load grid:", error);
        }
    });

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
