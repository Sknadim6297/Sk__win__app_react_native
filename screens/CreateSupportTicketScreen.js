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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, TYPO } from '../styles/theme';
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Toast {...toast} onHide={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Ticket</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipWrap}>
              {categories.map((cat) => {
                const active = selectedCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id || cat.name}
                    style={[styles.chip, active && styles.chipActive]}
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
              placeholderTextColor="#8B949E"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              maxLength={2000}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    fontFamily: TYPO.fontSemiBold,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    color: '#8B949E',
    fontSize: 13,
    fontFamily: TYPO.fontMedium,
    marginBottom: 10,
    marginTop: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    color: '#8B949E',
    fontSize: 13,
    fontFamily: TYPO.fontSemiBold,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: COLORS.white,
    padding: 16,
    minHeight: 140,
    fontSize: 15,
    fontFamily: TYPO.fontRegular,
    lineHeight: 22,
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#22C55E',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: TYPO.fontBold,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
