
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
    setGridCategories,
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
    setGridCategories: async (gridId, categoryIds) => {
        const updated = await setGridCategories(gridId, categoryIds);
        if (String(gridId) === String(appState.currentGridId)) {
            const ids = categoryIds.map(String);
            if (ids.length) {
                const next = ids.includes(String(selectedCategoryId))
                    ? String(selectedCategoryId)
                    : ids[0];
                selectedCategoryId = next;
                lastSelectedCategoryByGrid.set(String(gridId), next);
            } else {
                selectedCategoryId = UNCATEGORIZED_ID;
            }
        }
        return updated;
    },
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
// Category navigation state
// ========================================

const UNCATEGORIZED_ID = "__uncategorized__";
let selectedCategoryId = null;
let selectedForGridId = undefined;
const lastSelectedCategoryByGrid = new Map();

function categoryIdsForGrid(grid) {
    if (Array.isArray(grid?.categoryIds)) return grid.categoryIds.map(String);
    return grid?.categoryId == null ? [] : [String(grid.categoryId)];
}

function categoryById(categories, id) {
    return categories.find(category => String(category.id) === String(id));
}

function getCategoryDepthFor(categories, category) {
    let depth = 1;
    let current = category;
    const visited = new Set();
    while (current?.parentId != null) {
        const id = String(current.id);
        if (visited.has(id)) return Infinity;
        visited.add(id);
        current = categoryById(categories, current.parentId);
        depth++;
    }
    return depth;
}

function getCategoryPath(categories, category) {
    const names = [];
    let current = category;
    const visited = new Set();
    while (current) {
        const id = String(current.id);
        if (visited.has(id)) break;
        visited.add(id);
        names.unshift(current.name);
        current = current.parentId == null ? null : categoryById(categories, current.parentId);
    }
    return names.join(" / ");
}

function rememberCategoryForCurrentGrid(categoryId, grids) {
    selectedCategoryId = categoryId;
    const currentGrid = grids.find(grid => String(grid.id) === String(appState.currentGridId));
    if (currentGrid && categoryId != null && categoryId !== UNCATEGORIZED_ID &&
        categoryIdsForGrid(currentGrid).includes(String(categoryId))) {
        lastSelectedCategoryByGrid.set(String(currentGrid.id), String(categoryId));
    }
}

function initializeCategoryForCurrentGrid(grids, categories) {
    const currentId = appState.currentGridId == null ? null : String(appState.currentGridId);
    if (selectedForGridId === currentId) {
        if (selectedCategoryId != null && selectedCategoryId !== UNCATEGORIZED_ID &&
            !categoryById(categories, selectedCategoryId)) selectedCategoryId = null;
        return;
    }
    selectedForGridId = currentId;
    const grid = grids.find(item => String(item.id) === currentId);
    const assignments = categoryIdsForGrid(grid);
    const remembered = currentId == null ? null : lastSelectedCategoryByGrid.get(currentId);
    if (remembered && assignments.includes(remembered) && categoryById(categories, remembered)) selectedCategoryId = remembered;
    else if (assignments.length) selectedCategoryId = assignments.find(id => categoryById(categories, id)) ?? UNCATEGORIZED_ID;
    else selectedCategoryId = UNCATEGORIZED_ID;
}

function makeLibraryButton(label, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
}

function makeCategoryNavigationButton(category) {
    const button = makeLibraryButton("", "library-category-navigation");
    const name = document.createElement("span");
    name.className = "library-category-navigation-name";
    name.textContent = category.name;
    const detail = document.createElement("span");
    detail.className = "library-category-navigation-detail";
    detail.textContent = "Open";
    button.append(name, detail);
    button.setAttribute("aria-label", `Open ${category.name}`);
    return button;
}

function renderCategorySelector(categories, parent, grids) {
    const label = document.createElement("label");
    label.className = "library-category-selector-label";
    label.htmlFor = "libraryCategorySelect";
    label.append(document.createTextNode("Category "));
    const select = document.createElement("select");
    select.id = "libraryCategorySelect";
    select.setAttribute("aria-label", "Choose category");
    const root = document.createElement("option");
    root.value = "";
    root.textContent = "Top-level categories";
    select.appendChild(root);
    const uncategorized = document.createElement("option");
    uncategorized.value = UNCATEGORIZED_ID;
    uncategorized.textContent = "Uncategorized";
    select.appendChild(uncategorized);
    const byParent = parentId => categories
        .filter(category => (category.parentId == null ? null : String(category.parentId)) === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    const append = (parentId = null, depth = 0, visited = new Set()) => {
        for (const category of byParent(parentId)) {
            const id = String(category.id);
            if (visited.has(id)) continue;
            const option = document.createElement("option");
            option.value = id;
            option.textContent = `${"— ".repeat(depth)}${category.name}`;
            select.appendChild(option);
            const next = new Set(visited);
            next.add(id);
            append(id, depth + 1, next);
        }
    };
    append();
    select.value = selectedCategoryId == null ? "" : String(selectedCategoryId);
    select.addEventListener("change", () => {
        const nextCategoryId = select.value || null;
        rememberCategoryForCurrentGrid(nextCategoryId, grids);
        renderLibrary();
    });
    label.appendChild(select);
    parent.appendChild(label);
}

function renderSelectedCategoryActions(category, categories, parent) {
    const actions = document.createElement("div");
    actions.className = "library-selected-category-actions";
    const depth = getCategoryDepthFor(categories, category);
    if (depth < 3) {
        const addChild = makeLibraryButton("+ Subcategory");
        addChild.addEventListener("click", () => openCategoryNameModal({
            title: `Create subcategory in "${category.name}"`,
            onSave: async name => {
                await createCategory(name, category.id);
                await renderLibrary();
            }
        }));
        actions.appendChild(addChild);
    }
    const rename = makeLibraryButton("Rename");
    rename.addEventListener("click", () => openCategoryNameModal({
        title: "Rename Category",
        initialName: category.name,
        onSave: async name => {
            await renameCategory(category.id, name);
            await renderLibrary();
        }
    }));
    const move = makeLibraryButton("Move");
    move.addEventListener("click", () => openCategorySelectionModal({
        title: `Move "${category.name}"`,
        categories,
        selectedId: category.parentId ?? null,
        allowRoot: true,
        rootLabel: "Top-level category",
        excludedIds: new Set([String(category.id), ...getDescendantIds(category.id, categories)]),
        onSave: async parentId => {
            const newParent = parentId == null ? null : categoryById(categories, parentId);
            const parentDepth = newParent ? getCategoryDepthFor(categories, newParent) : 0;
            const subtreeHeight = getSubtreeHeight(category.id, categories);
            if (parentDepth + subtreeHeight > 3) {
                throw new Error("Categories can be nested up to 3 levels.");
            }
            await moveCategory(category.id, parentId);
            selectedCategoryId = String(category.id);
            await renderLibrary();
        }
    }));
    const remove = makeLibraryButton("Delete", "delete");
    remove.addEventListener("click", async () => {
        if (!confirm(`Delete category "${category.name}"? Grids keep their other category assignments, and child categories move up one level.`)) return;
        try {
            selectedCategoryId = category.parentId == null ? null : String(category.parentId);
            await deleteCategory(category.id);
            await renderLibrary();
        } catch (error) {
            showError("Failed to delete category.", error);
        }
    });
    actions.append(rename, move, remove);
    parent.appendChild(actions);
}

async function searchLibrary() {
    if (!libraryContent || !librarySearchInput) return;
    const query = librarySearchInput.value.trim().toLocaleLowerCase();
    if (!query) {
        isLibrarySearchMode = false;
        await renderLibrary();
        return;
    }
    try {
        const [grids, categories] = await Promise.all([getGridSummaries(), getAllCategories()]);
        const matches = grids.filter(grid =>
            String(grid.name || "Untitled Grid").toLocaleLowerCase().includes(query)
        );
        const fragment = document.createDocumentFragment();
        const heading = document.createElement("div");
        heading.className = "library-view-heading";
        heading.textContent = "Search results";
        fragment.appendChild(heading);
        if (!matches.length) {
            const empty = document.createElement("div");
            empty.className = "library-empty";
            empty.textContent = `No grids match "${librarySearchInput.value.trim()}".`;
            fragment.appendChild(empty);
        } else {
            for (const grid of matches) fragment.appendChild(createGridElement(grid, categories, true));
        }
        isLibrarySearchMode = true;
        libraryContent.replaceChildren(fragment);
    } catch (error) {
        console.error("Failed to search library:", error);
        const empty = document.createElement("div");
        empty.className = "library-empty";
        empty.textContent = "Search failed. Please try again.";
        libraryContent.replaceChildren(empty);
    }
}

// ========================================
// Render Library
// ========================================

export async function renderLibrary() {
    if (!libraryContent) return;
    isLibrarySearchMode = false;
    try {
        const [grids, categories] = await Promise.all([getGridSummaries(), getAllCategories()]);
        updateCurrentGridName();
        initializeCategoryForCurrentGrid(grids, categories);
        const fragment = document.createDocumentFragment();

        const viewHeader = document.createElement("div");
        viewHeader.className = "library-view-header";
        const heading = document.createElement("h3");
        heading.className = "library-view-heading";
        heading.textContent = "My Grids:";
        viewHeader.appendChild(heading);
        renderCategorySelector(categories, viewHeader, grids);
        fragment.appendChild(viewHeader);

        const currentCategory = selectedCategoryId != null && selectedCategoryId !== UNCATEGORIZED_ID
            ? categoryById(categories, selectedCategoryId)
            : null;

        if (currentCategory) {
            const navBar = document.createElement("div");
            navBar.className = "library-breadcrumb-row";
            const back = makeLibraryButton("← Back", "library-back-button");
            back.addEventListener("click", () => {
                selectedCategoryId = currentCategory.parentId == null ? null : String(currentCategory.parentId);
                renderLibrary();
            });
            const path = document.createElement("div");
            path.className = "library-breadcrumb";
            path.textContent = getCategoryPath(categories, currentCategory);
            navBar.append(back, path);
            fragment.appendChild(navBar);

            const childCategories = categories
                .filter(category => String(category.parentId) === String(currentCategory.id))
                .sort((a, b) => a.name.localeCompare(b.name));
            for (const child of childCategories) {
                const button = makeCategoryNavigationButton(child);
                button.addEventListener("click", () => {
                    const activeGrid = grids.find(grid => String(grid.id) === String(appState.currentGridId));
                    if (activeGrid && categoryIdsForGrid(activeGrid).includes(String(child.id))) {
                        lastSelectedCategoryByGrid.set(String(activeGrid.id), String(child.id));
                    }
                    selectedCategoryId = String(child.id);
                    renderLibrary();
                });
                fragment.appendChild(button);
            }
            renderSelectedCategoryActions(currentCategory, categories, fragment);
        } else if (selectedCategoryId === UNCATEGORIZED_ID) {
            const navBar = document.createElement("div");
            navBar.className = "library-breadcrumb-row";
            const back = makeLibraryButton("← Back", "library-back-button");
            back.addEventListener("click", () => { selectedCategoryId = null; renderLibrary(); });
            const path = document.createElement("div");
            path.className = "library-breadcrumb";
            path.textContent = "Uncategorized";
            navBar.append(back, path);
            fragment.appendChild(navBar);
        } else {
            const rootCategories = categories
                .filter(category => category.parentId == null ||
                    !categories.some(parent => String(parent.id) === String(category.parentId)))
                .sort((a, b) => a.name.localeCompare(b.name));
            for (const category of rootCategories) {
                const button = makeCategoryNavigationButton(category);
                button.addEventListener("click", () => {
                    const activeGrid = grids.find(grid => String(grid.id) === String(appState.currentGridId));
                    if (activeGrid && categoryIdsForGrid(activeGrid).includes(String(category.id))) {
                        lastSelectedCategoryByGrid.set(String(activeGrid.id), String(category.id));
                    }
                    selectedCategoryId = String(category.id);
                    renderLibrary();
                });
                fragment.appendChild(button);
            }
            const uncategorizedButton = makeLibraryButton("Uncategorized", "library-category-navigation");
            uncategorizedButton.addEventListener("click", () => { selectedCategoryId = UNCATEGORIZED_ID; renderLibrary(); });
            fragment.appendChild(uncategorizedButton);
            if (!rootCategories.length && !grids.length) {
                const empty = document.createElement("div");
                empty.className = "library-empty";
                empty.textContent = "No grids or categories yet. Create a grid or category to get started.";
                fragment.appendChild(empty);
            }
        }

        const visibleGrids = selectedCategoryId === UNCATEGORIZED_ID
            ? grids.filter(grid => categoryIdsForGrid(grid).length === 0)
            : currentCategory
                ? grids.filter(grid => categoryIdsForGrid(grid).includes(String(currentCategory.id)))
                : [];
        if (currentCategory || selectedCategoryId === UNCATEGORIZED_ID) {
            if (visibleGrids.length) {
                for (const grid of visibleGrids) fragment.appendChild(createGridElement(grid, categories));
            } else {
                const empty = document.createElement("div");
                empty.className = "library-empty";
                empty.textContent = currentCategory && categories.some(category => String(category.parentId) === String(currentCategory.id))
                    ? "No grids assigned directly to this category yet."
                    : "No grids in this category yet.";
                fragment.appendChild(empty);
            }
        }
        libraryContent.replaceChildren(fragment);
    } catch (error) {
        console.error("Failed to render library:", error);
        const empty = document.createElement("div");
        empty.className = "library-empty";
        empty.textContent = "Failed to load library. Please try again.";
        libraryContent.replaceChildren(empty);
    }
}

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
            selectedCategoryId = null;
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
