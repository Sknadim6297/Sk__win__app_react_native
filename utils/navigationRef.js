import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/**
 * Handle notification deep-link payload (no secrets — only screen + ids).
 * @param {object} data
 * @param {{ inboxFallback?: boolean }} [options] — cold start should pass inboxFallback: false
 */
export function handleNotificationNavigation(data = {}, options = {}) {
  if (!navigationRef.isReady()) return;

  const inboxFallback = options.inboxFallback !== false;
  const screen = data.screen || data.deepLink || '';
  const tournamentId = data.tournamentId;

  switch (screen) {
    case 'TournamentDetails':
      if (tournamentId) navigate('TournamentDetails', { tournamentId });
      else if (inboxFallback) navigate('Notifications');
      break;
    case 'TournamentResults':
      if (tournamentId) navigate('TournamentResults', { tournamentId });
      else if (inboxFallback) navigate('Notifications');
      break;
    case 'MyWallet':
    case 'Wallet':
      navigate('MyWallet');
      break;
    case 'ImportantUpdates':
    case 'AnnouncementDetail':
      navigate('ImportantUpdates');
      break;
    case 'History':
      navigate('History');
      break;
    case 'MainApp':
      navigate('MainApp', { screen: data.tab || 'HomeTab' });
      break;
    case 'Notifications':
      if (inboxFallback) navigate('Notifications');
      break;
    default:
      if (tournamentId && (data.type === 'result' || data.type === 'tournament_reminder')) {
        navigate(
          data.type === 'result' ? 'TournamentResults' : 'TournamentDetails',
          { tournamentId }
        );
      } else if (data.type === 'wallet') {
        navigate('MyWallet');
      } else if (data.type === 'announcement') {
        navigate('ImportantUpdates');
      } else if (inboxFallback) {
        navigate('Notifications');
      }
  }
}

export function resetToMain() {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    })
  );
}
