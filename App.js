import React, { useContext, useEffect } from 'react';
import { InteractionManager, LogBox, View, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

LogBox.ignoreLogs([
  "Codegen didn't run",
  'is not a valid icon name for family',
  'Splashscreen.setOptions',
  'SplashScreen.setOptions',
  'cannot be used in Expo Go',
]);
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './components/navigation/CustomTabBar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { logApiConfig } from './utils/apiConfig';
import LandingScreen from './screens/LandingScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import TournamentScreen from './screens/TournamentScreen';
import TournamentDetailsScreen from './screens/TournamentDetailsScreen';
import TournamentEntryScreen from './screens/TournamentEntryScreen';
import TournamentSlotBookingScreen from './screens/TournamentSlotBookingScreen';
import TournamentResultsScreen from './screens/TournamentResultsScreen';
import WalletScreen from './screens/WalletScreen';
import CashfreeQrPaymentScreen from './screens/CashfreeQrPaymentScreen';
import HistoryScreen from './screens/HistoryScreen';
import MyContestsScreen from './screens/MyContestsScreen';
import AccountScreen from './screens/AccountScreen';
import AccountProfileScreen from './screens/AccountProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MyWalletScreen from './screens/MyWalletScreen';
import MyStatisticsScreen from './screens/MyStatisticsScreen';
import TopPlayersScreen from './screens/TopPlayersScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ContactUsScreen from './screens/ContactUsScreen';
import SupportTicketsScreen from './screens/SupportTicketsScreen';
import CreateSupportTicketScreen from './screens/CreateSupportTicketScreen';
import SupportTicketDetailScreen from './screens/SupportTicketDetailScreen';
import ImportantUpdatesScreen from './screens/ImportantUpdatesScreen';
import AnnouncementDetailScreen from './screens/AnnouncementDetailScreen';
import FAQScreen from './screens/FAQScreen';
import AboutUsScreen from './screens/AboutUsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsAndConditionsScreen from './screens/TermsAndConditionsScreen';
import ShareAppScreen from './screens/ShareAppScreen';
import GameModesScreen from './screens/GameModesScreen';
import GameDetailsScreen from './screens/GameDetailsScreen';
import TutorialDetailScreen from './screens/TutorialDetailScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import UserManagement from './screens/admin/UserManagement';
import UserDetails from './screens/admin/UserDetails';
import TournamentHistory from './screens/admin/TournamentHistory';
import TournamentManagement from './screens/admin/TournamentManagement';
import TournamentManagementV2 from './screens/admin/TournamentManagementV2';
import TournamentResultEntryScreen from './screens/admin/TournamentResultEntryScreen';
import TournamentLeaderboard from './screens/admin/TournamentLeaderboard';
import GameManagement from './screens/admin/GameManagement';
import TutorialManagement from './screens/admin/TutorialManagement';
import PaymentManagement from './screens/admin/PaymentManagement';
import ReportedIssues from './screens/admin/ReportedIssues';
import SupportManagement from './screens/admin/SupportManagement';
import AnnouncementManagement from './screens/admin/AnnouncementManagement';
import Analytics from './screens/admin/Analytics';
import AppContentManagement from './screens/admin/AppContentManagement';
import MapManagement from './screens/admin/MapManagement';
import SliderManagement from './screens/admin/SliderManagement';
import CustomMatchTeamRegisterScreen from './screens/CustomMatchTeamRegisterScreen';
import AppLoadingScreen, { WELCOME_BG } from './components/AppLoadingScreen';
import { applyGlobalTypography } from './styles/typography';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="WalletTab" component={WalletScreen} />
      <Tab.Screen name="AccountTab" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    if (__DEV__) logApiConfig();
  }, []);
  const [fontsLoaded] = useFonts({
    'LilitaOne-Regular': LilitaOne_400Regular,
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

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  const navKey = isAuthenticated ? (isAdmin() ? 'admin' : 'user') : 'guest';

  return (
    <NavigationContainer key={navKey}>
      <Stack.Navigator
        key={navKey}
        initialRouteName={
          isAuthenticated ? (isAdmin() ? 'AdminDashboard' : 'MainApp') : 'Landing'
        }
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          cardStyle: { backgroundColor: WELCOME_BG },
        }}
      >
        {/* Non-authenticated screens */}
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            {/* Admin-only routes */}
            {isAdmin() ? (
              <>
                <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                <Stack.Screen name="UserManagement" component={UserManagement} />
                <Stack.Screen name="UserDetails" component={UserDetails} />
                <Stack.Screen name="TournamentHistory" component={TournamentHistory} />
                <Stack.Screen name="TournamentManagement" component={TournamentManagement} />
                <Stack.Screen name="TournamentManagementV2" component={TournamentManagementV2} />
                <Stack.Screen name="TournamentResultEntry" component={TournamentResultEntryScreen} />
                <Stack.Screen name="TournamentLeaderboard" component={TournamentLeaderboard} />
                <Stack.Screen name="GameManagement" component={GameManagement} />
                <Stack.Screen name="TutorialManagement" component={TutorialManagement} />
                <Stack.Screen name="PaymentManagement" component={PaymentManagement} />
                <Stack.Screen name="ReportedIssues" component={ReportedIssues} />
                <Stack.Screen name="SupportManagement" component={SupportManagement} />
                <Stack.Screen name="AnnouncementManagement" component={AnnouncementManagement} />
                <Stack.Screen name="Analytics" component={Analytics} />
                <Stack.Screen name="AppContentManagement" component={AppContentManagement} />
                <Stack.Screen name="SliderManagement" component={SliderManagement} />
                <Stack.Screen name="MapManagement" component={MapManagement} />
              </>
            ) : (
              <>
                <Stack.Screen name="MainApp" component={MainTabNavigator} />
                <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="MyWallet" component={MyWalletScreen} />
            <Stack.Screen name="CashfreeQrPayment" component={CashfreeQrPaymentScreen} />
            <Stack.Screen name="MyStatistics" component={MyStatisticsScreen} />
                <Stack.Screen name="TopPlayers" component={TopPlayersScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="ContactUs" component={ContactUsScreen} />
                <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
                <Stack.Screen name="CreateSupportTicket" component={CreateSupportTicketScreen} />
                <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetailScreen} />
                <Stack.Screen name="ImportantUpdates" component={ImportantUpdatesScreen} />
                <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
                <Stack.Screen name="FAQ" component={FAQScreen} />
                <Stack.Screen name="AboutUs" component={AboutUsScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
                <Stack.Screen name="ShareApp" component={ShareAppScreen} />
                <Stack.Screen name="GameModes" component={GameModesScreen} />
                <Stack.Screen name="GameDetails" component={GameDetailsScreen} />
                <Stack.Screen name="TutorialDetail" component={TutorialDetailScreen} />
              </>
            )}

            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            <Stack.Screen name="CustomMatchTeamRegister" component={CustomMatchTeamRegisterScreen} />
            <Stack.Screen name="TournamentEntry" component={TournamentEntryScreen} />
            <Stack.Screen name="TournamentSlotBooking" component={TournamentSlotBookingScreen} />
            <Stack.Screen name="TournamentResults" component={TournamentResultsScreen} />
            <Stack.Screen name="Tournament" component={TournamentScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="MyContests" component={MyContestsScreen} />
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
  },
});
