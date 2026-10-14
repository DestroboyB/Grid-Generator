// ========================================
// Category Item Rendering
// ========================================

// Builds one category row, its action buttons, its grids, and nested categories.
// Dependencies are injected from library.js to keep storage and library state centralized.

export function createCategoryElement(
    category,
    categories,
    grids,
    ancestors = new Set(),
    depth = 1,
    expandedCategories = null,
    dependencies
) {
    const {
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
        renderLibrary,
        showError,
        createGridElement
    } = dependencies;
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

    actions.append(renameButton, moveButton, deleteButton);
    header.append(main, actions);

    const children = document.createElement("div");
    children.className = "library-category-children";

    const childCategories = categories.filter(
        child => String(child.parentId) === categoryId
    );

    const categoryGrids = grids.filter(
        grid => String(grid.categoryId) === categoryId
    );

    for (const grid of categoryGrids) {
        children.appendChild(createGridElement(grid, categories));
    }

    for (const child of childCategories) {
        children.appendChild(
            createCategoryElement(
                child,
                categories,
                grids,
                nextAncestors,
                depth + 1,
                expandedCategories,
                dependencies
            )
        );
    }

    wrapper.append(header, children);

    main.addEventListener("click", () => {
        const isOpen = !wrapper.classList.contains("collapsed");

        wrapper.classList.toggle("collapsed", isOpen);
        arrow.textContent = isOpen ? "▶" : "▼";
    });

    addSubcategoryButton?.addEventListener("click", event => {
        stopClick(event);

        openCategoryNameModal({
            title: `Create Subcategory in "${category.name}"`,
            onSave: async subcategoryName => {
                await createCategory(subcategoryName, category.id);
                await renderLibrary();
            }
        });
    });

    renameButton.addEventListener("click", event => {
        stopClick(event);

        openCategoryNameModal({
            title: "Rename Category",
            initialName: category.name,
            onSave: async newName => {
                const renamed = await renameCategory(category.id, newName);

                if (!renamed) {
                    throw new Error("Category not found.");
                }

                await renderLibrary();
            }
        });
    });

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

            const validDestinations = allCategories.filter(destination => {
                if (excludedIds.has(String(destination.id))) return false;

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
                            ...getDescendantIds(category.id, latestCategories)
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

                    await moveCategory(category.id, destinationId);
                    await renderLibrary();
                }
            });
        } catch (error) {
            showError("Failed to move the category.", error);
        }
    });

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
