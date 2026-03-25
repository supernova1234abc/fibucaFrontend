import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../lib/api';

const AuthContext = createContext();
const INACTIVITY_LOGOUT_MS = 120 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getActiveStorage = () => {
    if (localStorage.getItem('fibuca_token')) return localStorage;
    if (sessionStorage.getItem('fibuca_token')) return sessionStorage;
    return null;
  };

  // Listen for global unauthorized event
  useEffect(() => {
    const handleUnauthorized = () => logout();
    document.addEventListener('fibuca-unauthorized', handleUnauthorized);
    return () => {
      document.removeEventListener('fibuca-unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const storage = getActiveStorage();
    const cachedToken = storage?.getItem('fibuca_token');
    const cachedUser = storage?.getItem('fibuca_user');

    // ✅ ALWAYS restore token if it exists - critical for mobile networks & page refresh
    if (cachedToken) {
      setAuthToken(cachedToken);
    }

    if (cachedUser && cachedToken) {
      const parsedUser = JSON.parse(cachedUser);
      setUser(parsedUser);
      setLoading(false);

      // Refresh in background so fields like profilePhotoUrl stay in sync with server.
      api.get('/api/me')
        .then(res => {
          const u = res.data.user;
          setUser({ ...u, passwordChanged: !u.firstLogin });
          const activeStorage = getActiveStorage();
          if (activeStorage) {
            activeStorage.setItem('fibuca_user', JSON.stringify(u));
          } else {
            localStorage.setItem('fibuca_user', JSON.stringify(u));
          }
        })
        .catch(err => {
          console.warn('⚠️ Background auth refresh failed:', err.message);
        });
      return;
    }

    // Try cookie-based /api/me first
    api.get('/api/me')
      .then(res => {
        const u = res.data.user;
        setUser({ ...u, passwordChanged: !u.firstLogin });
        const activeStorage = getActiveStorage();
        if (activeStorage) {
          activeStorage.setItem('fibuca_user', JSON.stringify(u));
        } else {
          localStorage.setItem('fibuca_user', JSON.stringify(u));
        }
      })
      .catch(err => {
        console.warn('⚠️ Auth check failed (may be offline or network issue):', err.message);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    setAuthToken(null); // clear in-memory token
    localStorage.removeItem('fibuca_token');
    localStorage.removeItem('fibuca_user');
    sessionStorage.removeItem('fibuca_token');
    sessionStorage.removeItem('fibuca_user');
    api.post('/api/logout').catch(() => {}).finally(() => setUser(null));
  }

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('fibuca_token');
      localStorage.removeItem('fibuca_user');
      sessionStorage.removeItem('fibuca_token');
      sessionStorage.removeItem('fibuca_user');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    let timeoutId;
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    const resetInactivityTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        logout();
      }, INACTIVITY_LOGOUT_MS);
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [user]);

  async function refreshUser() {
    try {
      const res = await api.get('/api/me');
      const u = res.data.user;
      setUser({ ...u, passwordChanged: !u.firstLogin });
      const activeStorage = getActiveStorage();
      if (activeStorage) {
        activeStorage.setItem('fibuca_user', JSON.stringify(u));
      } else {
        localStorage.setItem('fibuca_user', JSON.stringify(u));
      }
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
