// @ts-nocheck
// This example file lives outside the frontend project, so VS Code may not see React types here.
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi, setToken, clearToken, getToken } from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (!getToken()) {
        setUser(null);
        return;
      }

      const data = await authApi.me();
      setUser(data.user);
    } catch {
      clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    const restoreUser = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    restoreUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login({ email, password });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => {
    try {
      const data = await authApi.register({ email, password, name, phone });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, refreshUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
