"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, ApiError } from "./api";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  college?: string;
  targetPercentage?: number;
  avatar?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, pass: string, college?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check HTTP-Only Cookie Session on App Mount
  const checkSession = async () => {
    try {
      setIsLoading(true);
      const res = await api.auth.me();
      if (res && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.auth.login({ email, password: pass });
      if (res && res.user) {
        if ((res as any).token && typeof window !== "undefined") {
          localStorage.setItem("bunkpulse_token", (res as any).token);
        }
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event("authChange"));
        return { success: true };
      }
      return { success: false, error: "Login response missing user." };
    } catch (err: any) {
      return {
        success: false,
        error: err instanceof ApiError ? err.message : "Login failed. Please check your credentials.",
      };
    }
  };

  const signup = async (
    name: string,
    email: string,
    pass: string,
    college: string = "School of Engineering"
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.auth.signup({ name, email, password: pass, college });
      if (res && res.user) {
        if ((res as any).token && typeof window !== "undefined") {
          localStorage.setItem("bunkpulse_token", (res as any).token);
        }
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event("authChange"));
        return { success: true };
      }
      return { success: false, error: "Signup response missing user." };
    } catch (err: any) {
      return {
        success: false,
        error: err instanceof ApiError ? err.message : "Failed to create account.",
      };
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("bunkpulse_token");
      }
      await api.auth.logout();
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.dispatchEvent(new Event("authChange"));
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.me();
      if (res && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        login,
        signup,
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
    return {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (): Promise<{ success: boolean; error?: string }> => ({ success: true }),
      signup: async (): Promise<{ success: boolean; error?: string }> => ({ success: true }),
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
