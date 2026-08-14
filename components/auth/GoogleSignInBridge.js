import React from 'react';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import GoogleLoginButton from './GoogleLoginButton';

/**
 * Isolated Google OAuth hook — only mount when client IDs are configured
 * so iOS does not throw before env vars are set.
 */
export default function GoogleSignInBridge({
  onToken,
  onError,
  disabled = false,
  loading = false,
  onLoadingChange,
}) {
  const { signIn, ready } = useGoogleSignIn({ onToken, onError });

  const handlePress = async () => {
    onLoadingChange?.(true);
    await signIn();
  };

  return (
    <GoogleLoginButton
      onPress={handlePress}
      disabled={disabled || !ready}
      loading={loading}
    />
  );
}
