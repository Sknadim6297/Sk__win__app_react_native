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

const AboutUsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>SK Win Tournament Platform</Text>
          
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.text}>
            SK Win is dedicated to creating a fair, secure, and exciting platform for gaming enthusiasts. 
            We believe in bringing together players from around the world to compete, win, and celebrate their achievements.
          </Text>

          <Text style={styles.sectionTitle}>What We Offer</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>• Multiple tournaments with varying difficulty levels</Text>
            <Text style={styles.feature}>• Transparent prize distribution system</Text>
            <Text style={styles.feature}>• Secure wallet and payment system</Text>
            <Text style={styles.feature}>• Real-time match tracking and updates</Text>
            <Text style={styles.feature}>• Community features and leaderboards</Text>
            <Text style={styles.feature}>• 24/7 customer support</Text>
          </View>

          <Text style={styles.sectionTitle}>Our Values</Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Fair Play: </Text>
            We maintain strict anti-cheating protocols to ensure a level playing field.
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Transparency: </Text>
            All rules, scoring, and prizes are clearly communicated.
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Security: </Text>
            Your data and funds are protected with industry-leading encryption.
          </Text>

          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.text}>
            Email: support@skwin.com{'\n'}
            Phone: +91 9876543210{'\n'}
            Website: www.skwin.com
          </Text>

          <Text style={styles.version}>Version 1.0.0</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.white,
  },
  featureList: {
    marginBottom: 10,
  },
  feature: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
    lineHeight: 18,
  },
  version: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 30,
    textAlign: 'center',
  },
});

export default AboutUsScreen;
