/**
 * Shared FlatList defaults for smoother scrolling and lower memory.
 * Spread into FlatList props; callers can override any field.
 */
export const LIST_PERF = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  windowSize: 7,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
};

export default LIST_PERF;
