import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const display = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const ios = window.navigator?.standalone === true;
  return Boolean(display || ios);
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function PwaChrome() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [installEvent, setInstallEvent] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener('beforeinstallprompt', onInstall);

    if (!isStandalone() && isIosSafari()) {
      setShowIosHint(true);
    }

    // Auto-apply new PWA deploys: when a new service worker takes control, reload once.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    let updateTimer = null;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        const askUpdate = () => {
          try {
            reg.update();
          } catch {
            /* ignore */
          }
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };
        askUpdate();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
        updateTimer = setInterval(askUpdate, 60_000);
      });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstall);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
      if (updateTimer) clearInterval(updateTimer);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  const showInstall = !dismissed && !isStandalone() && (installEvent || showIosHint);

  const install = async () => {
    if (installEvent?.prompt) {
      installEvent.prompt();
      try {
        await installEvent.userChoice;
      } catch {
        /* ignore */
      }
      setInstallEvent(null);
      setDismissed(true);
      return;
    }
    setDismissed(true);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top, 8) }]}>
      {offline ? (
        <View style={styles.offline}>
          <Text style={styles.offlineTitle}>You are offline</Text>
          <Text style={styles.offlineBody}>
            Tournament, wallet, and results data stay live from the server. Reconnect to play.
          </Text>
        </View>
      ) : null}

      {showInstall ? (
        <View style={styles.install}>
          <View style={styles.installCopy}>
            <Text style={styles.installTitle}>Use WAREZONE like an app</Text>
            <Text style={styles.installBody}>
              {installEvent
                ? 'Install the web app on this device. This is not an App Store listing.'
                : 'First open https://sk-win-pwa.onrender.com/login in Safari. When you see Login / Get Started, tap Share → Add to Home Screen. Do not add the Download page.'}
            </Text>
          </View>
          <View style={styles.installActions}>
            {installEvent ? (
              <TouchableOpacity style={styles.primary} onPress={install} activeOpacity={0.85}>
                <Text style={styles.primaryText}>Install</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={8}>
              <Text style={styles.dismiss}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 80,
    gap: 8,
  },
  offline: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  offlineTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  offlineBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  install: {
    backgroundColor: '#121B33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.35)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  installCopy: { flex: 1 },
  installTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  installBody: {
    color: '#B8C5D9',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  installActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  primary: {
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  dismiss: {
    color: '#8B9BB5',
    fontSize: 12,
    fontWeight: '700',
  },
});
