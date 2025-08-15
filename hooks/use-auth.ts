"use client";

import { useState, useEffect } from "react";
import { auth, User, AuthState } from "@/lib/auth";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      const user = auth.getCurrentUser();
      setAuthState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    };

    // Only run on client side
    if (typeof window !== "undefined") {
      checkAuth();

      // Listen for storage changes (for multi-tab support)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "FirstDraft_current_user") {
          checkAuth();
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const user = await auth.login(email, password);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string
  ): Promise<User> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const user = await auth.signup(email, password, name);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    auth.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return {
    ...authState,
    login,
    signup,
    logout,
  };
}
