// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try cookie-based /api/me first. If 401, try token fallback.
    api.get('/api/me')
      .then(res => {
        const u = res.data.user;
        setUser({ ...u, passwordChanged: !u.firstLogin });
      })
      .catch(async (err) => {
        // If unauthorized and we have a token, try again with token set in Authorization header
        if (err.response && err.response.status === 401) {
          const token = localStorage.getItem('fibuca_token')
          if (token) {
            try {
              const res2 = await api.get('/api/me', {
                headers: { Authorization: `Bearer ${token}` }
              })
              const u = res2.data.user
              setUser({ ...u, passwordChanged: !u.firstLogin })
              return
            } catch (e) {
              // fallthrough to clearing user
            }
          }
        }
        setUser(null)
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    api.post('/api/logout')
      .catch(() => { })
      .finally(() => setUser(null));
  }

  // Ensure token and user are removed on logout
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('fibuca_token')
      localStorage.removeItem('fibuca_user')
    }
  }, [user])

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
