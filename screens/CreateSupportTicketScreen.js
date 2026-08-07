import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { supportService } from '../services/api';
import Toast from '../components/Toast';

export default function CreateSupportTicketScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const showToast = (msg, type = 'error') => setToast({ visible: true, message: msg, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  useEffect(() => {
    (async () => {
      try {
        const data = await supportService.getCategories();
        const list = Array.isArray(data) ? data : [];
        setCategories(list);
        if (list.length) setSelectedCategory(list[0].name);
      } catch (e) {
        showToast(e.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      showToast('Please select a category');
      return;
    }
    if (!message.trim()) {
      showToast('Please describe your issue');
      return;
    }
    try {
      setSubmitting(true);
      await supportService.createTicket({
        category: selectedCategory,
        message: message.trim(),
      });
      showToast('Ticket created successfully', 'success');
      setTimeout(() => navigation.goBack(), 600);
    } catch (e) {
      showToast(e.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={pageStyles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <Toast {...toast} onHide={hideToast} />
      <ScreenHeader title="Create Ticket" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={pageStyles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipWrap}>
              {categories.map((cat) => {
                const active = selectedCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id || cat.name}
                    style={[pageStyles.chip, active && pageStyles.chipActive]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Describe your issue</Text>
            <TextInput
              style={styles.input}
              placeholder="Tell us what happened..."
              placeholderTextColor={PAGE.mutedDim}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              maxLength={2000}
            />

            <TouchableOpacity
              style={[pageStyles.primaryBtn, submitting && { opacity: 0.7 }, { marginTop: 24 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={pageStyles.primaryBtnText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { ...TEXT.label, color: PAGE.muted, marginBottom: 10, marginTop: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 13, color: PAGE.muted },
  chipTextActive: { color: COLORS.white },
  input: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    color: COLORS.white,
    padding: 16,
    minHeight: 140,
    fontSize: 15,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
});
