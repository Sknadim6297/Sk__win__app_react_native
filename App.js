import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LandingScreen from './screens/LandingScreen';
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
import FAQScreen from './screens/FAQScreen';
import AboutUsScreen from './screens/AboutUsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsAndConditionsScreen from './screens/TermsAndConditionsScreen';
import ShareAppScreen from './screens/ShareAppScreen';
import GameModesScreen from './screens/GameModesScreen';
import GameDetailsScreen from './screens/GameDetailsScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import UserManagement from './screens/admin/UserManagement';
import UserDetails from './screens/admin/UserDetails';
import TournamentHistory from './screens/admin/TournamentHistory';
import TournamentManagement from './screens/admin/TournamentManagement';
import TournamentLeaderboard from './screens/admin/TournamentLeaderboard';
import GameManagement from './screens/admin/GameManagement';
import TutorialManagement from './screens/admin/TutorialManagement';
import { COLORS } from './styles/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let IconComponent = MaterialCommunityIcons;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
            IconComponent = MaterialCommunityIcons;
          } else if (route.name === 'LeaderboardTab') {
            iconName = focused ? 'podium' : 'podium';
            IconComponent = MaterialCommunityIcons;
          } else if (route.name === 'WalletTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
            IconComponent = MaterialCommunityIcons;
          } else if (route.name === 'AccountTab') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
            IconComponent = MaterialCommunityIcons;
          }

          return <IconComponent name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.lightGray,
          borderTopColor: COLORS.darkGray,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 10,
          paddingTop: 8,
          paddingHorizontal: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="LeaderboardTab" 
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Leaderboard',
        }}
      />
      <Tab.Screen 
        name="WalletTab" 
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
        }}
      />
      <Tab.Screen 
        name="AccountTab" 
        component={AccountScreen}
        options={{
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
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
    return null; // Show splash screen or loading indicator
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? (isAdmin() ? 'AdminDashboard' : 'MainApp') : 'Landing'}
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          cardStyle: { backgroundColor: '#0a0e27' },
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
                <Stack.Screen name="TournamentLeaderboard" component={TournamentLeaderboard} />
                <Stack.Screen name="GameManagement" component={GameManagement} />
                <Stack.Screen name="TutorialManagement" component={TutorialManagement} />
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
                <Stack.Screen name="FAQ" component={FAQScreen} />
                <Stack.Screen name="AboutUs" component={AboutUsScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
                <Stack.Screen name="ShareApp" component={ShareAppScreen} />
                
                {/* Game Modes */}
                <Stack.Screen name="GameModes" component={GameModesScreen} />
                <Stack.Screen name="GameDetails" component={GameDetailsScreen} />
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
