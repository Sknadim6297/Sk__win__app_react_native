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

const FAQScreen = ({ navigation }) => {
  const faqs = [
    {
      question: 'How do I join a tournament?',
      answer: 'Go to the Tournaments tab, select a tournament you like, and click "Join". You can then invite friends to participate.',
    },
    {
      question: 'How are prizes distributed?',
      answer: 'Prizes are distributed to top performers based on tournament rules. Winners receive prize money in their wallet within 24 hours.',
    },
    {
      question: 'Can I withdraw my winnings?',
      answer: 'Yes, you can withdraw your winnings anytime. Go to Wallet > Withdraw Money and follow the process.',
    },
    {
      question: 'What is KYC verification?',
      answer: 'KYC (Know Your Customer) verification is required for withdrawals. It helps us comply with regulations and protect your account.',
    },
    {
      question: 'How do I report a user?',
      answer: 'If you encounter inappropriate behavior, contact our support team with details and screenshot evidence.',
    },
    {
      question: 'Is SK Win available in my region?',
      answer: 'SK Win is available in most regions. Check your app store or contact support for regional availability.',
    },
  ];

  const [expanded, setExpanded] = React.useState(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {faqs.map((faq, index) => (
          <View key={index}>
            <TouchableOpacity
              style={styles.faqItem}
              onPress={() => setExpanded(expanded === index ? null : index)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.question}>{faq.question}</Text>
              </View>
              <Ionicons 
                name={expanded === index ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color={COLORS.accent} 
              />
            </TouchableOpacity>
            
            {expanded === index && (
              <View style={styles.answerContainer}>
                <Text style={styles.answer}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 30 }} />
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
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    lineHeight: 20,
  },
  answerContainer: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  answer: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
});

export default FAQScreen;
