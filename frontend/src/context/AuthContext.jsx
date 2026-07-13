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

  async function signup(name, email, password) {
    const data = await api.signup({ name, email, password });
    localStorage.setItem('hiresense_token', data.token);
    setUser(data.user);
  }

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem('hiresense_token', data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('hiresense_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
