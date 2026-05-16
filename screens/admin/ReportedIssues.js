import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';

const issueCards = [
  { title: 'Account access', subtitle: 'Login, verification, or profile issues', icon: 'account-lock' },
  { title: 'Tournament disputes', subtitle: 'Missing results or prize complaints', icon: 'trophy-alert' },
  { title: 'Payment issues', subtitle: 'Deposit, withdrawal, or wallet mismatch', icon: 'cash-alert' },
];

const ReportedIssues = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REPORTED ISSUES</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={34} color={COLORS.accent} />
          <Text style={styles.noticeTitle}>No issue tracker is connected yet</Text>
          <Text style={styles.noticeText}>
            This route is now safe to open. If you want real moderation queues, the app needs a dedicated report model and endpoint.
          </Text>
        </View>

        {issueCards.map((issue) => (
          <View key={issue.title} style={styles.issueCard}>
            <MaterialCommunityIcons name={issue.icon} size={26} color={COLORS.primary} />
            <View style={styles.issueTextBlock}>
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Text style={styles.issueSubtitle}>{issue.subtitle}</Text>
            </View>
          </View>
        ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noticeCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  noticeTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  noticeText: {
    color: COLORS.gray,
    marginTop: 8,
    lineHeight: 20,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    marginBottom: 12,
  },
  issueTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  issueTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  issueSubtitle: {
    color: COLORS.gray,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ReportedIssues;