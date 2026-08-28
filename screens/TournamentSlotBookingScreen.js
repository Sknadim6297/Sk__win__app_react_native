import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import { tournamentService, walletService } from '../services/api';
import { getPaymentSplit, getMatchStructure } from '../utils/tournamentHelpers';
import { fetchWalletForEntry, startTournamentZapUpiPayment } from '../utils/walletFlow';
import { isPaymentEnabled } from '../utils/paymentConfig';
import { useInsufficientBalance } from '../hooks/useInsufficientBalance';
import Toast from '../components/Toast';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { CoinValue } from '../components/contest/ContestShared';
import { LIST_PERF } from '../utils/listPerf';

function isAlreadyJoinedError(err) {
  return /already joined|already booked a slot/i.test(String(err?.message || err || ''));
}

export default function TournamentSlotBookingScreen({ navigation, route }) {
  const { tournamentId, gamingUsername: initialUsername = '', walletRecharged, pendingJoin } = route.params || {};
  const insets = useSafeAreaInsets();
  const { showInsufficientBalance, InsufficientBalanceDialog } = useInsufficientBalance(navigation);
  const [tournament, setTournament] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState('slots');
  const [slotPlayers, setSlotPlayers] = useState({}); // { [slotNumber]: { name, uid } }
  const [editingSlot, setEditingSlot] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftUID, setDraftUID] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [mismatchData, setMismatchData] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });
  const autoJoinRef = useRef(false);
  const bookingLockRef = useRef(false);

  const goToJoinedDetails = useCallback(() => {
    navigation.replace('TournamentDetails', { tournamentId, joinedSuccess: true });
  }, [navigation, tournamentId]);

  useEffect(() => {
    (async () => {
      try {
        const [tData, wData, sData] = await Promise.all([
          tournamentService.getDetails(tournamentId),
          walletService.getBalance(),
          tournamentService.getSlots(tournamentId),
        ]);
        setTournament(tData);
        // Clash Squad only uses team registration; BR Duo/Squad pick slots on the 48 grid
        if (getMatchStructure(tData).usesTeamRegistration) {
          showToast('This match uses team registration.', 'warning');
          navigation.replace('CustomMatchTeamRegister', { tournamentId });
          return;
        }
        setBalance(wData?.balance ?? 0);
        setBonusBalance(wData?.bonusBalance ?? 0);
        setSlots(sData?.slots || []);
      } catch (e) {
        showToast(e.message || 'Failed to load slots', 'error');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId, navigation]);

  useFocusEffect(
    useCallback(() => {
      walletService
        .getBalance()
        .then((w) => {
          setBalance(w?.balance ?? 0);
          setBonusBalance(w?.bonusBalance ?? 0);
        })
        .catch(() => {});
    }, [])
  );

  const structure = getMatchStructure(tournament || {});
  const slotsRequired = Math.max(
    1,
    Number(
      tournament?.slotsRequiredToJoin ??
        structure.slotsRequiredToJoin ??
        structure.playersPerTeam ??
        1
    )
  );
  const formatLabel = tournament?.playerFormatLabel || structure.playerFormatLabel || 'Solo';

  const toggleSlot = (num) => {
    const slot = slots.find((s) => s.slotNumber === num);
    if (slot?.isBooked) return;
    if (selected.includes(num)) {
      setSelected(selected.filter((n) => n !== num));
      setSlotPlayers((prev) => {
        const next = { ...prev };
        delete next[num];
        return next;
      });
      return;
    }
    if (selected.length >= slotsRequired) {
      showToast(
        `${formatLabel} requires exactly ${slotsRequired} slot${slotsRequired > 1 ? 's' : ''}. Deselect one first.`,
        'warning'
      );
      return;
    }
    const nextSelected = [...selected, num].sort((a, b) => a - b);
    setSelected(nextSelected);
    setSlotPlayers((prev) => ({
      ...prev,
      [num]: prev[num] || { name: num === nextSelected[0] ? initialUsername : '', uid: '' },
    }));
  };

  const buildPlayersPayload = (slotNums = selected) =>
    slotNums.map((n) => ({
      slotNumber: n,
      gamingUsername: String(slotPlayers[n]?.name || '').trim(),
      gamingUID: String(slotPlayers[n]?.uid || '').trim(),
      name: String(slotPlayers[n]?.name || '').trim(),
    }));

  const allPlayersComplete = (slotNums = selected) =>
    slotNums.length === slotsRequired &&
    slotNums.every((n) => {
      const p = slotPlayers[n];
      return (
        String(p?.name || '').trim().length >= 3 && String(p?.uid || '').trim().length >= 3
      );
    });

  const entryFeePerPlayer = Number(
    tournament?.entryFeePerPlayer ??
      tournament?.feePerPlayer ??
      route.params?.entryCharge?.feePerPlayer ??
      tournament?.entryFee ??
      0
  );
  const payableTotal = Number(
    tournament?.totalAmount ??
      route.params?.entryCharge?.totalAmount ??
      tournament?.entryCharge?.totalAmount ??
      entryFeePerPlayer * slotsRequired
  );
  const split = getPaymentSplit(payableTotal, bonusBalance);

  const goConfirm = () => {
    if (selected.length !== slotsRequired) {
      showToast(
        `Please select ${slotsRequired} slot${slotsRequired > 1 ? 's' : ''} for ${formatLabel}.`,
        'warning'
      );
      return;
    }
    setStep('confirm');
  };

  const bookOne = async (slotNums) => {
    const players = buildPlayersPayload(slotNums);
    const primary = players[0] || {};
    const res = await tournamentService.bookSlot(
      tournamentId,
      slotNums,
      primary.gamingUsername,
      primary.gamingUID,
      players
    );
    if (res.step === 'confirm_username_mismatch') {
      return { mismatch: res, slotNumbers: slotNums, players };
    }
    if (!res.success) throw new Error(res.message || 'Booking failed');
    return { success: true };
  };

  const handleBook = async () => {
    if (bookingLockRef.current) return;
    if (!allPlayersComplete()) {
      const missing = selected.find((n) => {
        const p = slotPlayers[n];
        return !(String(p?.name || '').trim().length >= 3 && String(p?.uid || '').trim().length >= 3);
      });
      openPlayerDetails(missing || selected[0]);
      showToast(`Enter Game Name & UID for all ${slotsRequired} players`, 'warning');
      return;
    }
    const players = buildPlayersPayload();
    const primary = players[0];
    try {
      bookingLockRef.current = true;
      setBooking(true);
      if (isPaymentEnabled() && Number(payableTotal) > 0) {
        startTournamentZapUpiPayment(navigation, {
          tournamentId,
          tournamentName: tournament?.name,
          amount: payableTotal,
          joinKind: 'solo',
          gamingUsername: primary.gamingUsername,
          gamingUID: primary.gamingUID,
          slotNumber: selected[0],
          slotNumbers: selected,
          players,
        });
        return;
      }
      const walletCheck = await fetchWalletForEntry(payableTotal);
      if (!walletCheck.sufficient) {
        showInsufficientBalance({
          tournamentId,
          returnScreen: 'TournamentSlotBooking',
          forTeam: false,
          requiredAmount: payableTotal,
          currentBalance: walletCheck.balance,
          remainingAmount: walletCheck.remaining,
          qrAmount: walletCheck.qrAmount,
          pendingJoin: {
            kind: 'solo',
            slotNumber: selected[0],
            slotNumbers: selected,
            gamingUsername: primary.gamingUsername,
            gamingUID: primary.gamingUID,
            players,
          },
        });
        return;
      }
      const result = await bookOne(selected);
      if (result.mismatch) {
        setMismatchData({
          ...result.mismatch,
          slotNumber: selected[0],
          slotNumbers: selected,
          pendingSlots: selected,
          players,
        });
        setStep('mismatch');
        return;
      }
      goToJoinedDetails();
    } catch (e) {
      if (isAlreadyJoinedError(e)) {
        goToJoinedDetails();
        return;
      }
      const msg = e.message || 'Failed to book';
      if (/balance|insufficient/i.test(msg)) {
        showInsufficientBalance({
          tournamentId,
          returnScreen: 'TournamentSlotBooking',
          forTeam: false,
          requiredAmount: split.realRequired,
          currentBalance: balance,
        });
      } else {
        showToast(msg, 'error');
      }
    } finally {
      bookingLockRef.current = false;
      setBooking(false);
    }
  };

  useEffect(() => {
    if (!walletRecharged || !tournament || !pendingJoin || autoJoinRef.current) return;
    if (pendingJoin.kind && pendingJoin.kind !== 'solo') return;
    autoJoinRef.current = true;
    const slotNums = pendingJoin.slotNumbers || (pendingJoin.slotNumber ? [pendingJoin.slotNumber] : []);
    const restored = {};
    if (Array.isArray(pendingJoin.players) && pendingJoin.players.length) {
      pendingJoin.players.forEach((p, i) => {
        const n = Number(p.slotNumber || slotNums[i]);
        if (!n) return;
        restored[n] = {
          name: String(p.gamingUsername || p.name || '').trim(),
          uid: String(p.gamingUID || '').trim(),
        };
      });
    } else {
      slotNums.forEach((n) => {
        restored[n] = {
          name: String(pendingJoin.gamingUsername || '').trim(),
          uid: String(pendingJoin.gamingUID || '').trim(),
        };
      });
    }
    setSelected(slotNums);
    setSlotPlayers(restored);
    setStep('confirm');
    navigation.setParams({ walletRecharged: undefined, pendingJoin: undefined });
    (async () => {
      try {
        setBooking(true);
        const walletCheck = await fetchWalletForEntry(payableTotal);
        if (!walletCheck.sufficient) {
          autoJoinRef.current = false;
          showInsufficientBalance({
            tournamentId,
            returnScreen: 'TournamentSlotBooking',
            forTeam: false,
            requiredAmount: payableTotal,
            currentBalance: walletCheck.balance,
            remainingAmount: walletCheck.remaining,
            qrAmount: walletCheck.qrAmount,
            pendingJoin,
          });
          return;
        }
        const players = slotNums.map((n) => ({
          slotNumber: n,
          gamingUsername: restored[n]?.name || '',
          gamingUID: restored[n]?.uid || '',
          name: restored[n]?.name || '',
        }));
        const primary = players[0] || {};
        const res = await tournamentService.bookSlot(
          tournamentId,
          slotNums,
          primary.gamingUsername,
          primary.gamingUID,
          players
        );
        if (res.step === 'confirm_username_mismatch') {
          setMismatchData({
            ...res,
            slotNumber: slotNums[0],
            slotNumbers: slotNums,
            pendingSlots: slotNums,
            players,
          });
          setStep('mismatch');
          return;
        }
        if (!res.success) throw new Error(res.message || 'Booking failed');
        goToJoinedDetails();
      } catch (e) {
        if (isAlreadyJoinedError(e)) {
          goToJoinedDetails();
          return;
        }
        autoJoinRef.current = false;
        showToast(e.message || 'Failed to book', 'error');
      } finally {
        setBooking(false);
      }
    })();
  }, [walletRecharged, tournament, pendingJoin, navigation, tournamentId, showInsufficientBalance]);

  const handleConfirmMismatch = async () => {
    try {
      setBooking(true);
      const slotNums =
        mismatchData?.slotNumbers ||
        mismatchData?.pendingSlots ||
        selected;
      const players = mismatchData?.players || buildPlayersPayload(slotNums);
      const primary = players[0] || {};
      const res = await tournamentService.confirmSlotBooking(
        tournamentId,
        slotNums,
        primary.gamingUsername,
        primary.gamingUID,
        players
      );
      if (res.success) {
        goToJoinedDetails();
        return;
      }
    } catch (e) {
      if (isAlreadyJoinedError(e)) {
        goToJoinedDetails();
        return;
      }
      showToast(e.message || 'Failed to confirm', 'error');
    } finally {
      setBooking(false);
    }
  };

  const openPlayerDetails = (slotNum) => {
    const p = slotPlayers[slotNum] || { name: '', uid: '' };
    setEditingSlot(slotNum);
    setDraftName(p.name || '');
    setDraftUID(p.uid || '');
    setStep('details');
  };

  const saveDetails = () => {
    if (!draftName || draftName.trim().length < 3) {
      showToast('Game Name must be at least 3 characters', 'warning');
      return;
    }
    if (!draftUID || draftUID.trim().length < 3) {
      showToast('Game UID must be at least 3 characters', 'warning');
      return;
    }
    if (editingSlot != null) {
      setSlotPlayers((prev) => ({
        ...prev,
        [editingSlot]: { name: draftName.trim(), uid: draftUID.trim() },
      }));
    }
    setStep('confirm');
  };

  if (loading) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ActivityIndicator size="large" color={PAGE.cyan} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const hasInfo = allPlayersComplete();

  const renderSlot = ({ item }) => {
    const num = item.slotNumber;
    const taken = item.isBooked;
    const isPicked = selected.includes(num);
    return (
      <TouchableOpacity
        style={[styles.slotRow, isPicked && styles.slotRowPicked, taken && styles.slotRowTaken]}
        onPress={() => toggleSlot(num)}
        disabled={taken}
        activeOpacity={0.75}
      >
        <Text style={[styles.slotTeam, taken && styles.slotTakenText]}>
          Slot {num}{taken && item.gamingUsername ? ` · ${item.gamingUsername}` : ''}
        </Text>
        <View style={styles.slotRight}>
          <View style={[styles.checkbox, taken && styles.checkboxTaken, isPicked && styles.checkboxPicked]}>
            {(taken || isPicked) && (
              <AppIcon name="check" size={14} color={taken ? PAGE.muted : PAGE.cyan} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const BalanceBlock = () => (
    <View style={styles.balanceBlock}>
      <MaterialCommunityIcons name="wallet" size={52} color={PAGE.gold} />
      <View style={styles.balanceCopy}>
        <View style={styles.balanceLine}>
          <Text style={styles.balanceLabel}>Your Current Balance : </Text>
          <CoinValue value={balance} size={16} color={PAGE.gold} />
        </View>
        <View style={styles.balanceLine}>
          <Text style={styles.balanceLabel}>Entry Fee / Player : </Text>
          <CoinValue value={entryFeePerPlayer} size={16} color={PAGE.gold} />
        </View>
        <View style={styles.balanceLine}>
          <Text style={styles.balanceLabel}>Total Payable Amount : </Text>
          <CoinValue value={payableTotal} size={16} color={PAGE.gold} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader
        title="Joining Match"
        onBack={() => {
          if (step === 'details') setStep('confirm');
          else if (step === 'confirm' || step === 'mismatch') setStep('slots');
          else navigation.goBack();
        }}
      />

      {step === 'slots' && (
        <>
          <View style={styles.selectBanner}>
            <Text style={styles.selectBannerText}>
              Select {slotsRequired} Match Position{slotsRequired > 1 ? 's' : ''} ({formatLabel})
            </Text>
            <Text style={styles.selectBannerHint}>
              {selected.length}/{slotsRequired} selected
            </Text>
          </View>
          <View style={styles.colHead}>
            <Text style={styles.colHeadText}>Slot</Text>
            <Text style={styles.colHeadText}>Player</Text>
          </View>
          <FlatList
            {...LIST_PERF}
            data={slots}
            keyExtractor={(item) => String(item.slotNumber)}
            contentContainerStyle={styles.slotList}
            renderItem={renderSlot}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={styles.joinNowBtn} onPress={goConfirm} activeOpacity={0.88}>
              <Text style={styles.joinNowText}>Join Now</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 'confirm' && (
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.confirmScroll}>
            <BalanceBlock />
            <View style={styles.positionCard}>
              <Text style={styles.positionTitle}>SELECTED POSITION</Text>
              <View style={styles.posHeadRow}>
                <Text style={[styles.posColSlot, styles.posHead]}>SLOT</Text>
                <Text style={[styles.posColName, styles.posHead]}>GAME NAME</Text>
                <Text style={[styles.posColId, styles.posHead]}>GAME ID</Text>
              </View>
              {selected.map((num) => {
                const p = slotPlayers[num];
                const complete =
                  String(p?.name || '').trim().length >= 3 &&
                  String(p?.uid || '').trim().length >= 3;
                return (
                  <TouchableOpacity
                    key={num}
                    style={styles.posDataRow}
                    activeOpacity={0.85}
                    onPress={() => openPlayerDetails(num)}
                  >
                    <Text style={styles.posColSlot}>SLOT {num}</Text>
                    {complete ? (
                      <>
                        <Text style={styles.posColName} numberOfLines={1}>
                          {String(p.name).toUpperCase()}
                        </Text>
                        <Text style={styles.posColId} numberOfLines={1}>
                          {String(p.uid).toUpperCase()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.posColName}>
                          <View style={styles.addInfoBtn}>
                            <Text style={styles.addInfoText}>ADD INFO</Text>
                          </View>
                        </View>
                        <Text style={[styles.posColId, styles.posEmpty]}>—</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.note}>
              NOTE – PLEASE ENTER GAME NAME & UID FOR ALL {slotsRequired} PLAYER
              {slotsRequired > 1 ? 'S' : ''}
            </Text>
          </ScrollView>
          <View style={[styles.pairFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('slots')}>
              <Text style={styles.pairBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={
                hasInfo
                  ? handleBook
                  : () => {
                      const missing = selected.find((n) => {
                        const p = slotPlayers[n];
                        return !(
                          String(p?.name || '').trim().length >= 3 &&
                          String(p?.uid || '').trim().length >= 3
                        );
                      });
                      openPlayerDetails(missing || selected[0]);
                    }
              }
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.pairBtnText}>JOIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'details' && (
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.confirmScroll} keyboardShouldPersistTaps="handled">
            <BalanceBlock />
            <View style={styles.detailsCard}>
              <View style={styles.detailsHead}>
                <Text style={styles.detailsHeadText}>
                  PLAYER GAME DETAILS · SLOT {editingSlot}
                </Text>
              </View>
              <View style={styles.detailsBody}>
                <Text style={styles.fieldLabel}>GAME NAME</Text>
                <TextInput
                  style={styles.underlineInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter game name"
                  placeholderTextColor={PAGE.muted}
                  autoCapitalize="none"
                />
                <Text style={styles.fieldLabel}>GAME UID</Text>
                <TextInput
                  style={styles.underlineInput}
                  value={draftUID}
                  onChangeText={setDraftUID}
                  placeholder="Enter game UID"
                  placeholderTextColor={PAGE.muted}
                  autoCapitalize="none"
                />
                <Text style={styles.helper}>
                  MAKE SURE YOU ENTERED CORRECT GAME NAME & GAME UID
                </Text>
                <View style={styles.pairInline}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('confirm')}>
                    <Text style={styles.pairBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveDetails}>
                    <Text style={styles.pairBtnText}>SAVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {step === 'mismatch' && mismatchData && (
        <View style={styles.confirmScroll}>
          <Text style={styles.warnText}>{mismatchData.message || 'Username does not match your profile.'}</Text>
          <TouchableOpacity style={styles.joinNowBtn} onPress={handleConfirmMismatch} disabled={booking}>
            <Text style={styles.joinNowText}>YES, CONTINUE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => setStep('details')}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      {InsufficientBalanceDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  selectBanner: {
    backgroundColor: PAGE.cyan,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectBannerText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  selectBannerHint: {
    marginTop: 4,
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: PAGE.cyan,
  },
  colHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  colHeadText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  slotList: { paddingHorizontal: 16, paddingBottom: 100 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: PAGE.border,
  },
  slotRowPicked: {
    backgroundColor: 'rgba(79, 209, 197, 0.08)',
  },
  slotRowTaken: { opacity: 0.45 },
  slotTeam: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  slotTakenText: { color: PAGE.muted },
  slotRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  slotPos: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, minWidth: 18, textAlign: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTaken: { backgroundColor: '#2a2f3a', borderColor: '#2a2f3a' },
  checkboxPicked: { borderColor: PAGE.cyan, backgroundColor: 'rgba(79,209,197,0.18)' },
  footer: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: PAGE.bg },
  joinNowBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  joinNowText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  confirmScroll: { padding: 16, paddingBottom: 28 },
  balanceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  balanceCopy: { flex: 1, gap: 8 },
  balanceLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  balanceLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  positionCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  positionTitle: {
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#1E3A5F',
    marginBottom: 12,
  },
  posHeadRow: { flexDirection: 'row', marginBottom: 8 },
  posDataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  posColSlot: { flex: 1.1, fontFamily: FONTS.bold, fontSize: 12, color: '#334155' },
  posColName: { flex: 1.2, fontFamily: FONTS.bold, fontSize: 12, color: '#334155' },
  posColId: { flex: 1, fontFamily: FONTS.bold, fontSize: 12, color: '#334155' },
  posEmpty: { color: '#94A3B8' },
  posHead: { color: '#64748B', fontSize: 11 },
  addInfoBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addInfoText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  note: {
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    marginTop: 8,
  },
  pairFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pairInline: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F87171',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2DD4BF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pairBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  detailsCard: {
    backgroundColor: PAGE.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  detailsHead: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailsHeadText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  detailsBody: { padding: 16 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, marginTop: 8 },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.35)',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 15,
    paddingVertical: 8,
    marginBottom: 8,
  },
  helper: { ...TEXT.caption, color: PAGE.muted, marginTop: 8, lineHeight: 18 },
  warnText: { color: '#F87171', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  backLink: { alignItems: 'center', marginTop: 16 },
  backLinkText: { color: PAGE.muted, fontFamily: FONTS.bold },
});
