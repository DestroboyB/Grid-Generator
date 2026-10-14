
import {
    getGridSummaries,
    loadGrid,
    createGrid,
    renameGrid,
    deleteGrid,
    applyGridData
} from "../storage/grids.js";

import {
    getAllCategories,
    createCategory,
    renameCategory,
    moveCategory,
    moveGridToCategory,
    deleteCategory
} from "../storage/categories.js";

import { createCategoryElement } from "./categoryItem.js";

import {
    getDescendantIds,
    getCategoryDepth,
    getSubtreeHeight
} from "./categoryUtils.js";

import { appState } from "../state.js";
import { generateBoard } from "../board.js";

import {
    openCategoryNameModal,
    openCategorySelectionModal
} from "./libraryModals.js";
// ========================================
// Library Elements
// ========================================

const libraryButton = document.getElementById("libraryButton");
const libraryPanel = document.getElementById("libraryPanel");
const libraryOverlay = document.getElementById("libraryOverlay");
const libraryCloseButton = document.getElementById("libraryCloseButton");
const libraryContent = document.getElementById("libraryContent");
const librarySearchInput = document.getElementById("librarySearchInput");
const newGridButton = document.getElementById("newGridButton");
const newCategoryButton = document.getElementById("newCategoryButton");
const currentGridName = document.getElementById("currentGridName");

// ========================================
// New Grid Modal Elements
// ========================================

const newGridModal = document.getElementById("newGridModal");
const newGridNameInput = document.getElementById("newGridNameInput");
const cancelNewGridButton = document.getElementById("cancelNewGridButton");
const createNewGridButton = document.getElementById("createNewGridButton");

const categoryElementDependencies = {
    makeActionButton,
    stopClick,
    openCategoryNameModal,
    openCategorySelectionModal,
    createCategory,
    renameCategory,
    getAllCategories,
    getDescendantIds,
    getSubtreeHeight,
    getCategoryDepth,
    moveCategory,
    deleteCategory,
    renderLibrary: () => renderLibrary(),
    showError,
    createGridElement: (...args) => createGridElement(...args)
};

// ========================================
// Expansion State
// ========================================

let hasRenderedLibrary = false;
let isLibrarySearchMode = false;
let pendingExpandedCategoryIds = null;

// ========================================
// General Helpers
// ========================================

function updateCurrentGridName() {
    if (!currentGridName) return;

    currentGridName.textContent =
        appState.currentGridName || "Untitled Grid";
}

function showError(message, error) {
    console.error(message, error);
    alert(error?.message || message);
}

function makeActionButton(label, title, className = "") {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `library-grid-action ${className}`.trim();
    button.textContent = label;
    button.title = title;

    return button;
}

function stopClick(event) {
    event.preventDefault();
    event.stopPropagation();
}

// ========================================
// Open and Close Library
// ========================================

function openLibrary() {
    if (!libraryPanel) return;

    libraryPanel.classList.add("open");
    libraryPanel.setAttribute("aria-hidden", "false");

    libraryOverlay?.classList.add("visible");

    renderLibrary();
}

function closeLibrary() {
    if (!libraryPanel) return;

    if (
        document.activeElement &&
        libraryPanel.contains(document.activeElement)
    ) {
        document.activeElement.blur();
    }

    libraryPanel.classList.remove("open");
    libraryPanel.setAttribute("aria-hidden", "true");

    libraryOverlay?.classList.remove("visible");
}

// ========================================
// Capture Expanded Categories
// ========================================

function getExpandedCategoryIds() {
    if (!libraryContent) return new Set();

    return new Set(
        Array.from(
            libraryContent.querySelectorAll(
                ".library-category:not(.collapsed)"
            )
        ).map(category => String(category.dataset.categoryId))
    );
}

// ========================================
// Library Search
// ========================================

async function searchLibrary() {
    if (!libraryContent || !librarySearchInput) return;

    const query = librarySearchInput.value.trim().toLocaleLowerCase();

    if (!query) {
        isLibrarySearchMode = false;
        await renderLibrary();
        return;
    }

    try {
        const [grids, categories] = await Promise.all([
            getGridSummaries(),
            getAllCategories()
        ]);

        const matchingGrids = grids.filter(grid =>
            String(grid.name || "Untitled Grid")
                .toLocaleLowerCase()
                .includes(query)
        );

        const fragment = document.createDocumentFragment();

        if (matchingGrids.length === 0) {
            const empty = document.createElement("div");
            empty.className = "library-search-empty";
            empty.textContent = `No grids match "${librarySearchInput.value.trim()}".`;
            fragment.appendChild(empty);
        } else {
            for (const grid of matchingGrids) {
                fragment.appendChild(
                    createGridElement(grid, categories, true)
                );
            }
        }

        isLibrarySearchMode = true;
        libraryContent.replaceChildren(fragment);
    } catch (error) {
        console.error("Failed to search library:", error);

        const message = document.createElement("div");
        message.className = "library-search-empty";
        message.textContent = "Search failed. Please try again.";

        libraryContent.replaceChildren(message);
    }
}

// ========================================
// Render Library
// ========================================

export async function renderLibrary() {
    if (!libraryContent) return;

    const expandedCategories = pendingExpandedCategoryIds !== null
        ? pendingExpandedCategoryIds
        : hasRenderedLibrary
            ? getExpandedCategoryIds()
            : null;

    pendingExpandedCategoryIds = null;
    isLibrarySearchMode = false;

    if (!libraryContent.children.length) {
        libraryContent.innerHTML =
            '<div class="library-empty">Loading...</div>';
    }

    try {
        const [grids, categories] = await Promise.all([
            getGridSummaries(),
            getAllCategories()
        ]);

        updateCurrentGridName();

        const fragment = document.createDocumentFragment();

        if (!grids.length && !categories.length) {
            const empty = document.createElement("div");
            empty.className = "library-empty";
            empty.textContent = "No grids or categories yet.";
            fragment.appendChild(empty);
        } else {
            const rootCategories = categories.filter(
                category => category.parentId == null
            );

            const orphanCategories = categories.filter(category =>
                category.parentId != null &&
                !categories.some(
                    parent =>
                        String(parent.id) === String(category.parentId)
                )
            );

            const topLevelCategories = [...rootCategories, ...orphanCategories];

            for (const category of topLevelCategories) {
                fragment.appendChild(
                    createCategoryElement(
                        category,
                        categories,
                        grids,
                        new Set(),
                        1,
                        expandedCategories,
                        categoryElementDependencies
                    )
                );
            }

            const uncategorized = grids.filter(
                grid => grid.categoryId == null
            );

            if (topLevelCategories.length > 0 && uncategorized.length > 0) {
                const divider = document.createElement("div");
                divider.className = "library-section-divider";
                divider.setAttribute("aria-hidden", "true");
                fragment.appendChild(divider);
            }

            for (const grid of uncategorized) {
                fragment.appendChild(createGridElement(grid, categories));
            }
        }

        libraryContent.replaceChildren(fragment);
        hasRenderedLibrary = true;
    } catch (error) {
        console.error("Failed to render library:", error);

        libraryContent.innerHTML = `
            <div class="library-empty">
                Failed to load library. Please try again.
            </div>
        `;
    }
}

// ========================================
// Create Category Element
// ========================================

// ========================================
// Create Grid Element
// ========================================

function createGridElement(grid, categories, searchResult = false) {
    const element = document.createElement("div");
    element.className = "library-grid";
    element.dataset.gridId = String(grid.id);

    if (String(grid.id) === String(appState.currentGridId)) {
        element.classList.add("active");
    }

    const icon = document.createElement("span");
    icon.className = "library-grid-icon";
    icon.textContent = "▣";

    const name = document.createElement("span");
    name.className = "library-grid-name";
    name.textContent = grid.name || "Untitled Grid";

    // Search results intentionally have no management buttons.
    if (!searchResult) {
        const actions = document.createElement("div");
        actions.className = "library-grid-actions";

        const moveButton = makeActionButton(
            "Move",
            "Move this grid to a category"
        );

        const renameButton = makeActionButton(
            "Rename",
            "Rename this grid"
        );

        const deleteButton = makeActionButton(
            "Delete",
            "Delete this grid",
            "delete"
        );

        moveButton.addEventListener("click", async event => {
            stopClick(event);

            try {
                const allCategories = await getAllCategories();

                openCategorySelectionModal({
                    title: `Move "${grid.name || "Untitled Grid"}"`,
                    categories: allCategories,
                    selectedId: grid.categoryId ?? null,
                    allowRoot: true,
                    rootLabel: "Uncategorized",
                    onSave: async destinationId => {
                        await moveGridToCategory(grid.id, destinationId);
                        await renderLibrary();
                    }
                });
            } catch (error) {
                showError("Failed to move the grid.", error);
            }
        });

        // Inline grid renaming.
        renameButton.addEventListener("click", event => {
            stopClick(event);

            if (element.querySelector(".library-grid-rename-input")) return;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "library-grid-rename-input";
            input.value = grid.name || "Untitled Grid";
            input.setAttribute("aria-label", "New grid name");

            const saveButton = makeActionButton("Save", "Save grid name");
            const cancelButton = makeActionButton("Cancel", "Cancel renaming");

            function cleanupRename() {
                if (input.isConnected) input.replaceWith(name);

                renameButton.hidden = false;
                moveButton.hidden = false;
                deleteButton.hidden = false;

                saveButton.remove();
                cancelButton.remove();
            }

            name.replaceWith(input);

            renameButton.hidden = true;
            moveButton.hidden = true;
            deleteButton.hidden = true;

            actions.append(saveButton, cancelButton);

            input.focus();
            input.select();

            let finished = false;

            async function finishRename(shouldSave) {
                if (finished) return;

                if (!shouldSave) {
                    finished = true;
                    cleanupRename();
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
                        cleanupRename();
                        await renderLibrary();
                        return;
                    }

                    grid.name = renamedGrid.name;
                    name.textContent = renamedGrid.name;

                    cleanupRename();
                    updateCurrentGridName();

                    if (isLibrarySearchMode) {
                        await searchLibrary();
                    }
                } catch (error) {
                    console.error("Failed to rename grid:", error);
                    alert(
                        error.message ||
                        "Failed to rename the grid. Please try again."
                    );

                    finished = false;
                    saveButton.disabled = false;
                    cancelButton.disabled = false;

                    input.focus();
                    input.select();
                }
            }

            saveButton.addEventListener("click", event => {
                stopClick(event);
                finishRename(true);
            });

            cancelButton.addEventListener("click", event => {
                stopClick(event);
                finishRename(false);
            });

            input.addEventListener("click", event => event.stopPropagation());

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

        deleteButton.addEventListener("click", async event => {
            stopClick(event);

            const gridName = grid.name || "Untitled Grid";

            if (!confirm(
                `Delete "${gridName}" permanently? This cannot be undone.`
            )) {
                return;
            }

            try {
                const deletingCurrentGrid =
                    String(grid.id) === String(appState.currentGridId);

                await deleteGrid(grid.id);

                if (deletingCurrentGrid) {
                    const remainingGrids = await getGridSummaries();

                    if (remainingGrids.length > 0) {
                        await loadGrid(remainingGrids[0].id);
                    } else {
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
                showError("Failed to delete the grid.", error);
            }
        });

        actions.append(moveButton, renameButton, deleteButton);
        element.append(icon, name, actions);
    } else {
        element.append(icon, name);
    }

    element.addEventListener("click", async event => {
        if (
            event.target.closest("button") ||
            event.target.closest("input") ||
            event.target.closest("select")
        ) {
            return;
        }

        try {
            const loaded = await loadGrid(grid.id);
            if (!loaded) return;

            generateBoard();
            updateCurrentGridName();

            if (searchResult) {
                // Leave search mode and restore the normal library.
                isLibrarySearchMode = false;

                if (librarySearchInput) {
                    librarySearchInput.value = "";
                }

                // Expand the selected grid's category and all ancestors.
                const expandedIds = new Set();
                const visitedIds = new Set();

                let parentId = grid.categoryId ?? null;

                while (parentId != null) {
                    const id = String(parentId);

                    if (visitedIds.has(id)) break;
                    visitedIds.add(id);

                    const category = categories.find(
                        item => String(item.id) === id
                    );

                    if (!category) break;

                    expandedIds.add(id);
                    parentId = category.parentId ?? null;
                }

                pendingExpandedCategoryIds = expandedIds;

                await renderLibrary();
                return;
            }

            libraryContent?.querySelectorAll(".library-grid")
                .forEach(item => {
                    item.classList.toggle(
                        "active",
                        item.dataset.gridId === String(appState.currentGridId)
                    );
                });
        } catch (error) {
            console.error("Failed to load grid:", error);
            alert("Failed to load the grid. Please try again.");
        }
    });

    return element;
}

// ========================================
// New Grid Modal
// ========================================

function openNewGridModal() {
    if (!newGridModal) return;

    if (newGridNameInput) {
        newGridNameInput.value = "Untitled Grid";
    }

    newGridModal.classList.add("open");
    newGridModal.setAttribute("aria-hidden", "false");

    setTimeout(() => {
        if (!newGridNameInput) return;

        newGridNameInput.focus();
        newGridNameInput.select();
    }, 0);
}

function closeNewGridModal() {
    if (!newGridModal) return;

    if (
        document.activeElement &&
        newGridModal.contains(document.activeElement)
    ) {
        document.activeElement.blur();
    }

    newGridModal.classList.remove("open");
    newGridModal.setAttribute("aria-hidden", "true");
}

// ========================================
// Create New Grid
// ========================================

async function handleCreateNewGrid() {
    const name = newGridNameInput?.value.trim() || "Untitled Grid";

    try {
        const grid = await createGrid({ name });

        applyGridData(grid);
        generateBoard();
        updateCurrentGridName();

        closeNewGridModal();

        if (librarySearchInput) {
            librarySearchInput.value = "";
        }

        isLibrarySearchMode = false;
        await renderLibrary();
    } catch (error) {
        showError("Failed to create a new grid.", error);
    }
}

// ========================================
// Create New Root Category
// ========================================

function handleCreateNewCategory() {
    openCategoryNameModal({
        title: "Create Category",
        onSave: async name => {
            await createCategory(name, null);
            await renderLibrary();
        }
    });
}

// ========================================
// Event Listeners
// ========================================

libraryButton?.addEventListener("click", openLibrary);
libraryCloseButton?.addEventListener("click", closeLibrary);
libraryOverlay?.addEventListener("click", closeLibrary);

newGridButton?.addEventListener("click", openNewGridModal);
newCategoryButton?.addEventListener("click", handleCreateNewCategory);

cancelNewGridButton?.addEventListener("click", closeNewGridModal);
createNewGridButton?.addEventListener("click", handleCreateNewGrid);

// Search only when Enter is pressed.
librarySearchInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchLibrary();
    } else if (event.key === "Escape" && isLibrarySearchMode) {
        event.preventDefault();
        event.stopPropagation();

        librarySearchInput.value = "";
        isLibrarySearchMode = false;
        renderLibrary();
    }
});

newGridModal?.addEventListener("click", event => {
    if (event.target === newGridModal) {
        closeNewGridModal();
    }
});

// ========================================
// Keyboard Controls
// ========================================

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        newGridModal?.classList.contains("open")
    ) {
        closeNewGridModal();
        return;
    }

    if (
        event.key === "Enter" &&
        newGridModal?.classList.contains("open") &&
        (
            document.activeElement === newGridNameInput ||
            document.activeElement === createNewGridButton
        )
    ) {
        event.preventDefault();
        handleCreateNewGrid();
        return;
    }

    if (
        event.key === "Escape" &&
        libraryPanel?.classList.contains("open") &&
        !isLibrarySearchMode
    ) {
        closeLibrary();
    }
});
