import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPO } from '../styles/theme';
import { announcementService } from '../services/api';

const formatTimestamp = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function AnnouncementDetailScreen({ navigation, route }) {
  const initial = route.params?.item;
  const id = route.params?.id || initial?.id;
  const [item, setItem] = useState(initial || null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (!id || initial?.description) return;
    (async () => {
      try {
        const data = await announcementService.getById(id);
        setItem(data);
      } catch {
        // keep initial if fetch fails
      } finally {
        setLoading(false);
      }
    })();
  }, [id, initial]);

  const openLink = async () => {
    const link = item?.externalLink?.trim();
    if (!link) return;
    const url = link.startsWith('http') ? link : `https://${link}`;
    await Linking.openURL(url);
  };

  if (loading && !item) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!item) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Update
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="bullhorn" size={28} color="#38BDF8" />
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category || 'ANNOUNCEMENT'}</Text>
          <Text style={styles.dot}>■</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
        </View>

        <View style={styles.bodyCard}>
          <Text style={styles.bodyText}>
            {item.description?.trim() || 'No additional details provided.'}
          </Text>
        </View>

        {item.externalLink?.trim() ? (
          <TouchableOpacity style={styles.linkBtn} onPress={openLink}>
            <Ionicons name="open-outline" size={20} color={COLORS.white} />
            <Text style={styles.linkBtnText}>Open link</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
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
    color: COLORS.white,
    fontSize: 18,
    fontFamily: TYPO.fontSemiBold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontFamily: TYPO.fontBold,
    lineHeight: 28,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  category: {
    color: '#2DD4BF',
    fontSize: 12,
    fontFamily: TYPO.fontSemiBold,
  },
  dot: {
    color: '#8B949E',
    fontSize: 8,
    marginHorizontal: 6,
  },
  timestamp: {
    color: '#8B949E',
    fontSize: 12,
    fontFamily: TYPO.fontRegular,
  },
  bodyCard: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bodyText: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: TYPO.fontRegular,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
  },
  linkBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: TYPO.fontSemiBold,
  },
});
