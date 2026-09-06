import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { useAuth as useLocalAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

/**
 * useClerkBridge
 * --------------
 * Synchronizes the active Clerk session with the backend User profile in
 * MongoDB and keeps AuthContext updated.
 *
 * Direct Clerk token resolution: API requests and WebSockets resolve their
 * bearer tokens on-demand via getAuthToken() (which queries Clerk directly),
 * eliminating parallel token stores or localStorage mirroring.
 *
 * Must be rendered inside both <ClerkProvider> and <AuthProvider>.
 */
export function useClerkBridge() {
  const { getToken, isSignedIn: clerkSignedIn } = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { setUser } = useLocalAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!clerkLoaded || !clerkSignedIn) {
      if (clerkLoaded && !clerkSignedIn) {
        setUser(null);
        syncedRef.current = false;
      }
      return;
    }

    if (syncedRef.current) return;

    async function syncWithBackend() {
      try {
        const sessionToken = await getToken();
        if (!sessionToken) return;

        const email = clerkUser?.primaryEmailAddress?.emailAddress;
        const name = clerkUser?.fullName || clerkUser?.firstName || (email ? email.split('@')[0] : 'User');

        const data = await api.clerkSession({ sessionToken, email, name });
        if (data?.user) {
          setUser(data.user);
          syncedRef.current = true;
        }
      } catch (err) {
        console.warn('[useClerkBridge] Could not sync Clerk session with backend:', err.message);
      }
    }

    syncWithBackend();
  }, [clerkLoaded, clerkSignedIn, clerkUser, getToken, setUser]);
}

