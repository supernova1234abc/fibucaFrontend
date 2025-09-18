// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user once on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.get("/api/me");
        const u = res.data.user;
        setUser({ ...u, passwordChanged: !u.firstLogin });
      } catch (err) {
        // token fallback
        const token = localStorage.getItem("fibuca_token");
        if (err.response?.status === 401 && token) {
          try {
            const res2 = await api.get("/api/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const u = res2.data.user;
            setUser({ ...u, passwordChanged: !u.firstLogin });
            return;
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = async () => {
    try {
      await api.post("/api/logout");
    } catch {
      /* ignore */
    } finally {
      setUser(null);
      localStorage.removeItem("fibuca_token");
      localStorage.removeItem("fibuca_user");
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get("/api/me");
      const u = res.data.user;
      setUser({ ...u, passwordChanged: !u.firstLogin });
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
