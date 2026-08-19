import { Platform } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import {
  getPathFromState as navGetPathFromState,
  getStateFromPath as navGetStateFromPath,
} from '@react-navigation/native';

const LINKING_CONFIG = {
  screens: {
    Landing: 'welcome',
    Auth: 'login',
    AdminForgotPassword: 'admin-forgot-password',
    AdminResetPassword: 'admin-reset-password',
    MainApp: {
      screens: {
        EarnTab: 'earn',
        LeaderboardTab: 'leaderboard',
        HomeTab: 'home',
        MenuTab: 'profile',
      },
    },
    Wallet: 'wallet',
    MyWallet: 'wallet/manage',
    Notifications: 'notifications',
    GameModes: 'tournaments',
    MyContests: 'matches',
    History: 'results',
    AccountProfile: 'account',
    EditProfile: 'account/edit',
    TournamentDetails: 'tournament/:tournamentId',
    TournamentResults: 'match-results/:tournamentId',
    Tournament: 'my-tournaments',
    ContactUs: 'contact',
    SupportTickets: 'support',
    FAQ: 'faq',
    AboutUs: 'about',
    PrivacyPolicy: 'privacy',
    TermsAndConditions: 'terms',
    ImportantUpdates: 'updates',
  },
};

function pathOnly(path) {
  return String(path || '')
    .split('?')[0]
    .replace(/^\//, '')
    .replace(/\/$/, '');
}

function getStateFromPath(path, options) {
  const clean = pathOnly(path);

  if (clean === 'register' || clean === 'signup') {
    return { routes: [{ name: 'Auth', params: { mode: 'register' } }] };
  }
  if (clean === 'login' || clean === 'signin') {
    return { routes: [{ name: 'Auth', params: { mode: 'login' } }] };
  }

  return navGetStateFromPath(path, options);
}

function getPathFromState(state, options) {
  const route = state?.routes?.[state.index ?? 0];
  if (route?.name === 'Auth' && route?.params?.mode === 'register') {
    return '/register';
  }
  return navGetPathFromState(state, options);
}

export function createAppLinking() {
  const prefixes = [ExpoLinking.createURL('/')];
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    prefixes.push(window.location.origin);
  }

  return {
    prefixes,
    config: LINKING_CONFIG,
    getStateFromPath,
    getPathFromState,
  };
}
