import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for global unauthorized event
  useEffect(() => {
    const handleUnauthorized = () => logout();
    document.addEventListener('fibuca-unauthorized', handleUnauthorized);
    return () => {
      document.removeEventListener('fibuca-unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const cachedUser = localStorage.getItem('fibuca_user');
    const cachedToken = localStorage.getItem('fibuca_token');

    if (cachedUser && cachedToken) {
      const parsedUser = JSON.parse(cachedUser);
      setUser(parsedUser);
      setAuthToken(cachedToken);
      setLoading(false);
      return;
    }

    // Try cookie-based /api/me first
    api.get('/api/me')
      .then(res => {
        const u = res.data.user;
        setUser({ ...u, passwordChanged: !u.firstLogin });
        localStorage.setItem('fibuca_user', JSON.stringify(u));
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    setAuthToken(null); // clear in-memory token
    api.post('/api/logout').catch(() => {}).finally(() => setUser(null));
  }

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('fibuca_token');
      localStorage.removeItem('fibuca_user');
    }
  }, [user]);

  async function refreshUser() {
    try {
      const res = await api.get('/api/me');
      const u = res.data.user;
      setUser({ ...u, passwordChanged: !u.firstLogin });
      localStorage.setItem('fibuca_user', JSON.stringify(u));
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
