import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { getToken, isSignedIn: clerkSignedIn, isLoaded: clerkAuthLoaded } = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useClerkUser();

  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedUserIdRef = useRef(null);

  const clerkLoaded = Boolean(clerkAuthLoaded && clerkUserLoaded);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkSignedIn) {
      setUser(null);
      syncedUserIdRef.current = null;
      setIsSyncing(false);
      return;
    }

    if (syncedUserIdRef.current === clerkUser?.id && user) {
      return;
    }

    let isMounted = true;

    async function syncClerkSession() {
      setIsSyncing(true);
      try {
        const sessionToken = await getToken();
        if (!sessionToken) {
          if (isMounted) setIsSyncing(false);
          return;
        }

        const email = clerkUser?.primaryEmailAddress?.emailAddress;
        const name = clerkUser?.fullName || clerkUser?.firstName || (email ? email.split('@')[0] : 'User');

        const data = await api.clerkSession({ sessionToken, email, name });
        if (isMounted && data?.user) {
          setUser(data.user);
          syncedUserIdRef.current = clerkUser?.id;
        }
      } catch (err) {
        console.warn('[AuthContext] Could not sync Clerk session with backend:', err.message);
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    syncClerkSession();

    return () => {
      isMounted = false;
    };
  }, [clerkLoaded, clerkSignedIn, clerkUser, getToken, user]);

  // AuthContext exposes loading = true until EITHER:
  // (a) Clerk reports "not signed in" definitively, or
  // (b) the bridge has finished syncing (token present AND user set)
  const loading = !clerkLoaded || (clerkSignedIn && (!user || isSyncing));

  function logout() {
    localStorage.removeItem('hiresense_token');
    setUser(null);
    syncedUserIdRef.current = null;
    if (typeof window !== 'undefined' && window.Clerk?.signOut) {
      window.Clerk.signOut();
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, isSyncing, isLoaded: !loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
