import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ScreenLayout from '../components/layout/ScreenLayout';
import { paymentService } from '../services/api';
import { resolveQrDisplay } from '../utils/resolveQrDisplay';
import { isPaymentEnabled } from '../utils/paymentConfig';
import { COLORS, FONTS, TEXT } from '../styles/theme';

const POLL_MS = 3000;
const STATUS_COPY = {
  FORM: 'Enter Game ID & UID to continue',
  CREATING: 'Creating Cashfree Sandbox order…',
  PENDING: 'Payment Pending ⏳ — scan QR and complete payment',
  PAID: 'Joined Successfully ✅',
  SUCCESS: 'Joined Successfully ✅',
  FAILED: 'Payment Failed ❌',
  CANCELLED: 'Payment cancelled',
  EXPIRED: 'QR code expired',
  ERROR: 'Something went wrong',
};

/**
 * Tournament Pay & Join — Cashfree Sandbox QR.
 * Success only after backend confirms PAID + tournamentJoined.
 */
export default function TournamentPayJoinScreen({ navigation, route }) {
  const {
    tournamentId,
    tournamentName = 'Tournament',
    amount: amountParam,
    joinKind = 'solo',
    gamingUsername: initialUsername = '',
    gamingUID: initialUid = '',
    teamName,
    teamSide,
    players,
    skipForm = false,
  } = route.params || {};

  const amount = Number(amountParam || 0);
  const needsForm = joinKind === 'solo' && !skipForm && !(initialUsername && initialUid);

  const [phase, setPhase] = useState(needsForm ? 'FORM' : 'CREATING');
  const [gamingUsername, setGamingUsername] = useState(initialUsername);
  const [gamingUID, setGamingUID] = useState(initialUid);
  const [orderId, setOrderId] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [message, setMessage] = useState(needsForm ? STATUS_COPY.FORM : STATUS_COPY.CREATING);
  const [errorCode, setErrorCode] = useState(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const doneRef = useRef(false);
  const successScale = useRef(new Animated.Value(0.4)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
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

  const finishPaid = useCallback(
    (res) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearTimers();
      setPhase('PAID');
      setMessage(res?.message || STATUS_COPY.PAID);
      playSuccessAnimation();
    },
    [clearTimers, playSuccessAnimation]
  );

  const goToTournament = useCallback(() => {
    navigation.replace('TournamentDetails', {
      tournamentId,
      joinedSuccess: true,
    });
  }, [navigation, tournamentId]);

  const pollStatus = useCallback(
    async (id, { manual = false } = {}) => {
      if (!id || doneRef.current) return;
      if (manual) setRefreshing(true);
      try {
        const res = await paymentService.getCashfreeStatus(id);
        if (!res?.success && res?.code === 'NETWORK_ERROR') {
          setMessage(res.message || 'Network error. Retrying…');
          return;
        }

        const status = String(res?.status || '').toUpperCase();
        if (status === 'PAID' || status === 'SUCCESS' || res?.tournamentJoined) {
          finishPaid(res);
          return;
        }
        if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
          clearTimers();
          setPhase(status);
          setErrorCode(res?.code || status);
          setMessage(res?.message || STATUS_COPY[status] || STATUS_COPY.FAILED);
          return;
        }
        setPhase('PENDING');
        setMessage(res?.message || STATUS_COPY.PENDING);
      } catch (err) {
        setMessage(err.message || 'Network error. Retrying…');
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [clearTimers, finishPaid]
  );

  const startPolling = useCallback(
    (id, seconds) => {
      clearTimers();
      setExpiresIn(Math.max(0, Number(seconds) || 0));
      tickRef.current = setInterval(() => {
        setExpiresIn((s) => {
          if (s <= 1) {
            clearTimers();
            setPhase('EXPIRED');
            setMessage(STATUS_COPY.EXPIRED);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      pollRef.current = setInterval(() => pollStatus(id), POLL_MS);
      pollStatus(id);
    },
    [clearTimers, pollStatus]
  );

  const createOrder = useCallback(async () => {
    if (creating) return;
    if (!tournamentId) {
      setPhase('ERROR');
      setMessage('Missing tournament');
      return;
    }
    if (!isPaymentEnabled()) {
      setPhase('ERROR');
      setMessage('Enable EXPO_PUBLIC_PAYMENT_ENABLED=true for Cashfree Pay & Join');
      return;
    }

    const body = { tournamentId };
    if (joinKind === 'team') {
      body.teamName = teamName;
      body.teamSide = teamSide;
      body.players = players;
    } else {
      const name = String(gamingUsername || '').trim();
      const uid = String(gamingUID || '').trim();
      if (name.length < 3 || uid.length < 3) {
        setPhase('FORM');
        setMessage('Enter valid Game ID and UID (min 3 characters)');
        return;
      }
      body.gamingUsername = name;
      body.gamingUID = uid;
    }

    doneRef.current = false;
    setCreating(true);
    setPhase('CREATING');
    setMessage(STATUS_COPY.CREATING);
    setErrorCode(null);
    setQrPayload(null);
    setQrImageUrl(null);
    setOrderId(null);

    try {
      const res = await paymentService.createCashfreeOrder(body);
      if (!res?.success) {
        throw Object.assign(new Error(res?.message || 'Failed to create payment'), {
          code: res?.code,
        });
      }

      if (res.alreadyPaid || res.tournamentJoined || String(res.status).toUpperCase() === 'PAID') {
        finishPaid(res);
        return;
      }

      setOrderId(res.orderId);
      setQrPayload(res.qrPayload || null);
      setQrImageUrl(res.qrImageUrl || null);
      setPhase('PENDING');
      setMessage(res.message || STATUS_COPY.PENDING);
      startPolling(res.orderId, res.expiresInSeconds || 600);
    } catch (err) {
      clearTimers();
      setPhase('ERROR');
      setErrorCode(err.code || 'ERROR');
      setMessage(err.message || STATUS_COPY.ERROR);
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    finishPaid,
    gamingUID,
    gamingUsername,
    joinKind,
    players,
    startPolling,
    teamName,
    teamSide,
    tournamentId,
    clearTimers,
  ]);

  useEffect(() => {
    if (!needsForm) {
      createOrder();
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (phase === 'PAID') return;
    clearTimers();
    if (orderId && phase === 'PENDING') {
      try {
        await paymentService.cancelCashfreeOrder(orderId);
      } catch (_) {
        /* ignore */
      }
    }
    navigation.goBack();
  };

  const handleRetry = () => {
    clearTimers();
    createOrder();
  };

  const mm = String(Math.floor(expiresIn / 60)).padStart(2, '0');
  const ss = String(expiresIn % 60).padStart(2, '0');
  const qrDisplay = resolveQrDisplay(qrPayload, qrImageUrl);
  const showQr = phase === 'PENDING' && Boolean(qrDisplay);
  const isTerminal = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'ERROR'].includes(phase);

  return (
    <ScreenLayout edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournament Payment</Text>
        {phase === 'PENDING' && orderId ? (
          <TouchableOpacity
            onPress={() => pollStatus(orderId, { manual: true })}
            hitSlop={12}
            style={styles.backBtn}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={22} color={COLORS.white} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoCard}>
          <Text style={styles.tourName} numberOfLines={2}>
            {tournamentName}
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Entry Fee</Text>
            <Text style={styles.amountValue}>₹{amount.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.sandboxHint}>Cashfree Test Environment (Sandbox)</Text>
        </View>

        {phase === 'FORM' ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Game details required</Text>
            <Text style={styles.formHint}>
              Wrong Game ID / UID can get you removed from the match.
            </Text>
            <TextInput
              style={styles.input}
              value={gamingUsername}
              onChangeText={setGamingUsername}
              placeholder="Game ID (in-game name)"
              placeholderTextColor={COLORS.grayDim}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={gamingUID}
              onChangeText={setGamingUID}
              placeholder="Game UID"
              placeholderTextColor={COLORS.grayDim}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={createOrder} activeOpacity={0.88}>
              <Text style={styles.primaryText}>Pay & Join · ₹{amount}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {phase !== 'FORM' ? (
          <View style={styles.qrCard}>
            {phase === 'CREATING' || creating ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.statusText}>{message}</Text>
              </View>
            ) : null}

            {showQr ? (
              <>
                <Text style={styles.scanTitle}>Scan QR & Complete Pay</Text>
                <View style={styles.qrWrap}>
                  {qrDisplay.mode === 'image' ? (
                    <Image source={{ uri: qrDisplay.uri }} style={styles.qrImage} resizeMode="contain" />
                  ) : (
                    <QRCode
                      value={qrDisplay.value}
                      size={220}
                      backgroundColor="#FFFFFF"
                      color="#0F172A"
                      ecl="M"
                    />
                  )}
                </View>
                <View style={styles.timerRow}>
                  <MaterialCommunityIcons name="timer-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.timerText}>
                    Expires in {mm}:{ss}
                  </Text>
                </View>
                <View style={styles.pendingRow}>
                  <ActivityIndicator size="small" color={COLORS.green} />
                  <Text style={styles.statusText}>Checking Payment…</Text>
                </View>
                <Text style={styles.statusText}>{message}</Text>
                {orderId ? <Text style={styles.orderId}>Order: {orderId}</Text> : null}
              </>
            ) : null}

            {phase === 'PAID' ? (
              <Animated.View
                style={[
                  styles.centerBox,
                  { opacity: successOpacity, transform: [{ scale: successScale }] },
                ]}
              >
                <MaterialCommunityIcons name="check-circle" size={72} color={COLORS.green} />
                <Text style={styles.successTitle}>Payment Successful ✅</Text>
                <Text style={styles.statusText}>
                  You have successfully joined the tournament.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={goToTournament} activeOpacity={0.88}>
                  <Text style={styles.primaryText}>Go To Tournament</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {isTerminal && phase !== 'PAID' ? (
              <View style={styles.centerBox}>
                <MaterialCommunityIcons name="alert-circle" size={56} color={COLORS.error} />
                <Text style={styles.failTitle}>{STATUS_COPY[phase] || 'Payment issue'}</Text>
                <Text style={styles.statusText}>{message}</Text>
                {errorCode ? <Text style={styles.orderId}>Code: {errorCode}</Text> : null}
                {orderId ? <Text style={styles.orderId}>Order: {orderId}</Text> : null}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry} activeOpacity={0.88}>
                  <Text style={styles.primaryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === 'PENDING' ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel} activeOpacity={0.88}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}

        {phase !== 'FORM' && phase !== 'PAID' && phase !== 'PENDING' ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel} activeOpacity={0.88}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
  },
  headerTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 16,
  },
  tourName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  amountRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: { color: COLORS.gray, ...TEXT.body },
  amountValue: { color: COLORS.primary, fontSize: 22, fontFamily: FONTS.bold },
  sandboxHint: { marginTop: 10, color: COLORS.grayDim, ...TEXT.caption },
  formCard: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 10,
  },
  formTitle: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 },
  formHint: { color: COLORS.gray, ...TEXT.caption, marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  qrCard: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: { alignItems: 'center', paddingVertical: 24, gap: 10, width: '100%' },
  scanTitle: { color: COLORS.white, ...TEXT.bodyMedium, marginBottom: 16 },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 },
  qrImage: { width: 220, height: 220 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  timerText: { color: COLORS.primary, ...TEXT.bodyMedium },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  statusText: {
    color: COLORS.gray,
    ...TEXT.caption,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  orderId: { color: COLORS.grayDim, fontSize: 11, marginTop: 8, textAlign: 'center' },
  successTitle: { color: COLORS.green, fontSize: 20, fontFamily: FONTS.bold, textAlign: 'center' },
  failTitle: { color: COLORS.error, fontSize: 18, fontFamily: FONTS.bold, marginTop: 8 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  primaryText: { color: COLORS.white, ...TEXT.button },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginTop: 12,
  },
  secondaryText: { color: COLORS.gray, ...TEXT.body },
});
