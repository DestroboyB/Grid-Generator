// ========================================
// Library Modal Helpers
// ========================================

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

export function openCategoryNameModal({
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
            alert(
                error.message ||
                "The category operation failed. Please try again."
            );

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

export function openCategorySelectionModal({
    title,
    categories,
    selectedId = null,
    excludedIds = new Set(),
    allowRoot = true,
    rootLabel = "Root / Uncategorized",
    multiSelect = false,
    selectedIds = [],
    onSave
}) {
    const dialog = createModal(title);

    const label = document.createElement("label");
    label.textContent = multiSelect ? "Assign to categories" : "Destination category";

    const select = document.createElement(multiSelect ? "div" : "select");
    select.setAttribute("aria-label", label.textContent);
    select.style.width = "100%";

    if (allowRoot && !multiSelect) {
        const rootOption = document.createElement("option");
        rootOption.value = "";
        rootOption.textContent = rootLabel;
        rootOption.selected = selectedId == null;
        select.appendChild(rootOption);
    }

    const available = categories.filter(
        category => !excludedIds.has(String(category.id))
    );

    function appendOptions(parentId = null, depth = 0, visited = new Set()) {
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

            if (multiSelect) {
                const item = document.createElement("label");
                item.className = "library-category-checkbox";
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = categoryId;
                checkbox.checked = selectedIds.map(String).includes(categoryId);
                checkbox.setAttribute("aria-label", category.name);
                const text = document.createElement("span");
                text.textContent = `${"— ".repeat(depth)}${category.name}`;
                item.append(checkbox, text);
                select.appendChild(item);
            } else {
                const option = document.createElement("option");
                option.value = categoryId;
                option.textContent = `${"— ".repeat(depth)}${category.name}`;
                option.selected = selectedId != null && categoryId === String(selectedId);
                select.appendChild(option);
            }
            appendOptions(category.id, depth + 1, nextVisited);
        }
    }

    appendOptions();

    if (multiSelect && available.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No categories available. Create a category first.";
        select.appendChild(empty);
        dialog.saveButton.disabled = true;
    } else if (!multiSelect && select.options.length === 0) {
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

        const destination = multiSelect
            ? Array.from(select.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value)
            : (select.value || null);

        dialog.saveButton.disabled = true;
        dialog.cancelButton.disabled = true;

        try {
            await onSave(destination);
            dialog.close();
        } catch (error) {
            console.error("Category assignment operation failed:", error);
            alert(error.message || "The category operation failed. Please try again.");

            dialog.saveButton.disabled = false;
            dialog.cancelButton.disabled = false;
        }
    }

    dialog.saveButton.addEventListener("click", save);

    select.addEventListener("keydown", event => {
        if (event.key === "Enter" && !multiSelect) {
            event.preventDefault();
            save();
        }
    });

    if (multiSelect) select.querySelector("input")?.focus();
    else select.focus();
}
