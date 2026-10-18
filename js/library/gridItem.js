// ========================================
// Grid Item Rendering
// ========================================

// Builds one grid row and its management actions.
// Dependencies are injected from library.js so library state stays centralized.

export function createGridElement(grid, categories, searchResult = false, dependencies) {
    const {
        makeActionButton,
        stopClick,
        getAllCategories,
        openCategorySelectionModal,
        moveGridToCategory,
        setGridCategories,
        renameGrid,
        deleteGrid,
        getGridSummaries,
        loadGrid,
        initializeHistory,
        appState,
        generateBoard,
        renderLibrary,
        updateCurrentGridName,
        showError,
        isLibrarySearchMode,
        setIsLibrarySearchMode,
        searchLibrary,
        librarySearchInput,
        setPendingExpandedCategoryIds,
        getLibraryContent
    } = dependencies;


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

        const openButton = makeActionButton(
            "Open / Select",
            "Open this grid"
        );
        openButton.addEventListener("click", event => {
            stopClick(event);
            element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        const moveButton = makeActionButton(
            "Edit Categories",
            "Add or remove category assignments"
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
                    title: `Edit Categories for "${grid.name || "Untitled Grid"}"`,
                    categories: allCategories,
                    multiSelect: true,
                    selectedIds: Array.isArray(grid.categoryIds)
                        ? grid.categoryIds
                        : grid.categoryId == null ? [] : [grid.categoryId],
                    onSave: async categoryIds => {
                        await setGridCategories(grid.id, categoryIds);
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

                    if (isLibrarySearchMode()) {
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

                    initializeHistory();
                    generateBoard();
                    updateCurrentGridName();
                }

                await renderLibrary();
            } catch (error) {
                showError("Failed to delete the grid.", error);
            }
        });

        actions.append(openButton, renameButton, deleteButton, moveButton);
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

            initializeHistory();
            generateBoard();
            updateCurrentGridName();

            if (searchResult) {
                // Leave search mode and restore the normal library.
                setIsLibrarySearchMode(false);

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

                setPendingExpandedCategoryIds(expandedIds);

                await renderLibrary();
                return;
            }

            getLibraryContent()?.querySelectorAll(".library-grid")
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
