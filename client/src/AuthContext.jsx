import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Saved logins per role: { admin: {token, user}, employee: {token, user} }
const loadSessions = () => {
  try { return JSON.parse(localStorage.getItem('sessions')) || {}; } catch { return {}; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState(loadSessions);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const saveSessions = (s) => {
    setSessions(s);
    localStorage.setItem('sessions', JSON.stringify(s));
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    localStorage.setItem('token', d.token);
    saveSessions({ ...sessions, [d.user.role]: { token: d.token, user: d.user } });
    setUser(d.user);
    return d.user;
  };
  const login = (email, password) => authenticate('/auth/login', { email, password });
  const register = (name, email, password) => authenticate('/auth/register', { name, email, password });

  // Switch to an already logged-in role without typing a password again
  const switchRole = async (role) => {
    const s = sessions[role];
    if (!s) return false;
    const previous = localStorage.getItem('token');
    localStorage.setItem('token', s.token);
    try {
      const d = await api('/auth/me');
      setUser(d.user);
      return true;
    } catch {
      // saved login expired: forget it and go back to the previous one
      const { [role]: removed, ...rest } = sessions;
      saveSessions(rest);
      localStorage.setItem('token', previous);
      return false;
    }
  };

  // Logs out the current role; if the other role is still logged in, switch to it
  const logout = () => {
    const { [user.role]: removed, ...rest } = sessions;
    saveSessions(rest);
    const other = Object.values(rest)[0];
    if (other) {
      localStorage.setItem('token', other.token);
      setUser(other.user);
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessions, login, register, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}