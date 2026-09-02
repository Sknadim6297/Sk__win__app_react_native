import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { PAGE } from '../styles/pageTheme';

/**
 * Pull-to-refresh helper for ScrollView / FlatList.
 * Pass a reload fn; optional `{ silent: true }` avoids full-page loaders.
 */
export function usePullToRefresh(reload, options = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const tint = options.tintColor ?? PAGE.cyan;

  const onRefresh = useCallback(async () => {
    if (!reload) return;
    setRefreshing(true);
    try {
      await Promise.resolve(reload({ silent: true }));
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={tint}
        colors={[tint]}
        progressBackgroundColor={options.progressBackgroundColor ?? '#141C2B'}
      />
    ),
    [refreshing, onRefresh, tint, options.progressBackgroundColor]
  );

  return { refreshing, onRefresh, refreshControl };
}
