import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body:
      'By accessing and using the WarZone Free Fire Tournament application, you accept and agree to be bound by the terms and provision of this agreement.',
  },
  {
    title: '2. Use License',
    body:
      'Permission is granted to temporarily download one copy of the materials on WarZone Free Fire Tournament for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.',
  },
  {
    title: '3. Disclaimer',
    body:
      "The materials on WarZone Free Fire Tournament are provided on an 'as is' basis. WarZone Free Fire Tournament makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.",
  },
  {
    title: '4. Limitations',
    body:
      'In no event shall WarZone Free Fire Tournament or its suppliers be liable for any damages arising out of the use or inability to use the materials on WarZone Free Fire Tournament.',
  },
  {
    title: '5. User Conduct',
    body:
      'Users agree to not engage in cheating or fraudulent activities, not harass or abuse other users, not attempt to gain unauthorized access, and comply with all applicable laws and regulations.',
  },
  {
    title: '6. Termination',
    body:
      'WarZone Free Fire Tournament may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason whatsoever, including if you breach the Terms.',
  },
  {
    title: '7. Contact Information',
    body: 'If you have any questions about these Terms and Conditions, please contact us at legal@warzoneff.com',
  },
];

const TermsAndConditionsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="Terms & Conditions" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={pageStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last Updated: January 2026</Text>
        <View style={pageStyles.card}>
          {SECTIONS.map((section, index) => (
            <View
              key={section.title}
              style={[
                pageStyles.row,
                styles.sectionRow,
                index === SECTIONS.length - 1 && pageStyles.rowLast,
              ]}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.text}>{section.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsAndConditionsScreen;

const styles = StyleSheet.create({
  updated: { ...TEXT.caption, color: PAGE.mutedDim, marginBottom: 12 },
  sectionRow: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  text: { ...TEXT.body, color: PAGE.muted, lineHeight: 22 },
});
