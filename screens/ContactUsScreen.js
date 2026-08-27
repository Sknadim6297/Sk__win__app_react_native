import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { SUPPORT_CONTACTS, SUPPORT_LINKS } from '../constants/supportContacts';

const ContactUsScreen = ({ navigation }) => {
  const contacts = [
    { type: 'email', label: 'Email Support', value: SUPPORT_CONTACTS.email, display: SUPPORT_CONTACTS.email, icon: 'email' },
    { type: 'phone', label: 'Phone', value: SUPPORT_CONTACTS.phone, display: SUPPORT_CONTACTS.phoneDisplay, icon: 'phone' },
    {
      type: 'link',
      label: 'WhatsApp Channel',
      value: SUPPORT_LINKS.whatsapp,
      display: SUPPORT_CONTACTS.whatsappLabel,
      icon: 'whatsapp',
    },
    {
      type: 'link',
      label: 'Telegram Support',
      value: SUPPORT_LINKS.telegram,
      display: SUPPORT_CONTACTS.telegramLabel,
      icon: 'send',
    },
    {
      type: 'link',
      label: 'Instagram',
      value: SUPPORT_LINKS.instagram,
      display: SUPPORT_CONTACTS.instagramLabel,
      icon: 'instagram',
    },
  ];

  const handleContact = (type, value) => {
    switch (type) {
      case 'email':
        Linking.openURL(`mailto:${value}`);
        break;
      case 'phone':
        Linking.openURL(`tel:${value.replace(/\s/g, '')}`);
        break;
      case 'link':
        Linking.openURL(value).catch(() => {});
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkGray} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Have questions or need support? Reach us on WhatsApp, Telegram, Instagram, email, or phone.
        </Text>

        {contacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactCard}
            onPress={() => handleContact(contact.type, contact.value)}
          >
            <MaterialCommunityIcons name={contact.icon} size={28} color={COLORS.accent} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{contact.label}</Text>
              <Text style={styles.contactValue}>{contact.display}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 25,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 3,
  },
  contactValue: {
    fontSize: 13,
    color: COLORS.gray,
  },
});

export default ContactUsScreen;
