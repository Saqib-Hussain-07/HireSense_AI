import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getAuthToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const token = await getAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const profile = await api.getProfile();
        setUser(profile);
      } catch (_e) {
        // Not logged in or invalid token
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  function logout() {
    localStorage.removeItem('hiresense_token');
    setUser(null);
    if (typeof window !== 'undefined' && window.Clerk?.signOut) {
      window.Clerk.signOut();
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
