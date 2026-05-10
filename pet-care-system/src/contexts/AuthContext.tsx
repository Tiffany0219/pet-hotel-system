import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { API_BASE } from "../config";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "API 發生錯誤");
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (!getToken()) {
        setUser(null);
        return;
      }

      const data = await apiRequest("/auth/me");
      setUser(data.user);
    } catch (error) {
      clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    async function restoreUser() {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }

    restoreUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(data.token);
      setUser(data.user);

      return data.user;
    } catch (error) {
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
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          name,
          phone,
        }),
      });

      setToken(data.token);
      setUser(data.user);

      return data.user;
    } catch (error) {
      return null;
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth 必須在 AuthProvider 裡使用");
  }

  return context;
}
