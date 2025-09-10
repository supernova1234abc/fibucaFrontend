// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/me')
      .then(res => {
        const u = res.data.user;
        setUser({ ...u, passwordChanged: !u.firstLogin });
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    api.post('/api/logout')
      .catch(() => { })
      .finally(() => setUser(null));
  }

  async function refreshUser() {
    try {
      const res = await api.get('/api/me');
      const u = res.data.user;
      setUser({ ...u, passwordChanged: !u.firstLogin });
    } catch {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
