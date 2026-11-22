import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrf, setCsrf] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/auth/me').then(data => { setUser(data.user); setCsrf(data.csrf_token); }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const value = useMemo(() => ({
    user, csrf, ready,
    signIn(nextUser, nextCsrf) { setUser(nextUser); setCsrf(nextCsrf); },
    async signOut() {
      try { if (csrf) await api('/auth/logout', { method: 'POST', csrf }); } catch { /* The local session may already have expired. */ }
      setUser(null); setCsrf('');
    },
  }), [user, csrf, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
