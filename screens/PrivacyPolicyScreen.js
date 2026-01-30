import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.text}>
            SK Win ("we" or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.text}>
            We may collect information about you in a variety of ways:
            {'\n\n'}
            • Personal identification information (name, email, phone number){'\n'}
            • Payment and billing information{'\n'}
            • Device information and usage data{'\n'}
            • Location information (with your permission)
          </Text>

          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.text}>
            We use the information we collect to:
            {'\n\n'}
            • Provide and maintain our service{'\n'}
            • Process transactions{'\n'}
            • Send promotional communications{'\n'}
            • Monitor and analyze app performance{'\n'}
            • Prevent fraudulent activities{'\n'}
            • Comply with legal obligations
          </Text>

          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.text}>
            We use administrative, technical, and physical security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.text}>
            You have the right to:
            {'\n\n'}
            • Access your personal data{'\n'}
            • Correct inaccurate data{'\n'}
            • Request deletion of your data{'\n'}
            • Opt-out of marketing communications
          </Text>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.text}>
            If you have questions about this Privacy Policy, please contact us at:
            {'\n\n'}
            Email: privacy@skwin.com
          </Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginTop: 15,
    marginBottom: 10,
  },
  text: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 10,
  },
});

export default PrivacyPolicyScreen;
