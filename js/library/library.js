
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

import { appState } from "../state.js";
import { generateBoard } from "../board.js";


// ========================================
// Library Elements
// ========================================

const libraryButton = document.getElementById("libraryButton");
const libraryPanel = document.getElementById("libraryPanel");
const libraryOverlay = document.getElementById("libraryOverlay");
const libraryCloseButton = document.getElementById("libraryCloseButton");
const libraryContent = document.getElementById("libraryContent");
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


// ========================================
// Expansion State
// ========================================

// null means the library has never rendered successfully.
// An empty Set means the library has rendered and every category
// was intentionally collapsed.
let hasRenderedLibrary = false;


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
    alert(message);
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
// Reusable Custom Modal
// ========================================

function createModal(title) {
    const modal = document.createElement("div");
    modal.className = "library-modal open";
    modal.setAttribute("aria-hidden", "false");

    const content = document.createElement("div");
    content.className = "library-modal-content";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const actions = document.createElement("div");
    actions.className = "library-modal-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";

    actions.append(cancelButton, saveButton);
    content.append(heading, actions);
    modal.appendChild(content);
    document.body.appendChild(modal);

    let closed = false;

    function close() {
        if (closed) return;

        closed = true;
        modal.remove();
        document.removeEventListener("keydown", handleKeydown);
    }

    function handleKeydown(event) {
        if (event.key === "Escape" && !closed) {
            event.preventDefault();
            close();
        }
    }

    cancelButton.addEventListener("click", close);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            close();
        }
    });

    document.addEventListener("keydown", handleKeydown);

    return {
        modal,
        content,
        actions,
        saveButton,
        cancelButton,
        close,
        get closed() {
            return closed;
        }
    };
}


// ========================================
// Category Name Modal
// ========================================

function openCategoryNameModal({
    title,
    initialName = "",
    onSave
}) {
    const dialog = createModal(title);

    const label = document.createElement("label");
    label.textContent = "Category name";

    const input = document.createElement("input");
    input.type = "text";
    input.value = initialName;
    input.placeholder = "Enter category name";
    input.setAttribute("aria-label", "Category name");

    dialog.content.insertBefore(label, dialog.actions);
    dialog.content.insertBefore(input, dialog.actions);

    async function save() {
        if (dialog.closed || dialog.saveButton.disabled) return;

        const value = input.value.trim();

        if (!value) {
            alert("Category name cannot be empty.");
            input.focus();
            return;
        }

        dialog.saveButton.disabled = true;
        dialog.cancelButton.disabled = true;

        try {
            await onSave(value);
            dialog.close();
        } catch (error) {
            console.error("Category operation failed:", error);
            alert("The category operation failed. Please try again.");

            dialog.saveButton.disabled = false;
            dialog.cancelButton.disabled = false;
            input.focus();
        }
    }

    dialog.saveButton.addEventListener("click", save);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            save();
        }
    });

    input.focus();
    input.select();
}


// ========================================
// Category Destination Modal
// ========================================

function openCategorySelectionModal({
    title,
    categories,
    selectedId = null,
    excludedIds = new Set(),
    allowRoot = true,
    rootLabel = "Root / Uncategorized",
    onSave
}) {
    const dialog = createModal(title);

    const label = document.createElement("label");
    label.textContent = "Destination category";

    const select = document.createElement("select");
    select.setAttribute("aria-label", "Destination category");
    select.style.width = "100%";

    if (allowRoot) {
        const rootOption = document.createElement("option");
        rootOption.value = "";
        rootOption.textContent = rootLabel;
        rootOption.selected = selectedId == null;

        select.appendChild(rootOption);
    }

    const available = categories.filter(
        category => !excludedIds.has(String(category.id))
    );

    // Display categories in hierarchy order.
    function appendOptions(
        parentId = null,
        depth = 0,
        visited = new Set()
    ) {
        const children = available
            .filter(category =>
                (category.parentId ?? null) === parentId
            )
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const category of children) {
            const categoryId = String(category.id);

            if (visited.has(categoryId)) continue;

            const nextVisited = new Set(visited);
            nextVisited.add(categoryId);

            const option = document.createElement("option");
            option.value = categoryId;
            option.textContent =
                `${"— ".repeat(depth)}${category.name}`;

            option.selected =
                selectedId != null &&
                categoryId === String(selectedId);

            select.appendChild(option);

            appendOptions(
                category.id,
                depth + 1,
                nextVisited
            );
        }
    }

    appendOptions();

    if (select.options.length === 0) {
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "No categories available";

        select.appendChild(emptyOption);
        select.disabled = true;
        dialog.saveButton.disabled = true;
    }

    dialog.content.insertBefore(label, dialog.actions);
    dialog.content.insertBefore(select, dialog.actions);

    dialog.saveButton.textContent = "Move";

    async function save() {
        if (dialog.closed || dialog.saveButton.disabled) return;

        const destinationId = select.value || null;

        dialog.saveButton.disabled = true;
        dialog.cancelButton.disabled = true;

        try {
            await onSave(destinationId);
            dialog.close();
        } catch (error) {
            console.error("Move operation failed:", error);
            alert(error.message || "The move failed. Please try again.");

            dialog.saveButton.disabled = false;
            dialog.cancelButton.disabled = false;
        }
    }

    dialog.saveButton.addEventListener("click", save);

    select.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            save();
        }
    });

    select.focus();
}


// ========================================
// Category Hierarchy Helpers
// ========================================

function getDescendantIds(categoryId, categories) {
    const descendants = new Set();
    const pending = [String(categoryId)];

    while (pending.length > 0) {
        const currentId = pending.pop();

        for (const category of categories) {
            const id = String(category.id);
            const parentId = category.parentId == null
                ? null
                : String(category.parentId);

            if (
                parentId === currentId &&
                !descendants.has(id)
            ) {
                descendants.add(id);
                pending.push(id);
            }
        }
    }

    return descendants;
}


// Top-level categories are depth 1.
// A missing category or root destination has depth 0.
function getCategoryDepth(categoryId, categories) {
    if (categoryId == null) return 0;

    let current = categories.find(
        category => String(category.id) === String(categoryId)
    );

    if (!current) return 0;

    let depth = 0;
    const visited = new Set();

    while (current) {
        const currentId = String(current.id);

        if (visited.has(currentId)) {
            return Infinity;
        }

        visited.add(currentId);
        depth++;

        if (current.parentId == null) break;

        current = categories.find(
            category =>
                String(category.id) === String(current.parentId)
        );
    }

    return depth;
}


// Returns the number of levels in a category's subtree.
function getSubtreeHeight(categoryId, categories, ancestors = new Set()) {
    const id = String(categoryId);

    if (ancestors.has(id)) {
        return Infinity;
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(id);

    const children = categories.filter(
        category => String(category.parentId) === id
    );

    if (children.length === 0) {
        return 1;
    }

    return 1 + Math.max(
        ...children.map(child =>
            getSubtreeHeight(
                child.id,
                categories,
                nextAncestors
            )
        )
    );
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
// Render Library
// ========================================

export async function renderLibrary() {
    if (!libraryContent) return;

    // Capture expansion state before rebuilding the DOM.
    // null means this is the first successful render.
    const expandedCategories = hasRenderedLibrary
        ? getExpandedCategoryIds()
        : null;

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

            for (const category of rootCategories) {
                fragment.appendChild(
                    createCategoryElement(
                        category,
                        categories,
                        grids,
                        new Set(),
                        1,
                        expandedCategories
                    )
                );
            }

            // Show grids that aren't assigned to a category.
            const uncategorized = grids.filter(
                grid => grid.categoryId == null
            );

            for (const grid of uncategorized) {
                fragment.appendChild(
                    createGridElement(grid, categories)
                );
            }

            // Recover orphaned categories whose parent is missing.
            const orphanCategories = categories.filter(category =>
                category.parentId != null &&
                !categories.some(
                    parent =>
                        String(parent.id) === String(category.parentId)
                )
            );

            for (const category of orphanCategories) {
                fragment.appendChild(
                    createCategoryElement(
                        category,
                        categories,
                        grids,
                        new Set(),
                        1,
                        expandedCategories
                    )
                );
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

function createCategoryElement(
    category,
    categories,
    grids,
    ancestors = new Set(),
    depth = 1,
    expandedCategories = null
) {
    const wrapper = document.createElement("div");
    wrapper.className = "library-category";
    wrapper.dataset.categoryId = String(category.id);

    const categoryId = String(category.id);

    if (ancestors.has(categoryId)) {
        const warning = document.createElement("div");
        warning.className = "library-empty";
        warning.textContent = "Invalid category hierarchy.";

        wrapper.appendChild(warning);
        return wrapper;
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(categoryId);

    // On first render, expand top-level categories only.
    // On later renders, restore each category's exact prior state.
    const shouldExpand = expandedCategories === null
        ? depth === 1
        : expandedCategories.has(categoryId);

    if (!shouldExpand) {
        wrapper.classList.add("collapsed");
    }

    const header = document.createElement("div");
    header.className = "library-category-header";

    const main = document.createElement("div");
    main.className = "library-category-main";

    const arrow = document.createElement("span");
    arrow.className = "library-category-arrow";
    arrow.textContent = shouldExpand ? "▼" : "▶";

    const name = document.createElement("span");
    name.className = "library-category-name";
    name.textContent = category.name;

    main.append(arrow, name);

    const actions = document.createElement("div");
    actions.className = "library-category-actions";

    // Limit the hierarchy to three levels.
    const addSubcategoryButton = depth < 3
        ? makeActionButton(
            "+ Subcategory",
            "Create a subcategory",
            "library-category-action"
        )
        : null;

    const renameButton = makeActionButton(
        "Rename",
        "Rename this category",
        "library-category-action"
    );

    const moveButton = makeActionButton(
        "Move",
        "Move this category",
        "library-category-action"
    );

    const deleteButton = makeActionButton(
        "Delete",
        "Delete this category",
        "delete library-category-action"
    );

    if (addSubcategoryButton) {
        actions.appendChild(addSubcategoryButton);
    }

    actions.append(
        renameButton,
        moveButton,
        deleteButton
    );

    header.append(main, actions);

    const children = document.createElement("div");
    children.className = "library-category-children";

    const childCategories = categories.filter(
        child => String(child.parentId) === categoryId
    );

    const categoryGrids = grids.filter(
        grid => String(grid.categoryId) === categoryId
    );

    // Render direct grids and child categories.
    // The category's expansion state controls visibility of both.
    for (const grid of categoryGrids) {
        children.appendChild(
            createGridElement(grid, categories)
        );
    }

    for (const child of childCategories) {
        children.appendChild(
            createCategoryElement(
                child,
                categories,
                grids,
                nextAncestors,
                depth + 1,
                expandedCategories
            )
        );
    }

    wrapper.append(header, children);

    // Expand or collapse this category without changing its descendants'
    // individual expansion states.
    main.addEventListener("click", () => {
        const isOpen = !wrapper.classList.contains("collapsed");

        wrapper.classList.toggle("collapsed", isOpen);
        arrow.textContent = isOpen ? "▶" : "▼";
    });

    // Create Subcategory
    addSubcategoryButton?.addEventListener("click", event => {
        stopClick(event);

        openCategoryNameModal({
            title: `Create Subcategory in "${category.name}"`,
            onSave: async subcategoryName => {
                await createCategory(
                    subcategoryName,
                    category.id
                );

                await renderLibrary();
            }
        });
    });

    // Rename Category
    renameButton.addEventListener("click", event => {
        stopClick(event);

        openCategoryNameModal({
            title: "Rename Category",
            initialName: category.name,
            onSave: async newName => {
                const renamed = await renameCategory(
                    category.id,
                    newName
                );

                if (!renamed) {
                    throw new Error("Category not found.");
                }

                await renderLibrary();
            }
        });
    });

    // Move Category
    moveButton.addEventListener("click", async event => {
        stopClick(event);

        try {
            const allCategories = await getAllCategories();

            const excludedIds = new Set([
                categoryId,
                ...getDescendantIds(category.id, allCategories)
            ]);

            const subtreeHeight = getSubtreeHeight(
                category.id,
                allCategories
            );

            // A destination must not be the category itself or a descendant,
            // and the move must not create a hierarchy deeper than 3 levels.
            const validDestinations = allCategories.filter(destination => {
                const destinationId = String(destination.id);

                if (excludedIds.has(destinationId)) {
                    return false;
                }

                const destinationDepth = getCategoryDepth(
                    destination.id,
                    allCategories
                );

                return destinationDepth + subtreeHeight <= 3;
            });

            openCategorySelectionModal({
                title: `Move "${category.name}"`,
                categories: validDestinations,
                selectedId: category.parentId ?? null,
                excludedIds,
                allowRoot: true,
                rootLabel: "Root category",
                onSave: async destinationId => {
                    if (destinationId != null) {
                        const latestCategories = await getAllCategories();

                        const latestExcludedIds = new Set([
                            categoryId,
                            ...getDescendantIds(
                                category.id,
                                latestCategories
                            )
                        ]);

                        if (latestExcludedIds.has(String(destinationId))) {
                            throw new Error(
                                "A category cannot be moved inside itself."
                            );
                        }

                        const latestHeight = getSubtreeHeight(
                            category.id,
                            latestCategories
                        );

                        const destinationDepth = getCategoryDepth(
                            destinationId,
                            latestCategories
                        );

                        if (destinationDepth + latestHeight > 3) {
                            throw new Error(
                                "Categories cannot be nested deeper than three levels."
                            );
                        }
                    }

                    await moveCategory(
                        category.id,
                        destinationId
                    );

                    await renderLibrary();
                }
            });
        } catch (error) {
            showError("Failed to move the category.", error);
        }
    });

    // Delete Category
    deleteButton.addEventListener("click", async event => {
        stopClick(event);

        const confirmed = confirm(
            `Delete "${category.name}"?\n\n` +
            "Grids assigned directly to it will become uncategorized. " +
            "Its immediate subcategories will move to its parent.\n\n" +
            "This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            await deleteCategory(category.id);
            await renderLibrary();
        } catch (error) {
            showError("Failed to delete the category.", error);
        }
    });

    return wrapper;
}


// ========================================
// Create Grid Element
// ========================================

function createGridElement(grid, categories) {
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

    // Move Grid
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
                    await moveGridToCategory(
                        grid.id,
                        destinationId
                    );

                    await renderLibrary();
                }
            });
        } catch (error) {
            showError("Failed to move the grid.", error);
        }
    });

    // Rename Grid — Inline Editing
    renameButton.addEventListener("click", event => {
        stopClick(event);

        if (element.querySelector(".library-grid-rename-input")) {
            return;
        }

        const input = document.createElement("input");
        input.type = "text";
        input.className = "library-grid-rename-input";
        input.value = grid.name || "Untitled Grid";
        input.setAttribute("aria-label", "New grid name");

        const saveButton = makeActionButton(
            "Save",
            "Save grid name"
        );

        const cancelButton = makeActionButton(
            "Cancel",
            "Cancel renaming"
        );

        function cleanupRename() {
            if (input.isConnected) {
                input.replaceWith(name);
            }

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
                const renamedGrid = await renameGrid(
                    grid.id,
                    newName
                );

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
            stopClick(event);
            finishRename(true);
        });

        cancelButton.addEventListener("click", event => {
            stopClick(event);
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

    // Delete Grid
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

    // Load Grid
    element.addEventListener("click", async event => {
        // Ignore clicks on action controls and inline editors.
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

            libraryContent?.querySelectorAll(".library-grid")
                .forEach(item => {
                    item.classList.toggle(
                        "active",
                        item.dataset.gridId ===
                            String(appState.currentGridId)
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
    const name =
        newGridNameInput?.value.trim() || "Untitled Grid";

    try {
        const grid = await createGrid({ name });

        applyGridData(grid);
        generateBoard();
        updateCurrentGridName();

        closeNewGridModal();
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
        libraryPanel?.classList.contains("open")
    ) {
        closeLibrary();
    }
});
