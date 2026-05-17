import React, { useContext, useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs([
  "Codegen didn't run",
  'is not a valid icon name for family',
]);
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AppIcon from './components/ui/AppIcon';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LandingScreen from './screens/LandingScreen';
import WelcomeOnboardingScreen from './screens/WelcomeOnboardingScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import TournamentScreen from './screens/TournamentScreen';
import TournamentDetailsScreen from './screens/TournamentDetailsScreen';
import WalletScreen from './screens/WalletScreen';
import HistoryScreen from './screens/HistoryScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
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
import TournamentLeaderboard from './screens/admin/TournamentLeaderboard';
import GameManagement from './screens/admin/GameManagement';
import TutorialManagement from './screens/admin/TutorialManagement';
import PaymentManagement from './screens/admin/PaymentManagement';
import ReportedIssues from './screens/admin/ReportedIssues';
import SupportManagement from './screens/admin/SupportManagement';
import AnnouncementManagement from './screens/admin/AnnouncementManagement';
import Analytics from './screens/admin/Analytics';
import AppContentManagement from './screens/admin/AppContentManagement';
import SliderManagement from './screens/admin/SliderManagement';
import AppLoadingScreen from './components/AppLoadingScreen';
import { applyGlobalTypography } from './styles/typography';
import { COLORS, TYPO } from './styles/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.white,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: tabStyles.bar,
      }}
    >
      <Tab.Screen
        name="StatsTab"
        component={MyStatisticsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AppIcon name="percentage" size={26} light={focused} muted={!focused} />
          ),
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AppIcon name="podium" size={26} light={focused} muted={!focused} />
          ),
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={[tabStyles.homeFab, focused && tabStyles.homeFabActive]}>
              <AppIcon name="home-variant" size={28} light />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AppIcon name="wallet" size={26} light={focused} muted={!focused} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AppIcon name="user-settings" size={26} light={focused} muted={!focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#050A12',
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 72,
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  homeFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F1520',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  homeFabActive: {
    backgroundColor: '#151C28',
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    'LilitaOne-Regular': LilitaOne_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyGlobalTypography();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <AppLoadingScreen subtitle="Loading game assets..." />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading, isAdmin } = useContext(AuthContext);

  if (isLoading) {
    return <AppLoadingScreen subtitle="Syncing your profile..." />;
  }

  const navKey = isAuthenticated ? (isAdmin() ? 'admin' : 'user') : 'guest';

  return (
    <NavigationContainer key={navKey}>
      <Stack.Navigator
        key={navKey}
        initialRouteName={
          isAuthenticated ? (isAdmin() ? 'AdminDashboard' : 'MainApp') : 'Welcome'
        }
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          cardStyle: { backgroundColor: '#050510' },
        }}
      >
        {/* Non-authenticated screens */}
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeOnboardingScreen} />
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
              </>
            ) : (
              <>
                {/* User routes */}
                <Stack.Screen name="MainApp" component={MainTabNavigator} />
                
                {/* Account SubScreen */}
                <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="MyWallet" component={MyWalletScreen} />
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
                
                {/* Game Modes */}
                <Stack.Screen name="GameModes" component={GameModesScreen} />
                <Stack.Screen name="GameDetails" component={GameDetailsScreen} />
                <Stack.Screen name="TutorialDetail" component={TutorialDetailScreen} />
              </>
            )}
            
            {/* Shared screens available to both admin and regular users */}
            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            <Stack.Screen name="Tournament" component={TournamentScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
