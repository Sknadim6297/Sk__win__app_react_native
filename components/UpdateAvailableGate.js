import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadService } from '../services/api';
import { getAppBuildNumber, getAppVersion } from '../utils/appVersion';
import UpdateAvailableModal from './UpdateAvailableModal';

const DISMISS_KEY_PREFIX = '@warezone/update_dismissed:';

function dismissKey(version) {
  return `${DISMISS_KEY_PREFIX}${String(version || '').trim()}`;
}

/**
 * On app / PWA open: if a newer release exists and user hasn’t dismissed it, show soft update modal.
 */
export default function UpdateAvailableGate() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState(null);
  const currentVersion = getAppVersion();
  const currentBuild = getAppBuildNumber();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Let home/auth settle so the modal isn’t buried under splash on Android
      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;

      try {
        const data = await downloadService.checkUpdate(currentVersion, currentBuild);
        if (cancelled || !data?.updateAvailable || !data?.latest?.version) return;

        const dismissed = await AsyncStorage.getItem(dismissKey(data.latest.version));
        if (cancelled || dismissed === '1') return;

        setPayload({
          latest: data.latest,
          currentVersion: data.currentVersion || currentVersion,
        });
        setVisible(true);
      } catch (err) {
        if (__DEV__) {
          console.warn('[Update] check failed:', err?.message || err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentVersion, currentBuild]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    const version = payload?.latest?.version;
    if (!version) return;
    try {
      await AsyncStorage.setItem(dismissKey(version), '1');
    } catch {
      /* ignore */
    }
  }, [payload]);

  const onDownload = useCallback(async () => {
    const latest = payload?.latest;
    if (!latest) return;

    const isIos = Platform.OS === 'ios';
    const candidates = isIos
      ? [latest.websiteDownloadUrl, latest.downloadUrl]
      : [latest.downloadUrl, latest.websiteDownloadUrl];

    const url = candidates.find((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
    if (url) {
      try {
        await Linking.openURL(url);
      } catch {
        /* ignore */
      }
    }

    await dismiss();
  }, [payload, dismiss]);

  if (!payload) return null;

  return (
    <UpdateAvailableModal
      visible={visible}
      onClose={dismiss}
      onDownload={onDownload}
      latestVersion={payload.latest?.version}
      currentVersion={payload.currentVersion}
      releaseNotes={payload.latest?.releaseNotes}
      sizeLabel={payload.latest?.sizeLabel}
    />
  );
}
