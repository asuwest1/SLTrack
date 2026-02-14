import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    api.getCurrentUser()
      .then(setUser)
      .catch(() => {
        setUser(null);
        setAuthError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.Role === 'SystemAdmin';
  const canEdit = user?.Role === 'SystemAdmin' || user?.Role === 'SoftwareAdmin';
  const canViewSettings = user?.Role === 'SystemAdmin';

  return (
    <AuthContext.Provider value={{ user, loading, authError, isAdmin, canEdit, canViewSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
