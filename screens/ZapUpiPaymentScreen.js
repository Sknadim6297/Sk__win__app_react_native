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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import { paymentService } from '../services/api';
import { navigateAfterWalletTopup } from '../utils/walletFlow';
import { COLORS, FONTS } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';

const POLL_MS = 3000;

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

function detectZapOutcome(url) {
  const u = String(url || '');
  if (!u) return null;
  if (u.includes('zapupi.com/payment?s=s') || /[?&]s=s(?:&|$)/.test(u)) return 'success';
  if (u.includes('zapupi.com/payment?s=f') || /[?&]s=f(?:&|$)/.test(u)) return 'failed';
  if (u.includes('zapupi.com/payment?s=t') || /[?&]s=t(?:&|$)/.test(u)) return 'timeout';
  return null;
}

function isUpiUrl(url) {
  const u = String(url || '').toLowerCase();
  return UPI_PREFIXES.some((p) => u.startsWith(p));
}

/**
 * Opens ZapUPI payment_url in-app (QR lives on their page).
 * Join / wallet credit only after backend confirms via webhook + Order Status API.
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
    skipForm,
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

  const pollRef = useRef(null);
  const doneRef = useRef(false);
  const outcomeRef = useRef(null);
  const successScale = useRef(new Animated.Value(0.4)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const playSuccessAnimation = useCallback(() => {
    successScale.setValue(0.4);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successOpacity, successScale]);

  const finishSuccess = useCallback(
    (res) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearPoll();
      setPhase(isJoin ? 'PAID' : 'SUCCESS');
      setMessage(
        res?.message ||
          (isJoin ? 'Payment Successful / Tournament Joined Successfully' : 'Payment successful!')
      );
      if (res?.balance != null) setBalance(res.balance);
      playSuccessAnimation();
    },
    [clearPoll, isJoin, playSuccessAnimation]
  );

  const applyRemoteStatus = useCallback(
    (res) => {
      const status = String(res?.status || '').toUpperCase();
      if (res?.tournamentJoined || status === 'PAID' || (isJoin && status === 'SUCCESS' && res?.tournamentJoined)) {
        finishSuccess(res);
        return true;
      }
      if (!isJoin && (status === 'SUCCESS' || res?.walletCredited)) {
        finishSuccess(res);
        return true;
      }
      if (status === 'FAILED') {
        setPhase('FAILED');
        setMessage(res?.message || 'Payment failed. You can retry.');
        return true;
      }
      if (status === 'EXPIRED') {
        setPhase('EXPIRED');
        setMessage(res?.message || 'Payment timed out. You can retry.');
        return true;
      }
      if (status === 'CANCELLED') {
        setPhase('CANCELLED');
        setMessage(res?.message || 'Payment cancelled.');
        return true;
      }
      return false;
    },
    [finishSuccess, isJoin]
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
    setCreating(true);
    setPhase('CREATING');
    setMessage('Creating ZapUPI order…');
    setErrorCode(null);
    setPaymentUrl(null);
    setOrderId(null);

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
      if (!isJoin && (res.walletCredited || String(res.status).toUpperCase() === 'SUCCESS') && !res.paymentUrl) {
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
    return () => clearPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOutcomeUrl = useCallback(
    (url) => {
      const outcome = detectZapOutcome(url);
      if (!outcome || outcomeRef.current === outcome) return true;
      outcomeRef.current = outcome;
      if (orderId) pollStatus(orderId);
      if (outcome === 'failed') {
        setPhase((p) => (p === 'PAID' || p === 'SUCCESS' ? p : 'FAILED'));
        setMessage('Payment failed. Confirming with server…');
      } else if (outcome === 'timeout') {
        setPhase((p) => (p === 'PAID' || p === 'SUCCESS' ? p : 'EXPIRED'));
        setMessage('Payment timed out. Confirming with server…');
      }
      return true;
    },
    [orderId, pollStatus]
  );

  const onShouldStart = useCallback(
    (request) => {
      const url = request?.url || '';
      if (detectZapOutcome(url)) {
        handleOutcomeUrl(url);
        return true;
      }
      if (isUpiUrl(url)) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
      return true;
    },
    [handleOutcomeUrl]
  );

  const confirmLeave = useCallback(() => {
    if (phase === 'PAID' || phase === 'SUCCESS') return true;
    Alert.alert('Cancel payment?', 'If you already paid, wait — the server will confirm before joining.', [
      { text: 'Wait', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          if (orderId) {
            try {
              const res = await paymentService.cancelZapUpiOrder(orderId);
              if (res?.tournamentJoined || res?.status === 'PAID' || res?.status === 'SUCCESS') {
                applyRemoteStatus(res);
                return;
              }
            } catch {
              /* ignore */
            }
          }
          navigation.goBack();
        },
      },
    ]);
    return true;
  }, [applyRemoteStatus, navigation, orderId, phase]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

  const goAfterSuccess = () => {
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
  };

  const showWebView = phase === 'PENDING' && paymentUrl;

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
          <Text style={styles.sub}>
            ₹{Number(amount || 0).toLocaleString('en-IN')} · ZapUPI
            {orderId ? ` · ${orderId}` : ''}
          </Text>
        </View>
      </View>

      {showWebView ? (
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
          onOpenWindow={(e) => {
            const url = e?.nativeEvent?.targetUrl;
            if (url && isUpiUrl(url)) Linking.openURL(url).catch(() => {});
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={PAGE.cyan} size="large" />
              <Text style={styles.hint}>Loading ZapUPI payment page…</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.center}>
          {phase === 'CREATING' || creating ? (
            <>
              <ActivityIndicator color={PAGE.cyan} size="large" />
              <Text style={styles.hint}>{message}</Text>
            </>
          ) : null}

          {(phase === 'PAID' || phase === 'SUCCESS') && (
            <Animated.View style={{ opacity: successOpacity, transform: [{ scale: successScale }] }}>
              <MaterialCommunityIcons name="check-decagram" size={72} color="#22C55E" />
              <Text style={styles.successTitle}>
                {isJoin ? 'Tournament Joined Successfully' : 'Payment Successful'}
              </Text>
              <Text style={styles.hint}>{message}</Text>
              {balance != null && !isJoin ? (
                <Text style={styles.hint}>Wallet: ₹{Number(balance).toLocaleString('en-IN')}</Text>
              ) : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={goAfterSuccess}>
                <Text style={styles.primaryText}>{isJoin ? 'View match' : 'Continue'}</Text>
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
                {phase === 'EXPIRED' ? 'Payment timed out' : phase === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed'}
              </Text>
              <Text style={styles.hint}>{message}</Text>
              {errorCode ? <Text style={styles.code}>{errorCode}</Text> : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={createOrder}>
                <Text style={styles.primaryText}>Retry payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.ghostText}>Go back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {showWebView ? (
        <Text style={styles.footerHint}>
          Scan the QR with any UPI app. Do not leave until you see success here.
        </Text>
      ) : null}
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
  headerCopy: { flex: 1 },
  title: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  sub: { color: PAGE.muted, fontSize: 12, marginTop: 2 },
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
    padding: 24,
    gap: 12,
  },
  hint: {
    color: PAGE.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  successTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  failTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  code: { color: PAGE.muted, fontSize: 11 },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: PAGE.cyan,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignSelf: 'center',
  },
  primaryText: { color: '#041018', fontFamily: FONTS.bold, fontSize: 14 },
  ghostBtn: { marginTop: 10, padding: 10 },
  ghostText: { color: PAGE.muted, fontSize: 13 },
  footerHint: {
    color: PAGE.muted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
