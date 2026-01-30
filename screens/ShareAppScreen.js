import React from 'react';
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

const ShareAppScreen = ({ navigation }) => {
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out SK Win - the ultimate tournament gaming platform! Join now and start winning prizes. Download from: [Your App Link]',
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
            <Text style={styles.code}>SK123456</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Ionicons name="copy" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.referralInfo}>
            Share your referral code to earn rewards when friends sign up!
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
