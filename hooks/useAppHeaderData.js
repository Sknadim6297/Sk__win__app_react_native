import { useCallback, useContext, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { userService, walletService, supportService } from '../services/api';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

export function useAppHeaderData() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [supportBadgeCount, setSupportBadgeCount] = useState(0);

  const loadHeaderData = useCallback(async () => {
    try {
      const [profileData, walletData, tickets] = await Promise.all([
        userService.getProfile().catch(() => null),
        walletService.getBalance().catch(() => ({ balance: 0 })),
        supportService.getMyTickets().catch(() => []),
      ]);

      if (profileData) setProfile(profileData);
      setWalletBalance(walletData?.balance ?? 0);

      const ticketList = Array.isArray(tickets) ? tickets : [];
      const openTickets = ticketList.filter(
        (t) => t.status === 'open' || t.status === 'in_progress'
      ).length;
      setSupportBadgeCount(openTickets);
    } catch {
      /* non-critical */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHeaderData();
    }, [loadHeaderData])
  );

  const displayName =
    profile?.username || profile?.name || user?.username || user?.name || 'Player';
  const profilePhoto = profile?.profilePhoto ? resolveMediaUrl(profile.profilePhoto) : '';

  return {
    displayName,
    profilePhoto,
    walletBalance,
    supportBadgeCount,
    refreshHeader: loadHeaderData,
  };
}
