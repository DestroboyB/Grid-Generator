// ========================================
// Category Hierarchy Helpers
// ========================================

export function getDescendantIds(categoryId, categories) {
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

export function getCategoryDepth(categoryId, categories) {
    if (categoryId == null) return 0;

    let current = categories.find(
        category => String(category.id) === String(categoryId)
    );

    if (!current) return 0;

    let depth = 0;
    const visited = new Set();

    while (current) {
        const currentId = String(current.id);

        if (visited.has(currentId)) return Infinity;

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

export function getSubtreeHeight(categoryId, categories, ancestors = new Set()) {
    const id = String(categoryId);

    if (ancestors.has(id)) return Infinity;

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(id);

    const children = categories.filter(
        category => String(category.parentId) === id
    );

    if (children.length === 0) return 1;

    return 1 + Math.max(
        ...children.map(child =>
            getSubtreeHeight(child.id, categories, nextAncestors)
        )
    );
}
