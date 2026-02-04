import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { tournamentService, walletService } from '../services/api';

const SlotBookingModal = ({ 
  visible, 
  tournament, 
  onClose, 
  onSuccess,
  userBalance,
  userGameUsername 
}) => {
  const [step, setStep] = useState(1); // 1: Select Slot, 2: Enter Username, 3: Confirm Mismatch
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [gamingUsername, setGamingUsername] = useState(userGameUsername || '');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [usernameMismatchData, setUsernameMismatchData] = useState(null);
  const [balance, setBalance] = useState(userBalance ?? null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (visible && tournament) {
      loadSlots();
      setStep(1);
      setSelectedSlot(null);
      setGamingUsername(userGameUsername || '');
    }
  }, [visible, tournament, userGameUsername]);

  useEffect(() => {
    if (userBalance !== undefined && userBalance !== null) {
      setBalance(userBalance);
      return;
    }

    if (visible) {
      fetchBalance();
    }
  }, [userBalance, visible]);

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const response = await walletService.getBalance();
      setBalance(response?.balance ?? 0);
    } catch (error) {
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadSlots = async () => {
    try {
      setLoading(true);
      const response = await tournamentService.getSlots(tournament._id);
      setSlots(response.slots || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slotNumber) => {
    if (selectedSlot === slotNumber) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot(slotNumber);
    }
  };

  const handleContinueToUsername = () => {
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select a slot');
      return;
    }

    // Step 1: Check wallet balance
    const effectiveBalance = balance ?? 0;
    if (effectiveBalance < tournament.entryFee) {
      Alert.alert(
        'Insufficient Balance',
        `❌ Insufficient balance.\nYou need ₹${tournament.entryFee} but have ₹${effectiveBalance}.\nPlease add money to join this tournament.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setStep(2);
  };

  const handleBookSlot = async () => {
    // Step 2: Validate gaming username
    if (!gamingUsername || gamingUsername.trim().length < 3) {
      Alert.alert('Error', 'Gaming username must be at least 3 characters');
      return;
    }

    try {
      setBooking(true);

      // Attempt to book slot
      const response = await tournamentService.bookSlot(
        tournament._id,
        selectedSlot,
        gamingUsername
      );

      if (response.step === 'confirm_username_mismatch') {
        // Step 4: Username mismatch warning
        setUsernameMismatchData(response);
        setStep(3);
      } else if (response.success) {
        if (response.booking?.remainingBalance !== undefined) {
          setBalance(response.booking.remainingBalance);
        }
        // Step 5: Success
        Alert.alert(
          'Success',
          `✅ Slot booked successfully!\nSlot No: ${response.booking.slotNumber}\nGaming Name: ${response.booking.gamingUsername}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                handleClose();
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to book slot');
    } finally {
      setBooking(false);
    }
  };

  const handleConfirmMismatch = async () => {
    try {
      setBooking(true);

      const response = await tournamentService.confirmSlotBooking(
        tournament._id,
        selectedSlot,
        gamingUsername
      );

      if (response.success) {
        if (response.booking?.remainingBalance !== undefined) {
          setBalance(response.booking.remainingBalance);
        }
        Alert.alert(
          'Success',
          `✅ Slot booked successfully!\nSlot No: ${response.booking.slotNumber}\nGaming Name: ${response.booking.gamingUsername}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                handleClose();
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to confirm booking');
    } finally {
      setBooking(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedSlot(null);
    setGamingUsername(userGameUsername || '');
    setUsernameMismatchData(null);
    onClose();
  };

  const renderSlotGrid = () => {
    const bookedCount = slots.filter(s => s.isBooked).length;
    const availableCount = slots.filter(s => !s.isBooked).length;

    return (
      <View>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{bookedCount}</Text>
            <Text style={styles.statLabel}>Booked</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.green }]}>
              {availableCount}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>50</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Slot Grid */}
        <View style={styles.slotsGrid}>
          {slots.map((slot) => (
            <TouchableOpacity
              key={slot.slotNumber}
              style={[
                styles.slotItem,
                slot.isBooked && styles.slotBooked,
                selectedSlot === slot.slotNumber && styles.slotSelected,
              ]}
              disabled={slot.isBooked}
              onPress={() => handleSlotSelect(slot.slotNumber)}
              activeOpacity={slot.isBooked ? 1 : 0.7}
            >
              <Text
                style={[
                  styles.slotNumber,
                  slot.isBooked && styles.slotNumberBooked,
                  selectedSlot === slot.slotNumber && styles.slotNumberSelected,
                ]}
              >
                {slot.slotNumber}
              </Text>
              {slot.isBooked && (
                <View style={styles.bookedOverlay}>
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color="#EF4444"
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: COLORS.white }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: COLORS.lightGray }]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Tournament Slot</Text>
            <View style={{ width: 24 }} />
          </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : step === 1 ? (
            <View>
              <Text style={styles.stepTitle}>Step 1: Select Slot</Text>
              <Text style={styles.stepDescription}>
                Each tournament has 50 fixed slots. Select your preferred slot.
              </Text>
              {renderSlotGrid()}
            </View>
          ) : step === 2 ? (
            <View>
              <Text style={styles.stepTitle}>Step 2: Enter Gaming Username</Text>
              <Text style={styles.stepDescription}>
                Enter your Free Fire Gaming Username
              </Text>

              <View style={styles.selectedSlotInfo}>
                <MaterialCommunityIcons
                  name="slot-machine"
                  size={24}
                  color={COLORS.primary}
                />
                <Text style={styles.selectedSlotText}>
                  Selected Slot: #{selectedSlot}
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Gaming Username *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your gaming username"
                  placeholderTextColor={COLORS.gray}
                  value={gamingUsername}
                  onChangeText={setGamingUsername}
                  maxLength={20}
                />
                {gamingUsername.length > 0 && gamingUsername.length < 3 && (
                  <Text style={styles.errorText}>
                    Minimum 3 characters required
                  </Text>
                )}

                <View style={styles.feeInfo}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Entry Fee:</Text>
                    <Text style={styles.feeValue}>₹{tournament.entryFee}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Your Balance:</Text>
                    <Text
                      style={[
                        styles.feeValue,
                        (balance ?? 0) < tournament.entryFee && { color: COLORS.red },
                      ]}
                    >
                      {balanceLoading ? 'Loading...' : `₹${balance ?? 0}`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : step === 3 ? (
            <View>
              <Text style={styles.stepTitle}>Username Mismatch Warning</Text>
              <View style={styles.warningBox}>
                <MaterialCommunityIcons
                  name="alert"
                  size={40}
                  color={COLORS.orange}
                />
                <Text style={styles.warningTitle}>⚠️ Gaming username mismatch</Text>
                <Text style={styles.warningText}>
                  Your entered gaming username "{gamingUsername}" does not match your
                  profile username "{usernameMismatchData?.profileUsername}".
                </Text>
                <Text style={styles.warningSubtext}>
                  You can continue, but no refund will be given if details are wrong.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step === 1 ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  !selectedSlot && styles.disabledButton,
                ]}
                onPress={handleContinueToUsername}
                disabled={!selectedSlot}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : step === 2 ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setStep(1)}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  (booking || gamingUsername.length < 3) && styles.disabledButton,
                ]}
                onPress={handleBookSlot}
                disabled={booking || gamingUsername.length < 3}
              >
                {booking ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Book Slot</Text>
                )}
              </TouchableOpacity>
            </>
          ) : step === 3 ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setStep(2)}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, booking && styles.disabledButton]}
                onPress={handleConfirmMismatch}
                disabled={booking}
              >
                {booking ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Confirm & Book</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  stepTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  slotItem: {
    width: '19%',
    aspectRatio: 1,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#22C55E',
    position: 'relative',
  },
  slotBooked: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    opacity: 0.7,
  },
  slotSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  slotNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#022C22',
  },
  slotNumberBooked: {
    color: '#9CA3AF',
  },
  slotNumberSelected: {
    color: COLORS.white,
    fontSize: 16,
  },
  bookedOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  slotCheckmark: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  legendText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  selectedSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedSlotText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  form: {
    marginTop: 16,
  },
  label: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#475569',
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
  },
  feeInfo: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  feeValue: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  warningText: {
    color: '#F8FAFC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SlotBookingModal;
