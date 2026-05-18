import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/ui/AppIcon';
import JoinConfirmModal from '../components/JoinConfirmModal';
import { COLORS, FONTS } from '../styles/theme';
import { tournamentService, walletService } from '../services/api';
import { getPaymentSplit, getTeamSize, getJoinBlockReason } from '../utils/tournamentHelpers';

const CYAN = '#00E5FF';
const PURPLE = '#7B61FF';

export default function TournamentSlotBookingScreen({ navigation, route }) {
  const { tournamentId, gamingUsername: initialUsername = '' } = route.params || {};
  const [tournament, setTournament] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState(1);
  const [gamingID, setGamingID] = useState(initialUsername);
  const [gamingUID, setGamingUID] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [mismatchData, setMismatchData] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const teamSize = getTeamSize(tournament?.mode);

  const loadData = async () => {
    const [tData, wData, sData] = await Promise.all([
      tournamentService.getDetails(tournamentId),
      walletService.getBalance(),
      tournamentService.getSlots(tournamentId),
    ]);
    setTournament(tData);
    setBalance(wData?.balance ?? 0);
    setBonusBalance(wData?.bonusBalance ?? 0);
    setSlots(sData?.slots || []);
    const block = getJoinBlockReason(tData);
    if (block) {
      Alert.alert('Cannot Join', block, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (e) {
        Alert.alert('Error', e.message || 'Failed to load slots');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
    const poll = setInterval(() => loadData().catch(() => {}), 15000);
    return () => clearInterval(poll);
  }, [tournamentId, navigation]);

  const toggleSlot = (num) => {
    const slot = slots.find((s) => s.slotNumber === num);
    if (slot?.isBooked) return;

    if (selected.includes(num)) {
      setSelected(selected.filter((n) => n !== num));
      return;
    }
    if (selected.length >= teamSize) {
      Alert.alert('Limit reached', `Select ${teamSize} slot${teamSize > 1 ? 's' : ''}.`);
      return;
    }
    setSelected([...selected, num].sort((a, b) => a - b));
  };

  const handleNext = () => {
    if (selected.length !== teamSize) {
      Alert.alert('Select slots', `Please select ${teamSize} slot${teamSize > 1 ? 's' : ''}.`);
      return;
    }
    const split = getPaymentSplit(tournament?.entryFee, bonusBalance);
    const required = split.realRequired * teamSize;
    if (balance < required) {
      navigation.replace('TournamentEntry', { tournamentId });
      return;
    }
    setStep(2);
  };

  const openConfirmModal = () => {
    if (!gamingID?.trim() || gamingID.trim().length < 3) {
      Alert.alert('Required', 'Gaming Name must be at least 3 characters');
      return;
    }
    if (!gamingUID?.trim() || gamingUID.trim().length < 3) {
      Alert.alert('Required', 'Game UID must be at least 3 characters');
      return;
    }
    setConfirmVisible(true);
  };

  const bookOne = async (slotNumber) => {
    const res = await tournamentService.bookSlot(
      tournamentId,
      slotNumber,
      gamingID.trim(),
      gamingUID.trim()
    );
    if (res.step === 'confirm_username_mismatch') {
      return { mismatch: res, slotNumber };
    }
    if (!res.success) throw new Error(res.error || res.message || 'Booking failed');
    return { success: true };
  };

  const handleConfirmAndJoin = async () => {
    try {
      setBooking(true);
      for (const slotNum of selected) {
        const result = await bookOne(slotNum);
        if (result.mismatch) {
          setConfirmVisible(false);
          setMismatchData({ ...result.mismatch, slotNumber: result.slotNumber });
          setStep(3);
          return;
        }
      }
      setConfirmVisible(false);
      navigation.replace('TournamentDetails', { tournamentId });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to join tournament');
    } finally {
      setBooking(false);
    }
  };

  const handleConfirmMismatch = async () => {
    try {
      setBooking(true);
      const slotNum = mismatchData?.slotNumber ?? selected[0];
      const res = await tournamentService.confirmSlotBooking(
        tournamentId,
        slotNum,
        gamingID.trim(),
        gamingUID.trim()
      );
      if (res.success) {
        const rest = selected.filter((n) => n !== slotNum);
        for (const n of rest) {
          await tournamentService.bookSlot(tournamentId, n, gamingID.trim(), gamingUID.trim());
        }
        navigation.replace('TournamentDetails', { tournamentId });
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to confirm');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const totalFee = (tournament?.entryFee || 0) * teamSize;
  const remainingAfter = Math.max(balance - getPaymentSplit(tournament?.entryFee, bonusBalance).realRequired * teamSize, 0);

  const renderSlot = ({ item }) => {
    const num = item.slotNumber;
    const taken = item.isBooked;
    const picked = selected.includes(num);
    return (
      <TouchableOpacity
        style={styles.slotCell}
        onPress={() => toggleSlot(num)}
        disabled={taken}
        activeOpacity={0.7}
      >
        <Text style={[styles.slotNum, taken && styles.slotNumTaken]}>{num}</Text>
        <View style={[styles.checkbox, taken && styles.checkboxTaken, picked && styles.checkboxPicked]}>
          {(taken || picked) && <AppIcon name="check" size={14} color={taken ? COLORS.gray : CYAN} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <AppIcon name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Choose your match slot' : step === 2 ? 'Enter Gaming Name & UID' : 'Confirm Gaming Name'}
        </Text>
      </View>

      {step === 1 && (
        <>
          <Text style={styles.hint}>
            Select {teamSize} slot{teamSize > 1 ? 's' : ''} ({selected.length}/{teamSize})
          </Text>
          <FlatList
            data={slots}
            keyExtractor={(item) => String(item.slotNumber)}
            numColumns={4}
            contentContainerStyle={styles.grid}
            renderItem={renderSlot}
            columnWrapperStyle={styles.columnWrap}
          />
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>NEXT</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.confirmBody}>
          <Text style={styles.confirmLabel}>Selected slots</Text>
          <Text style={styles.slotsList}>{selected.join(', ')}</Text>

          <Text style={styles.confirmLabel}>Gaming Name *</Text>
          <TextInput
            style={styles.input}
            value={gamingID}
            onChangeText={setGamingID}
            placeholder="Enter your in-game name"
            placeholderTextColor={COLORS.grayDim}
            autoCapitalize="none"
          />

          <Text style={styles.confirmLabel}>Game UID *</Text>
          <TextInput
            style={styles.input}
            value={gamingUID}
            onChangeText={setGamingUID}
            placeholder="Enter your UID"
            placeholderTextColor={COLORS.grayDim}
            autoCapitalize="none"
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.nextBtn} onPress={openConfirmModal}>
            <Text style={styles.nextBtnText}>JOIN MATCH</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 3 && mismatchData && (
        <View style={styles.confirmBody}>
          <Text style={styles.warnText}>{mismatchData.message}</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleConfirmMismatch} disabled={booking}>
            {booking ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.nextBtnText}>YES, CONTINUE</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={() => setStep(2)}>
            <Text style={styles.cancelLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      <JoinConfirmModal
        visible={confirmVisible}
        tournament={tournament}
        entryFee={totalFee}
        remainingBalance={remainingAfter}
        loading={booking}
        onConfirm={handleConfirmAndJoin}
        onCancel={() => setConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 17, color: COLORS.white },
  hint: { paddingHorizontal: 16, color: COLORS.gray, fontSize: 13, marginBottom: 8 },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  columnWrap: { justifyContent: 'flex-start', gap: 8 },
  slotCell: { width: '23%', flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  slotNum: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 14, minWidth: 22 },
  slotNumTaken: { color: COLORS.grayDim },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  checkboxTaken: { backgroundColor: '#2a2f3a', borderColor: '#2a2f3a' },
  checkboxPicked: { borderColor: CYAN, backgroundColor: 'rgba(0,229,255,0.15)' },
  nextBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: PURPLE, paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  nextBtnText: { fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.5 },
  confirmBody: { padding: 16 },
  confirmLabel: { color: COLORS.gray, marginBottom: 6, marginTop: 12 },
  slotsList: { color: CYAN, fontFamily: FONTS.bold, fontSize: 18 },
  input: { backgroundColor: '#121A21', borderRadius: 10, padding: 14, color: COLORS.white, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 8 },
  warnText: { color: COLORS.error, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  cancelLink: { alignItems: 'center', marginTop: 16 },
  cancelLinkText: { color: COLORS.gray },
});
