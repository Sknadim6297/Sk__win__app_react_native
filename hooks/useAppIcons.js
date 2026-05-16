import { useCallback, useEffect, useState } from 'react';
import { configService } from '../services/api';
import { EMPTY_APP_ICONS } from '../constants/appIconSlots';

export function useAppIcons(autoLoad = true) {
  const [appIcons, setAppIcons] = useState(EMPTY_APP_ICONS);
  const [loading, setLoading] = useState(autoLoad);

  const loadIcons = useCallback(async () => {
    try {
      const home = await configService.getHome();
      setAppIcons({ ...EMPTY_APP_ICONS, ...(home?.appIcons || {}) });
    } catch {
      setAppIcons(EMPTY_APP_ICONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) loadIcons();
  }, [autoLoad, loadIcons]);

  return { appIcons, loading, reloadIcons: loadIcons };
}
