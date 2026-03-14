import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import { userService } from '../services/api';

const ShareAppScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [referralCode, setReferralCode] = useState(user?.referralCode || 'Loading...');

  useEffect(() => {
    let mounted = true;

    const loadReferralCode = async () => {
      try {
        if (user?.referralCode) {
          setReferralCode(user.referralCode);
          return;
        }

        const profile = await userService.getProfile();
        if (mounted && profile?.referralCode) {
          setReferralCode(profile.referralCode);
          return;
        }

        if (mounted) {
          setReferralCode('Not generated yet');
        }
      } catch (error) {
        if (mounted && !user?.referralCode) {
          setReferralCode('Unavailable');
        }
      }
    };

    loadReferralCode();

    return () => {
      mounted = false;
    };
  }, [user?.referralCode]);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Join SK Win and play tournaments for real rewards! Use my referral code ${referralCode} during signup. I get ₹25 referral bonus when you register with my code. Bonus usage rule: only up to 20% of entry fee can be paid using bonus.` ,
        title: 'Share SK Win',
        url: 'https://your-app-download-link.com', // Update with your actual link
      });

      if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const shareOptions = [
    { icon: 'message-text', label: 'SMS', color: '#00BCD4' },
    { icon: 'email', label: 'Email', color: '#FF6B6B' },
    { icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
    { icon: 'facebook', label: 'Facebook', color: '#1877F2' },
    { icon: 'twitter', label: 'Twitter', color: '#1DA1F2' },
  ];

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralCode);
        Alert.alert('Copied', 'Referral code copied to clipboard');
        return;
      }
      Alert.alert('Referral Code', referralCode);
    } catch (error) {
      Alert.alert('Referral Code', referralCode);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share App</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.sharePrompt}>
          <MaterialCommunityIcons name="share-variant" size={48} color={COLORS.accent} />
          <Text style={styles.promptText}>Share SK Win with your friends</Text>
          <Text style={styles.promptSubText}>
            Help your friends discover the ultimate tournament gaming experience
          </Text>
        </View>

        <View style={styles.sharingOptions}>
          {shareOptions.map((option, index) => (
            <TouchableOpacity key={index} style={styles.shareOption}>
              <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                <MaterialCommunityIcons name={option.icon} size={28} color={option.color} />
              </View>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <MaterialCommunityIcons name="share-variant" size={22} color={COLORS.white} />
          <Text style={styles.shareButtonText}>Share Now</Text>
        </TouchableOpacity>

        <View style={styles.referralCode}>
          <Text style={styles.referralLabel}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.code}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons name="copy" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.referralInfo}>
            Referral reward rule: the person who shared the code gets ₹25 bonus when a new user registers using it. Only up to 20% of any tournament entry fee can be paid from bonus balance. If your code is not generated yet, login again once.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 25,
  },
  sharePrompt: {
    alignItems: 'center',
    marginBottom: 40,
  },
  promptText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 15,
    marginBottom: 8,
  },
  promptSubText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  sharingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  shareOption: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 25,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  referralCode: {
    backgroundColor: COLORS.darkGray,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  referralLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  code: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
    flex: 1,
  },
  copyButton: {
    padding: 8,
  },
  referralInfo: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
});

export default ShareAppScreen;
