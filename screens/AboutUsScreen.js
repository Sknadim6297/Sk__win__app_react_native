import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { BRAND } from '../constants/branding';

const AboutUsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="About Us" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={pageStyles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>{BRAND.fullName}</Text>
          <Text style={styles.sub}>Competitive Free Fire tournaments with real rewards</Text>
        </View>

        <View style={pageStyles.card}>
          <View style={[pageStyles.row, pageStyles.rowLast, styles.block]}>
            <Text style={styles.text}>
              {BRAND.fullName} is a competitive Free Fire gaming platform where players join exciting
              tournaments and compete with others to win real rewards.
            </Text>
            <Text style={styles.text}>
              Our mission is to create a fair and exciting gaming environment for all players. Join
              tournaments, compete with top players, and win exciting prizes.
            </Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutUsScreen;

const styles = StyleSheet.create({
  heroCard: { ...pageStyles.heroCard, alignItems: 'center' },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: { ...TEXT.body, color: PAGE.muted, textAlign: 'center' },
  block: { flexDirection: 'column', alignItems: 'stretch', gap: 14 },
  text: { ...TEXT.body, color: PAGE.muted, lineHeight: 22 },
  version: { fontFamily: FONTS.semiBold, fontSize: 13, color: PAGE.cyan, marginTop: 4 },
});
