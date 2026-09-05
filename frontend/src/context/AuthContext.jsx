import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hiresense_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .getProfile()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('hiresense_token');
      })
      .finally(() => setLoading(false));
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
