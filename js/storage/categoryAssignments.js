// Backward-compatible category assignment helpers.
// Once categoryIds exists, it is authoritative; categoryId remains a legacy
// projection so older versions can still display the primary assignment.
export function getCategoryIds(grid) {
    if (Array.isArray(grid?.categoryIds)) {
        return [...new Set(grid.categoryIds
            .filter(id => id != null && String(id).length > 0)
            .map(String))];
    }
    return grid?.categoryId == null ? [] : [String(grid.categoryId)];
}

export function withCategoryAssignments(grid, categoryIds) {
    const normalized = [...new Set((categoryIds ?? [])
        .filter(id => id != null && String(id).length > 0)
        .map(String))];
    return { ...grid, categoryIds: normalized, categoryId: normalized[0] ?? null };
}
