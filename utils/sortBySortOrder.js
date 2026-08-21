/**
 * Lower sortOrder shows first (0 = first). Stable tie-breakers: name, then id.
 */
export function sortBySortOrder(items = []) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const ao = Number(a?.sortOrder);
    const bo = Number(b?.sortOrder);
    const aOrder = Number.isFinite(ao) ? ao : 0;
    const bOrder = Number.isFinite(bo) ? bo : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const an = String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
    });
    if (an !== 0) return an;
    return String(a?._id || a?.id || '').localeCompare(String(b?._id || b?.id || ''));
  });
}
