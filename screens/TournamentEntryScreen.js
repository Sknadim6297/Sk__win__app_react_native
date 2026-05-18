import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/ui/AppIcon';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import { tournamentService, walletService } from '../services/api';
import { getPaymentSplit, getTeamSize, formatModeLabel } from '../utils/tournamentHelpers';

const CYAN = '#00E5FF';
const PURPLE = '#7B61FF';

function CoinRow({ value, size = 22 }) {
  return (
    <View style={styles.coinRow}>
      <AppIcon name="coins" size={size} color="#FBBF24" />
      <Text style={styles.coinValue}>{value}</Text>
    </View>
  );
}

export default function TournamentEntryScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const { user } = useContext(AuthContext);
  const [tournament, setTournament] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gamingUsername, setGamingUsername] = useState(user?.gameUsername || '');

  useEffect(() => {
    (async () => {
      try {
        const [tData, wData] = await Promise.all([
          tournamentService.getDetails(tournamentId),
          walletService.getBalance(),
        ]);
        setTournament(tData);
        setBalance(wData?.balance ?? 0);
        setBonusBalance(wData?.bonusBalance ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId]);

  if (loading || !tournament) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={CYAN} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const split = getPaymentSplit(tournament.entryFee, bonusBalance);
  const hasFunds = balance >= split.realRequired;
  const teamSize = getTeamSize(tournament.mode);
  const totalPayable = split.totalPayable * teamSize;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.balanceHero}>
        <CoinRow value={Math.floor(balance + bonusBalance)} size={36} />
        <Text style={styles.balanceLabel}>Total balance</Text>
      </View>

      <View style={styles.walletRow}>
        {[
          { label: 'Deposited', val: balance },
          { label: 'Bonus', val: bonusBalance },
          { label: 'Winning', val: 0 },
        ].map((item) => (
          <View key={item.label} style={styles.walletCard}>
            <CoinRow value={item.val} size={16} />
            <Text style={styles.walletCardLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Enter Player Details</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Team</Text>
            <Text style={styles.detailValue}>Team {tournament.matchNumber || '—'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Mode</Text>
            <Text style={styles.detailValue}>{formatModeLabel(tournament.mode)}</Text>
          </View>
          <View style={[styles.detailCol, { flex: 1.4 }]}>
            <Text style={styles.detailLabel}>Player Details</Text>
            <View style={styles.playerInputRow}>
              <TextInput
                style={styles.playerInput}
                value={gamingUsername}
                onChangeText={setGamingUsername}
                placeholder="Gaming username"
                placeholderTextColor={COLORS.grayDim}
              />
              <AppIcon name="pencil" size={18} muted />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.feeBlock}>
        <View style={styles.feeLine}>
          <Text style={styles.feeText}>Match Entry Fee Per Player</Text>
          <CoinRow value={tournament.entryFee} />
        </View>
        <View style={styles.feeLine}>
          <Text style={styles.feeTextBold}>Total payable =</Text>
          <CoinRow value={totalPayable} />
        </View>
        {!hasFunds && (
          <Text style={styles.insufficient}>You don&apos;t have sufficient balance</Text>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('MainApp', { screen: 'WalletTab' })}
        >
          <Text style={styles.addBtnText}>ADD MONEY</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark, paddingHorizontal: 16 },
  balanceHero: { alignItems: 'center', marginTop: 24, marginBottom: 20 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinValue: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.white },
  balanceLabel: { marginTop: 8, color: COLORS.gray, fontSize: 13 },
  walletRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  walletCard: {
    flex: 1,
    backgroundColor: '#121A21',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  walletCardLabel: { marginTop: 6, fontSize: 11, color: COLORS.gray, fontFamily: FONTS.regular },
  detailsCard: {
    backgroundColor: '#121A21',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailsTitle: { ...TEXT.h3, color: COLORS.white, marginBottom: 14 },
  detailsGrid: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 6 },
  detailValue: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1118',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerInput: { flex: 1, color: COLORS.white, fontSize: 13, paddingVertical: 8 },
  feeBlock: { marginBottom: 24 },
  feeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  feeText: { color: COLORS.gray, fontSize: 14 },
  feeTextBold: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 15 },
  insufficient: { color: COLORS.error, fontSize: 14, marginTop: 8, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 'auto', paddingBottom: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: PURPLE,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.5 },
  addBtn: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText: { fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.5 },
});
