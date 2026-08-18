import React, { useContext, useEffect } from 'react';
import { InteractionManager, LogBox, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';

// react-native-screens often blanks stack cards on web — disable native screens there.
if (Platform.OS === 'web') {
  enableScreens(false);
}

LogBox.ignoreLogs([
  "Codegen didn't run",
  'is not a valid icon name for family',
  'Splashscreen.setOptions',
  'SplashScreen.setOptions',
  'cannot be used in Expo Go',
  'expo-notifications',
]);
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './components/navigation/CustomTabBar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoLinking from 'expo-linking';
import { useFonts } from 'expo-font';
import {
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { logApiConfig } from './utils/apiConfig';
import { navigationRef } from './utils/navigationRef';
import {
  setupNotificationListeners,
  syncPushTokenWithBackend,
  handleInitialNotificationResponse,
} from './utils/pushNotifications';
// Eager: first paint / auth gate only
import LandingScreen from './screens/LandingScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import WalletScreen from './screens/WalletScreen';
import AccountScreen from './screens/AccountScreen';
import ShareAppScreen from './screens/ShareAppScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AppLoadingScreen, { WELCOME_BG } from './components/AppLoadingScreen';
import { applyGlobalTypography } from './styles/typography';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const IS_WEB = Platform.OS === 'web';

/** Defer screen module evaluation until first navigation (faster cold start). */
const screen = (loader) => ({ getComponent: loader });

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: !IS_WEB,
      }}
    >
      <Tab.Screen name="EarnTab" component={ShareAppScreen} />
      <Tab.Screen name="LeaderboardTab" component={LeaderboardScreen} />
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="MenuTab" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    if (__DEV__) logApiConfig();
  }, []);
  const [fontsLoaded] = useFonts({
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyGlobalTypography();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded) return undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      SplashScreen.hideAsync().catch(() => {});
    });

    return () => task.cancel();
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider style={styles.root}>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={WELCOME_BG} translucent={false} />
        <View style={styles.root}>
          {!fontsLoaded ? (
            <AppLoadingScreen />
          ) : (
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          )}
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading, isAdmin } = useContext(AuthContext);
  const linking = {
    prefixes: [ExpoLinking.createURL('/')],
    config: {
      screens: {
        AdminResetPassword: 'admin-reset-password',
        AdminForgotPassword: 'admin-forgot-password',
      },
    },
  };

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin()) return undefined;
    const cleanup = setupNotificationListeners();
    syncPushTokenWithBackend().catch(() => {});
    handleInitialNotificationResponse().catch(() => {});
    return cleanup;
  }, [isAuthenticated]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  const navKey = isAuthenticated ? (isAdmin() ? 'admin' : 'user') : 'guest';

  return (
    <NavigationContainer key={navKey} ref={navigationRef} linking={linking}>
      <Stack.Navigator
        key={navKey}
        initialRouteName={
          isAuthenticated ? (isAdmin() ? 'AdminDashboard' : 'MainApp') : 'Landing'
        }
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          // freeze/detach blank out screens on react-native-web
          freezeOnBlur: !IS_WEB,
          detachInactiveScreens: !IS_WEB,
          cardStyle: { backgroundColor: WELCOME_BG, flex: 1 },
          ...(IS_WEB
            ? {
                animationEnabled: false,
                presentation: 'card',
              }
            : null),
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen
              name="AdminForgotPassword"
              {...screen(() => require('./screens/AdminForgotPasswordScreen').default)}
            />
            <Stack.Screen
              name="AdminResetPassword"
              {...screen(() => require('./screens/AdminResetPasswordScreen').default)}
            />
          </>
        ) : (
          <>
            {isAdmin() ? (
              <>
                <Stack.Screen name="AdminDashboard" {...screen(() => require('./screens/admin/AdminDashboard').default)} />
                <Stack.Screen name="UserManagement" {...screen(() => require('./screens/admin/UserManagement').default)} />
                <Stack.Screen name="UserDetails" {...screen(() => require('./screens/admin/UserDetails').default)} />
                <Stack.Screen name="TournamentHistory" {...screen(() => require('./screens/admin/TournamentHistory').default)} />
                <Stack.Screen name="TournamentManagement" {...screen(() => require('./screens/admin/TournamentManagement').default)} />
                <Stack.Screen name="DailyAutoMatchManagement" {...screen(() => require('./screens/admin/DailyAutoMatchManagement').default)} />
                <Stack.Screen name="TournamentManagementV2" {...screen(() => require('./screens/admin/TournamentManagementV2').default)} />
                <Stack.Screen name="TournamentResultEntry" {...screen(() => require('./screens/admin/TournamentResultEntryScreen').default)} />
                <Stack.Screen name="TournamentLeaderboard" {...screen(() => require('./screens/admin/TournamentLeaderboard').default)} />
                <Stack.Screen name="GameManagement" {...screen(() => require('./screens/admin/GameManagement').default)} />
                <Stack.Screen name="TutorialManagement" {...screen(() => require('./screens/admin/TutorialManagement').default)} />
                <Stack.Screen name="PaymentManagement" {...screen(() => require('./screens/admin/PaymentManagement').default)} />
                <Stack.Screen name="ReportedIssues" {...screen(() => require('./screens/admin/ReportedIssues').default)} />
                <Stack.Screen name="SupportManagement" {...screen(() => require('./screens/admin/SupportManagement').default)} />
                <Stack.Screen name="AnnouncementManagement" {...screen(() => require('./screens/admin/AnnouncementManagement').default)} />
                <Stack.Screen name="AdminPushNotifications" {...screen(() => require('./screens/admin/AdminPushNotifications').default)} />
                <Stack.Screen name="Analytics" {...screen(() => require('./screens/admin/Analytics').default)} />
                <Stack.Screen name="AppContentManagement" {...screen(() => require('./screens/admin/AppContentManagement').default)} />
                <Stack.Screen name="SliderManagement" {...screen(() => require('./screens/admin/SliderManagement').default)} />
                <Stack.Screen name="MapManagement" {...screen(() => require('./screens/admin/MapManagement').default)} />
              </>
            ) : (
              <>
                <Stack.Screen name="MainApp" component={MainTabNavigator} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="AccountProfile" {...screen(() => require('./screens/AccountProfileScreen').default)} />
                <Stack.Screen name="EditProfile" {...screen(() => require('./screens/EditProfileScreen').default)} />
                <Stack.Screen name="MyWallet" {...screen(() => require('./screens/MyWalletScreen').default)} />
                <Stack.Screen name="ZapUpiPayment" {...screen(() => require('./screens/ZapUpiPaymentScreen').default)} />
                <Stack.Screen name="TournamentPayJoin" {...screen(() => require('./screens/ZapUpiPaymentScreen').default)} />
                <Stack.Screen name="MyStatistics" {...screen(() => require('./screens/MyStatisticsScreen').default)} />
                <Stack.Screen name="TopPlayers" {...screen(() => require('./screens/TopPlayersScreen').default)} />
                <Stack.Screen name="Notifications" {...screen(() => require('./screens/NotificationsScreen').default)} />
                <Stack.Screen name="ContactUs" {...screen(() => require('./screens/ContactUsScreen').default)} />
                <Stack.Screen name="SupportTickets" {...screen(() => require('./screens/SupportTicketsScreen').default)} />
                <Stack.Screen name="CreateSupportTicket" {...screen(() => require('./screens/CreateSupportTicketScreen').default)} />
                <Stack.Screen name="SupportTicketDetail" {...screen(() => require('./screens/SupportTicketDetailScreen').default)} />
                <Stack.Screen name="ImportantUpdates" {...screen(() => require('./screens/ImportantUpdatesScreen').default)} />
                <Stack.Screen name="AnnouncementDetail" {...screen(() => require('./screens/AnnouncementDetailScreen').default)} />
                <Stack.Screen name="FAQ" {...screen(() => require('./screens/FAQScreen').default)} />
                <Stack.Screen name="AboutUs" {...screen(() => require('./screens/AboutUsScreen').default)} />
                <Stack.Screen name="PrivacyPolicy" {...screen(() => require('./screens/PrivacyPolicyScreen').default)} />
                <Stack.Screen name="TermsAndConditions" {...screen(() => require('./screens/TermsAndConditionsScreen').default)} />
                <Stack.Screen name="ShareApp" {...screen(() => require('./screens/ShareAppScreen').default)} />
                <Stack.Screen name="GameModes" {...screen(() => require('./screens/GameModesScreen').default)} />
                <Stack.Screen name="GameDetails" {...screen(() => require('./screens/GameDetailsScreen').default)} />
                <Stack.Screen name="TutorialDetail" {...screen(() => require('./screens/TutorialDetailScreen').default)} />
              </>
            )}

            <Stack.Screen name="TournamentDetails" {...screen(() => require('./screens/TournamentDetailsScreen').default)} />
            <Stack.Screen name="CustomMatchTeamRegister" {...screen(() => require('./screens/CustomMatchTeamRegisterScreen').default)} />
            <Stack.Screen name="TournamentEntry" {...screen(() => require('./screens/TournamentEntryScreen').default)} />
            <Stack.Screen name="TournamentSlotBooking" {...screen(() => require('./screens/TournamentSlotBookingScreen').default)} />
            <Stack.Screen name="TournamentResults" {...screen(() => require('./screens/TournamentResultsScreen').default)} />
            <Stack.Screen name="Tournament" {...screen(() => require('./screens/TournamentScreen').default)} />
            <Stack.Screen name="History" {...screen(() => require('./screens/HistoryScreen').default)} />
            <Stack.Screen name="MyContests" {...screen(() => require('./screens/MyContestsScreen').default)} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WELCOME_BG,
    ...(IS_WEB
      ? {
          height: '100%',
          minHeight: '100vh',
          width: '100%',
        }
      : null),
  },
});
