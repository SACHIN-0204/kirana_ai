import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginRequest, getMe, setAuthToken, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'kirana_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  // Restore session on page load
  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    setAuthToken(token);
    getMe()
      .then(res => setUser(res.data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email, password) => {
    const res = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
