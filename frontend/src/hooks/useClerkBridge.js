import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { useAuth as useLocalAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

/**
 * useClerkBridge
 * --------------
 * After Clerk signs a user in, exchanges their Clerk session token for a
 * local backend JWT so every API call and WebSocket connection continues to
 * work without changes. Stores the local token in localStorage under the
 * same key ('hiresense_token') that api.js already reads.
 *
 * Must be rendered inside both <ClerkProvider> and <AuthProvider>.
 */
export function useClerkBridge() {
  const { getToken, isSignedIn: clerkSignedIn } = useClerkAuth();
  const { isLoaded: clerkLoaded } = useUser();
  const { setUser } = useLocalAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!clerkLoaded || !clerkSignedIn) {
      if (clerkLoaded && !clerkSignedIn) {
        localStorage.removeItem('hiresense_token');
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
        const data = await api.clerkSession(sessionToken);
        if (data?.token) {
          localStorage.setItem('hiresense_token', data.token);
          setUser(data.user);
          syncedRef.current = true;
        }
      } catch (err) {
        console.warn('[useClerkBridge] Could not sync Clerk session with backend:', err.message);
      }
    }

    syncWithBackend();
  }, [clerkLoaded, clerkSignedIn, getToken, setUser]);
}
