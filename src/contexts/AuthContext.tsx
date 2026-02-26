import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getToken, getUser, setToken, setUser, clearUser, clearAuth } from "@/lib/api";

type AuthUser = { id: number; email?: string; username?: string } | null;

const AuthContext = createContext<{
  user: AuthUser;
  isAuthenticated: boolean;
  login: (jwt: string, user: AuthUser) => void;
  logout: () => void;
  setUserFromStorage: () => void;
}>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  setUserFromStorage: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser>(() => (getToken() ? getUser() : null));

  const setUserFromStorage = useCallback(() => {
    if (getToken()) setUserState(getUser());
    else setUserState(null);
  }, []);

  useEffect(() => {
    setUserFromStorage();
  }, [setUserFromStorage]);

  const login = useCallback((jwt: string, u: AuthUser) => {
    setToken(jwt);
    if (u) setUser(u);
    else clearUser();
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!getToken(),
        login,
        logout,
        setUserFromStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
