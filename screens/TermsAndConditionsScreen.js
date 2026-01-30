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

const TermsAndConditionsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using the SK Win application, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>

          <Text style={styles.sectionTitle}>2. Use License</Text>
          <Text style={styles.text}>
            Permission is granted to temporarily download one copy of the materials (information or software) on SK Win for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
          </Text>

          <Text style={styles.sectionTitle}>3. Disclaimer</Text>
          <Text style={styles.text}>
            The materials on SK Win are provided on an 'as is' basis. SK Win makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Text>

          <Text style={styles.sectionTitle}>4. Limitations</Text>
          <Text style={styles.text}>
            In no event shall SK Win or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on SK Win.
          </Text>

          <Text style={styles.sectionTitle}>5. User Conduct</Text>
          <Text style={styles.text}>
            Users agree to:{'\n\n'}
            • Not engage in cheating or fraudulent activities{'\n'}
            • Not harass or abuse other users{'\n'}
            • Not attempt to gain unauthorized access{'\n'}
            • Comply with all applicable laws and regulations{'\n'}
            • Not violate the rights of SK Win or other users
          </Text>

          <Text style={styles.sectionTitle}>6. Termination</Text>
          <Text style={styles.text}>
            SK Win may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason whatsoever, including if you breach the Terms.
          </Text>

          <Text style={styles.sectionTitle}>7. Contact Information</Text>
          <Text style={styles.text}>
            If you have any questions about these Terms and Conditions, please contact us at:
            {'\n\n'}
            Email: legal@skwin.com
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginHorizontal: 10,
    flex: 1,
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

export default TermsAndConditionsScreen;
