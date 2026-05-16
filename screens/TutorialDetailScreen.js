import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../styles/theme';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

export default function TutorialDetailScreen({ navigation, route }) {
  const tutorial = route.params?.tutorial || {};

  const thumbnailUri = resolveMediaUrl(tutorial.thumbnail);
  const title = tutorial.title || 'Tutorial';
  const description = tutorial.description || '';
  const videoLink = tutorial.videoLink || '';

  const openVideo = async () => {
    if (!videoLink) {
      Alert.alert('No video', 'This tutorial has no video link yet.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(videoLink);
      if (!canOpen) {
        Alert.alert('Cannot open', videoLink);
        return;
      }
      await Linking.openURL(videoLink);
    } catch {
      Alert.alert('Error', 'Could not open video link');
    }
  };

  const goToWallet = () => {
    navigation.navigate('MainApp', { screen: 'WalletTab' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0E1E" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="play-circle" size={64} color={COLORS.gray} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(11,14,30,0.95)']}
            style={styles.heroGradient}
          />
          <TouchableOpacity style={styles.playFab} onPress={openVideo} activeOpacity={0.9}>
            <MaterialCommunityIcons name="play" size={36} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={openVideo} activeOpacity={0.9}>
          <MaterialCommunityIcons name="play-circle" size={22} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>Watch Tutorial</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={goToWallet} activeOpacity={0.9}>
          <MaterialCommunityIcons name="wallet-plus" size={22} color="#4ADE80" />
          <Text style={styles.secondaryBtnText}>Go to Wallet — Add Coins</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.white,
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  heroWrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    backgroundColor: '#121B33',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playFab: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 179, 104, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    marginTop: 20,
    marginHorizontal: 16,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 10,
    marginHorizontal: 16,
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B368',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00B368',
    gap: 10,
  },
  secondaryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#4ADE80',
  },
});
