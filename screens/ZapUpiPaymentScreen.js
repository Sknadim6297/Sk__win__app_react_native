import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Linking,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import { paymentService } from '../services/api';
import { navigateAfterWalletTopup } from '../utils/walletFlow';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';

const POLL_MS = 2500;
const AUTO_CONTINUE_SEC = 3;

const UPI_PREFIXES = [
  'upi://',
  'paytmmp://',
  'phonepe://',
  'gpay://',
  'tez://',
  'intent://',
  'bhim://',
  'ppe://',
];

/** Detect ZapUPI success modal in-page (before redirect) so we can hide their UI. */
const SUCCESS_WATCH_JS = `
(function() {
  if (window.__wzZapWatch) return true;
  window.__wzZapWatch = true;
  var sent = false;
  function check() {
    try {
      var t = (document.body && document.body.innerText) || '';
      if (!sent && /Payment\\s+Successful/i.test(t)) {
        sent = true;
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'zap_gateway_success' })
        );
      }
    } catch (e) {}
  }
  check();
  setInterval(check, 400);
  return true;
})();
true;
`;

function detectZapOutcome(url) {
  const u = String(url || '');
  if (!u) return null;
  if (u.includes('zapupi.com/payment?s=s') || /[?&]s=s(?:&|$)/.test(u)) return 'success';
  if (u.includes('zapupi.com/payment?s=f') || /[?&]s=f(?:&|$)/.test(u)) return 'failed';
  if (u.includes('zapupi.com/payment?s=t') || /[?&]s=t(?:&|$)/.test(u)) return 'timeout';
  try {
    const host = String(new URL(u).hostname || '').toLowerCase();
    if (
      (host === 'zapupi.com' || host === 'www.zapupi.com') &&
      !u.includes('/sandbox-pay') &&
      !u.includes('/api/')
    ) {
      return 'success';
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isUpiUrl(url) {
  const u = String(url || '').toLowerCase();
  return UPI_PREFIXES.some((p) => u.startsWith(p));
}

function formatPaidAt(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function DetailRow({ label, value, last }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

/**
 * Opens ZapUPI payment_url in-app.
 * On gateway success we hide their WebView modal and show ONE WAREZONE success card.
 * Wallet / join only after backend confirms.
 */
export default function ZapUpiPaymentScreen({ navigation, route }) {
  const {
    purpose: purposeParam,
    amount: amountParam,
    tournamentId,
    tournamentName,
    joinKind = 'solo',
    gamingUsername,
    gamingUID,
    teamName,
    teamSide,
    slotNumber,
    players,
    returnToTournamentId,
    returnScreen = 'TournamentDetails',
    pendingJoin,
    walletBalance,
  } = route.params || {};

  const purpose = purposeParam || (tournamentId ? 'tournament_entry' : 'wallet_topup');
  const isJoin = purpose === 'tournament_entry';
  const amount = Number(amountParam || 0);

  const [phase, setPhase] = useState('CREATING');
  const [orderId, setOrderId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [message, setMessage] = useState(
    isJoin ? 'Creating ZapUPI order…' : 'Creating payment…'
  );
  const [errorCode, setErrorCode] = useState(null);
  const [creating, setCreating] = useState(false);
  const [balance, setBalance] = useState(walletBalance);
  const [txnId, setTxnId] = useState(null);
  const [utr, setUtr] = useState(null);
  const [paidAt, setPaidAt] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const pollRef = useRef(null);
  const doneRef = useRef(false);
  const outcomeRef = useRef(null);
  const successScale = useRef(new Animated.Value(0.85)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const autoNavRef = useRef(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const clearAutoNav = useCallback(() => {
    if (autoNavRef.current) {
      clearInterval(autoNavRef.current);
      autoNavRef.current = null;
    }
  }, []);

  const goAfterSuccess = useCallback(() => {
    clearAutoNav();
    if (isJoin && tournamentId) {
      navigation.replace('TournamentDetails', { tournamentId, joinedSuccess: true });
      return;
    }
    const returned = navigateAfterWalletTopup(
      navigation,
      returnToTournamentId,
      returnScreen,
      pendingJoin
    );
    if (!returned) navigation.goBack();
  }, [
    clearAutoNav,
    isJoin,
    navigation,
    pendingJoin,
    returnScreen,
    returnToTournamentId,
    tournamentId,
  ]);

  const playSuccessAnimation = useCallback(() => {
    successScale.setValue(0.85);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successOpacity, successScale]);

  const beginVerifying = useCallback((hint) => {
    // Unmount WebView immediately — hides ZapUPI's own success modal (prevents double UI).
    setPaymentUrl(null);
    setPhase((p) => (p === 'PAID' || p === 'SUCCESS' ? p : 'VERIFYING'));
    setMessage(
      hint ||
        (isJoin
          ? 'Payment received. Confirming your join…'
          : 'Payment received. Updating your wallet…')
    );
  }, [isJoin]);

  const finishSuccess = useCallback(
    (res) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearPoll();
      setPaymentUrl(null);
      setPhase(isJoin ? 'PAID' : 'SUCCESS');
      if (res?.balance != null) setBalance(res.balance);
      if (res?.txnId) setTxnId(String(res.txnId));
      if (res?.utr) setUtr(String(res.utr));
      if (res?.paidAt) setPaidAt(res.paidAt);
      else setPaidAt(new Date().toISOString());
      if (res?.amount != null) {
        /* amount from server is authoritative for display */
      }
      playSuccessAnimation();

      // Auto-continue once (single success flow).
      let left = AUTO_CONTINUE_SEC;
      setCountdown(left);
      clearAutoNav();
      autoNavRef.current = setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          clearAutoNav();
          goAfterSuccess();
        }
      }, 1000);
    },
    [clearAutoNav, clearPoll, goAfterSuccess, isJoin, playSuccessAnimation]
  );

  const applyRemoteStatus = useCallback(
    (res) => {
      if (res?.txnId) setTxnId(String(res.txnId));
      if (res?.utr) setUtr(String(res.utr));
      if (res?.paidAt) setPaidAt(res.paidAt);
      if (res?.balance != null) setBalance(res.balance);

      const status = String(res?.status || '').toUpperCase();
      if (isJoin) {
        if (res?.tournamentJoined || status === 'PAID') {
          finishSuccess(res);
          return true;
        }
      } else if (res?.walletCredited === true) {
        finishSuccess(res);
        return true;
      }

      // Gateway paid but wallet/join still settling — stay on verifying (no WebView).
      if (status === 'SUCCESS' && !doneRef.current) {
        beginVerifying(
          isJoin
            ? 'Payment verified. Completing join…'
            : 'Payment verified. Crediting wallet…'
        );
        return false;
      }

      if (status === 'FAILED') {
        setPaymentUrl(null);
        setPhase('FAILED');
        setMessage(res?.message || 'Payment failed. You can retry.');
        return true;
      }
      if (status === 'EXPIRED') {
        setPaymentUrl(null);
        setPhase('EXPIRED');
        setMessage(res?.message || 'Payment timed out. You can retry.');
        return true;
      }
      if (status === 'CANCELLED') {
        setPaymentUrl(null);
        setPhase('CANCELLED');
        setMessage(res?.message || 'Payment cancelled.');
        return true;
      }
      return false;
    },
    [beginVerifying, finishSuccess, isJoin]
  );

  const pollStatus = useCallback(
    async (id) => {
      if (!id || doneRef.current) return;
      try {
        const res = await paymentService.getZapUpiStatus(id);
        applyRemoteStatus(res);
      } catch {
        /* keep polling */
      }
    },
    [applyRemoteStatus]
  );

  const startPolling = useCallback(
    (id) => {
      clearPoll();
      pollRef.current = setInterval(() => pollStatus(id), POLL_MS);
      pollStatus(id);
    },
    [clearPoll, pollStatus]
  );

  const createOrder = useCallback(async () => {
    if (creating) return;
    doneRef.current = false;
    outcomeRef.current = null;
    clearAutoNav();
    setCountdown(null);
    setCreating(true);
    setPhase('CREATING');
    setMessage('Creating ZapUPI order…');
    setErrorCode(null);
    setPaymentUrl(null);
    setOrderId(null);
    setTxnId(null);
    setUtr(null);
    setPaidAt(null);

    try {
      let res;
      if (isJoin) {
        const body = { tournamentId };
        if (joinKind === 'team') {
          body.teamName = teamName;
          body.teamSide = teamSide;
          body.players = players;
          if (slotNumber) body.slotNumber = slotNumber;
        } else {
          body.gamingUsername = gamingUsername;
          body.gamingUID = gamingUID;
          if (slotNumber) body.slotNumber = slotNumber;
        }
        res = await paymentService.createZapUpiOrder(body);
      } else {
        res = await paymentService.createZapUpiQr({ amount });
      }

      if (!res?.success) {
        throw Object.assign(new Error(res?.message || 'Failed to create payment'), {
          code: res?.code,
        });
      }

      if (res.alreadyPaid || res.tournamentJoined || String(res.status).toUpperCase() === 'PAID') {
        finishSuccess(res);
        return;
      }
      if (!isJoin && res.walletCredited === true && !res.paymentUrl) {
        finishSuccess(res);
        return;
      }

      setOrderId(res.orderId);
      setPaymentUrl(res.paymentUrl);
      setPhase('PENDING');
      setMessage('Scan the QR and complete UPI payment');
      startPolling(res.orderId);
    } catch (err) {
      clearPoll();
      setPhase('ERROR');
      setErrorCode(err.code || 'ERROR');
      setMessage(err.message || 'Could not start payment');
    } finally {
      setCreating(false);
    }
  }, [
    amount,
    clearAutoNav,
    clearPoll,
    creating,
    finishSuccess,
    gamingUID,
    gamingUsername,
    isJoin,
    joinKind,
    players,
    slotNumber,
    startPolling,
    teamName,
    teamSide,
    tournamentId,
  ]);

  useEffect(() => {
    createOrder();
    return () => {
      clearPoll();
      clearAutoNav();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOutcomeUrl = useCallback(
    (url) => {
      const outcome = detectZapOutcome(url);
      if (!outcome || outcomeRef.current === outcome) return true;
      outcomeRef.current = outcome;
      if (orderId) pollStatus(orderId);
      if (outcome === 'success') {
        beginVerifying();
      } else if (outcome === 'failed') {
        setPaymentUrl(null);
        setPhase((p) => (p === 'PAID' || p === 'SUCCESS' ? p : 'FAILED'));
        setMessage('Payment failed. Confirming with server…');
      } else if (outcome === 'timeout') {
        setPaymentUrl(null);
        setPhase((p) => (p === 'PAID' || p === 'SUCCESS' ? p : 'EXPIRED'));
        setMessage('Payment timed out. Confirming with server…');
      }
      return true;
    },
    [beginVerifying, orderId, pollStatus]
  );

  const onShouldStart = useCallback(
    (request) => {
      const url = request?.url || '';
      if (detectZapOutcome(url)) {
        handleOutcomeUrl(url);
        // Block loading ZapUPI marketing / success page — we own the success UI.
        return false;
      }
      if (isUpiUrl(url)) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
      return true;
    },
    [handleOutcomeUrl]
  );

  const onWebMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event?.nativeEvent?.data || '{}');
        if (data?.type === 'zap_gateway_success') {
          if (outcomeRef.current === 'success') return;
          outcomeRef.current = 'success';
          if (orderId) pollStatus(orderId);
          beginVerifying();
        }
      } catch {
        /* ignore */
      }
    },
    [beginVerifying, orderId, pollStatus]
  );

  const confirmLeave = useCallback(() => {
    if (phase === 'PAID' || phase === 'SUCCESS') {
      goAfterSuccess();
      return true;
    }
    Alert.alert(
      'Leave payment?',
      'If you already paid, wait here — your wallet updates after server confirmation.',
      [
        { text: 'Wait', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (orderId) {
              try {
                const res = await paymentService.cancelZapUpiOrder(orderId);
                if (
                  res?.tournamentJoined ||
                  res?.walletCredited ||
                  res?.status === 'PAID' ||
                  res?.status === 'SUCCESS'
                ) {
                  applyRemoteStatus(res);
                  return;
                }
                if (String(res?.status || '').toUpperCase() === 'PENDING') {
                  beginVerifying(res?.message || 'Payment is being verified…');
                  startPolling(orderId);
                  return;
                }
              } catch {
                /* ignore */
              }
            }
            navigation.goBack();
          },
        },
      ]
    );
    return true;
  }, [
    applyRemoteStatus,
    beginVerifying,
    goAfterSuccess,
    navigation,
    orderId,
    phase,
    startPolling,
  ]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

  const showWebView = phase === 'PENDING' && Boolean(paymentUrl);
  const showSuccess = phase === 'PAID' || phase === 'SUCCESS';
  const paidAmount = Number(amount || 0);

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmLeave} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>
            {isJoin ? tournamentName || 'Join tournament' : 'Add coins'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            ₹{paidAmount.toLocaleString('en-IN')} · ZapUPI
            {orderId ? ` · ${orderId}` : ''}
          </Text>
        </View>
      </View>

      {showWebView ? (
        <>
          <WebView
            source={{ uri: paymentUrl }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={(nav) => handleOutcomeUrl(nav?.url)}
            onMessage={onWebMessage}
            injectedJavaScript={SUCCESS_WATCH_JS}
            onOpenWindow={(e) => {
              const url = e?.nativeEvent?.targetUrl;
              if (!url) return;
              if (isUpiUrl(url)) {
                Linking.openURL(url).catch(() => {});
                return;
              }
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                try {
                  window.location.assign(url);
                } catch {
                  /* ignore */
                }
              }
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={PAGE.cyan} size="large" />
                <Text style={styles.hint}>Loading payment page…</Text>
              </View>
            )}
          />
          <Text style={styles.footerHint}>
            Scan the QR with any UPI app. Stay on this screen until payment finishes.
          </Text>
        </>
      ) : (
        <View style={styles.center}>
          {(phase === 'CREATING' || creating || phase === 'VERIFYING') && (
            <>
              <ActivityIndicator color={PAGE.cyan} size="large" />
              <Text style={styles.hint}>{message}</Text>
              {orderId ? <Text style={styles.code}>{orderId}</Text> : null}
            </>
          )}

          {showSuccess && (
            <Animated.View
              style={[
                styles.successCard,
                { opacity: successOpacity, transform: [{ scale: successScale }] },
              ]}
            >
              <View style={styles.checkWrap}>
                <MaterialCommunityIcons name="check" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.successTitle}>
                {isJoin ? 'Tournament Joined' : 'Payment Successful'}
              </Text>

              <View style={styles.detailBox}>
                <DetailRow label="TXN ID" value={txnId || '—'} />
                <DetailRow label="UTR Number" value={utr || '—'} />
                <DetailRow
                  label="Amount"
                  value={`₹${paidAmount.toLocaleString('en-IN')}`}
                />
                <DetailRow
                  label={isJoin ? 'Joined At' : 'Paid At'}
                  value={formatPaidAt(paidAt)}
                  last
                />
              </View>

              {!isJoin && balance != null ? (
                <Text style={styles.walletLine}>
                  Wallet balance: ₹{Number(balance).toLocaleString('en-IN')}
                </Text>
              ) : null}

              {countdown != null && countdown > 0 ? (
                <Text style={styles.redirectText}>
                  Redirecting in <Text style={styles.redirectNum}>{countdown}</Text> seconds…
                </Text>
              ) : (
                <Text style={styles.redirectText}>
                  {isJoin ? 'You are in the match.' : 'Wallet updated.'}
                </Text>
              )}

              <TouchableOpacity style={styles.okBtn} onPress={goAfterSuccess} activeOpacity={0.88}>
                <Text style={styles.okBtnText}>OK</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {['FAILED', 'EXPIRED', 'CANCELLED', 'ERROR'].includes(phase) && (
            <>
              <MaterialCommunityIcons
                name={phase === 'CANCELLED' ? 'close-circle-outline' : 'alert-circle-outline'}
                size={64}
                color="#F97316"
              />
              <Text style={styles.failTitle}>
                {phase === 'EXPIRED'
                  ? 'Payment timed out'
                  : phase === 'CANCELLED'
                    ? 'Payment cancelled'
                    : 'Payment failed'}
              </Text>
              <Text style={styles.hint}>{message}</Text>
              {errorCode ? <Text style={styles.code}>{errorCode}</Text> : null}
              <TouchableOpacity style={styles.okBtn} onPress={createOrder}>
                <Text style={styles.okBtnText}>Retry payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.ghostText}>Go back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 6 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  sub: {
    color: PAGE.muted,
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  webview: { flex: 1, backgroundColor: '#fff' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAGE.bg,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  hint: {
    color: PAGE.muted,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  code: {
    color: PAGE.muted,
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 8,
  },
  successCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  checkWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    color: '#0F172A',
    fontFamily: FONTS.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailBox: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#64748B',
    flexShrink: 0,
  },
  detailValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#5B39A8',
    textAlign: 'right',
    flex: 1,
  },
  walletLine: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
  },
  redirectText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    textAlign: 'center',
  },
  redirectNum: {
    fontFamily: FONTS.bold,
    color: '#5B39A8',
  },
  okBtn: {
    width: '100%',
    backgroundColor: '#5B39A8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  okBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  failTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  ghostBtn: { marginTop: 10, padding: 10 },
  ghostText: { color: PAGE.muted, fontFamily: FONTS.medium, fontSize: 13 },
  footerHint: {
    color: PAGE.muted,
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
