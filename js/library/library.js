
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
import { createGridElement as buildGridElement } from "./gridItem.js";

import {
    getDescendantIds,
    getCategoryDepth,
    getSubtreeHeight
} from "./categoryUtils.js";

import { appState } from "../state.js";
import { generateBoard } from "../board.js";
import { initializeHistory } from "../history.js";

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

const gridElementDependencies = {
    makeActionButton,
    stopClick,
    getAllCategories,
    openCategorySelectionModal,
    moveGridToCategory,
    renameGrid,
    deleteGrid,
    getGridSummaries,
    loadGrid,
    initializeHistory,
    appState,
    generateBoard,
    renderLibrary: () => renderLibrary(),
    updateCurrentGridName,
    showError,
    isLibrarySearchMode: () => isLibrarySearchMode,
    setIsLibrarySearchMode: value => {
        isLibrarySearchMode = value;
    },
    searchLibrary: () => searchLibrary(),
    librarySearchInput,
    setPendingExpandedCategoryIds: ids => {
        pendingExpandedCategoryIds = ids;
    },
    getLibraryContent: () => libraryContent
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

    document.body.classList.add("library-open");
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

    document.body.classList.remove("library-open");
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
    return buildGridElement(
        grid,
        categories,
        searchResult,
        gridElementDependencies
    );
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
        initializeHistory();
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
