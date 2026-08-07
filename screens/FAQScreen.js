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
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';

const FAQScreen = ({ navigation }) => {
  const faqs = [
    {
      question: 'How do I join a tournament?',
      answer:
        'Go to the Tournaments tab, select a tournament you like, and click "Join". You can then invite friends to participate.',
    },
    {
      question: 'How are prizes distributed?',
      answer:
        'Prizes are distributed to top performers based on tournament rules. Winners receive prize money in their wallet within 24 hours.',
    },
    {
      question: 'Can I withdraw my winnings?',
      answer:
        'Yes, you can withdraw your winnings anytime. Go to Wallet > Withdraw Money and follow the process.',
    },
    {
      question: 'How do I report a user?',
      answer:
        'If you encounter inappropriate behavior, contact our support team with details and screenshot evidence.',
    },
    {
      question: 'Is WarZone Free Fire Tournament available in my region?',
      answer:
        'WarZone Free Fire Tournament is available in most regions. Check your app store or contact support for regional availability.',
    },
  ];

  const [expanded, setExpanded] = React.useState(null);

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="App Tutorial" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={pageStyles.scroll} showsVerticalScrollIndicator={false}>
        <View style={pageStyles.card}>
          {faqs.map((faq, index) => {
            const open = expanded === index;
            const last = index === faqs.length - 1;
            return (
              <View key={index}>
                <TouchableOpacity
                  style={[pageStyles.row, last && !open && pageStyles.rowLast]}
                  onPress={() => setExpanded(open ? null : index)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.question}>{faq.question}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
                {open ? (
                  <View style={[styles.answerBox, last && pageStyles.rowLast]}>
                    <Text style={styles.answer}>{faq.answer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FAQScreen;

const styles = StyleSheet.create({
  question: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.white,
    paddingRight: 10,
  },
  answerBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PAGE.border,
  },
  answer: { ...TEXT.body, color: PAGE.muted, lineHeight: 22 },
});
