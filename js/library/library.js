
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
    setGridCategories,
    deleteCategory
} from "../storage/categories.js";

import { createGridElement as buildGridElement } from "./gridItem.js";

import {
    getDescendantIds,
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

const gridElementDependencies = {
    makeActionButton,
    stopClick,
    getAllCategories,
    openCategorySelectionModal,
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
    recordGridSelection: (gridId, assignments) => {
        const selectedId = selectedCategoryId;
        if (selectedId != null && selectedId !== UNCATEGORIZED_ID &&
            assignments.map(String).includes(String(selectedId))) {
            lastSelectedCategoryByGrid.set(String(gridId), String(selectedId));
        }
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
    getLibraryContent: () => libraryContent
};

// ========================================
// Expansion State
// ========================================

let hasRenderedLibrary = false;
let isLibrarySearchMode = false;

// ========================================
// General Helpers
// ========================================

function updateCurrentGridName() {
    if (!currentGridName || currentGridName.querySelector("input")) return;
    currentGridName.textContent = appState.currentGridName || "Untitled Grid";
}

function beginCurrentGridRename() {
    if (!currentGridName || currentGridName.querySelector("input")) return;
    const gridId = appState.currentGridId;
    if (gridId == null) return;
    const originalName = appState.currentGridName || "Untitled Grid";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "current-grid-name-input";
    input.value = originalName;
    input.setAttribute("aria-label", "Rename current grid");
    currentGridName.replaceChildren(input);
    currentGridName.classList.add("renaming");
    input.focus();
    input.select();
    let finished = false;

    function finish(cancel = false) {
        if (finished) return;
        if (cancel) {
            finished = true;
            currentGridName.classList.remove("renaming");
            currentGridName.textContent = originalName;
            return;
        }
        const nextName = input.value.trim();
        if (!nextName) {
            alert("Grid name cannot be empty.");
            input.focus();
            return;
        }
        finished = true;
        input.disabled = true;
        renameGrid(gridId, nextName).then(renamedGrid => {
            if (!renamedGrid) throw new Error("This grid could not be found.");
            appState.currentGridName = renamedGrid.name;
            currentGridName.classList.remove("renaming");
            currentGridName.textContent = renamedGrid.name;
            return renderLibrary();
        }).catch(error => {
            finished = false;
            input.disabled = false;
            alert(error?.message || "Failed to rename the grid. Please try again.");
            input.focus();
            input.select();
        });
    }
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            finish();
        } else if (event.key === "Escape") {
            event.preventDefault();
            finish(true);
        }
    });
    input.addEventListener("blur", () => finish());
    input.addEventListener("click", event => event.stopPropagation());
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
    const wrapper = document.createElement("div");
    wrapper.className = "library-category-selector";
    const label = document.createElement("span");
    label.className = "library-category-selector-caption";
    label.textContent = "Category";
    const trigger = makeLibraryButton("", "library-category-selector-trigger");
    trigger.setAttribute("aria-label", "Choose category");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");

    const selectedCategory = selectedCategoryId == null || selectedCategoryId === UNCATEGORIZED_ID
        ? null : categoryById(categories, selectedCategoryId);
    const selectedLabel = selectedCategory ? getCategoryPath(categories, selectedCategory)
        : selectedCategoryId === UNCATEGORIZED_ID ? "Uncategorized" : "Top-level categories";
    const selectedText = document.createElement("span");
    selectedText.className = "library-category-selector-value";
    selectedText.textContent = selectedLabel;
    const chevron = document.createElement("span");
    chevron.className = "library-category-selector-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "▾";
    trigger.append(selectedText, chevron);

    let popup = null;
    let navigationParentId = selectedCategory
        ? (selectedCategory.parentId == null ? null : String(selectedCategory.parentId)) : null;
    let cleanupPopupListeners = () => {};

    function childrenOf(parentId) {
        return categories.filter(category =>
            (category.parentId == null ? null : String(category.parentId)) === parentId
        ).sort((x, y) => x.name.localeCompare(y.name));
    }
    function closePopup() {
        popup?.remove();
        popup = null;
        trigger.setAttribute("aria-expanded", "false");
        cleanupPopupListeners();
        cleanupPopupListeners = () => {};
    }
    function selectCategory(categoryId) {
        rememberCategoryForCurrentGrid(categoryId, grids);
        closePopup();
        renderLibrary();
    }
    function renderPopup() {
        if (!popup) return;
        popup.replaceChildren();
        const header = document.createElement("div");
        header.className = "library-category-popup-header";
        if (navigationParentId != null) {
            const back = makeLibraryButton("← Back", "library-category-popup-back");
            back.addEventListener("click", () => {
                const currentParent = categoryById(categories, navigationParentId);
                navigationParentId = currentParent?.parentId == null
                    ? null : String(currentParent.parentId);
                renderPopup();
            });
            header.appendChild(back);
        }
        const context = document.createElement("div");
        context.className = "library-category-popup-context";
        context.textContent = navigationParentId == null ? "All categories"
            : getCategoryPath(categories, categoryById(categories, navigationParentId));
        header.appendChild(context);
        popup.appendChild(header);

        const list = document.createElement("div");
        list.className = "library-category-popup-list";
        if (navigationParentId == null) {
            const uncategorized = makeLibraryButton("", "library-category-popup-item");
            const uncategorizedName = document.createElement("span");
            uncategorizedName.textContent = "Uncategorized";
            uncategorized.appendChild(uncategorizedName);
            if (selectedCategoryId === UNCATEGORIZED_ID) uncategorized.classList.add("selected");
            uncategorized.addEventListener("click", () => selectCategory(UNCATEGORIZED_ID));
            list.appendChild(uncategorized);
        }
        const children = childrenOf(navigationParentId);
        for (const category of children) {
            const id = String(category.id);
            const row = document.createElement("div");
            row.className = "library-category-popup-row";
            const choose = makeLibraryButton("", "library-category-popup-item");
            const name = document.createElement("span");
            name.className = "library-category-popup-item-name";
            name.textContent = category.name;
            choose.appendChild(name);
            if (String(selectedCategoryId) === id) choose.classList.add("selected");
            choose.setAttribute("aria-label", `Show grids in ${category.name}`);
            choose.addEventListener("click", () => selectCategory(id));
            row.appendChild(choose);
            if (childrenOf(id).length) {
                const drill = makeLibraryButton("›", "library-category-popup-drill");
                drill.setAttribute("aria-label", `Browse subcategories of ${category.name}`);
                drill.addEventListener("click", () => {
                    navigationParentId = id;
                    renderPopup();
                });
                row.appendChild(drill);
            }
            list.appendChild(row);
        }
        if (!children.length && navigationParentId != null) {
            const empty = document.createElement("div");
            empty.className = "library-category-popup-empty";
            empty.textContent = "No subcategories";
            list.appendChild(empty);
        }
        popup.appendChild(list);
    }
    trigger.addEventListener("click", event => {
        event.stopPropagation();
        if (popup) { closePopup(); return; }
        navigationParentId = selectedCategory
            ? (selectedCategory.parentId == null ? null : String(selectedCategory.parentId)) : null;
        popup = document.createElement("div");
        popup.className = "library-category-popup";
        popup.setAttribute("role", "dialog");
        popup.setAttribute("aria-label", "Category navigation");
        wrapper.appendChild(popup);
        trigger.setAttribute("aria-expanded", "true");
        renderPopup();
        const dismiss = event => { if (!wrapper.contains(event.target)) closePopup(); };
        const onKeydown = event => {
            if (event.key === "Escape" && popup) { closePopup(); trigger.focus(); }
        };
        document.addEventListener("pointerdown", dismiss, true);
        document.addEventListener("keydown", onKeydown, true);
        cleanupPopupListeners = () => {
            document.removeEventListener("pointerdown", dismiss, true);
            document.removeEventListener("keydown", onKeydown, true);
        };
    });
    wrapper.append(label, trigger);
    parent.appendChild(wrapper);
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
                const parentId = currentCategory.parentId == null ? null : String(currentCategory.parentId);
                rememberCategoryForCurrentGrid(parentId, grids);
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

if (currentGridName) {
    currentGridName.setAttribute("role", "button");
    currentGridName.setAttribute("tabindex", "0");
    currentGridName.setAttribute("title", "Click to rename current grid");
    currentGridName.setAttribute("aria-label", "Rename current grid");
    currentGridName.addEventListener("click", beginCurrentGridRename);
    currentGridName.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && !currentGridName.querySelector("input")) {
            event.preventDefault();
            beginCurrentGridRename();
        }
    });
}

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
