"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiService, type User, type AuthResponse, type LoginCredentials, type RegisterCredentials } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  connectWallet: (walletAddress: string) => Promise<AuthResponse>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const profile = await apiService.getProfile();
          if (profile) {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        // Clear invalid token
        await apiService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login(credentials);

      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setError(response.message || "Login failed");
      }

      return response;
    } catch (error: any) {
      const errorMessage = error.message || "Login failed";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.register(credentials);

      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setError(response.message || "Registration failed");
      }

      return response;
    } catch (error: any) {
      const errorMessage = error.message || "Registration failed";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await apiService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      if (apiService.isAuthenticated()) {
        const profile = await apiService.getProfile();
        if (profile) {
          setUser(profile);
        }
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      // If profile refresh fails, it might mean token is invalid
      await logout();
    }
  }, [logout]);

  const connectWallet = useCallback(async (walletAddress: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.connectWallet(walletAddress);

      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setError(response.message || "Wallet connection failed");
      }

      return response;
    } catch (error: any) {
      const errorMessage = error.message || "Wallet connection failed";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
    connectWallet,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for protected components that require authentication
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login page
      window.location.href = "/login";
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  return auth;
}

// Hook for checking specific permissions
export function usePermissions() {
  const { user } = useAuth();

  return {
    canTrade: user?.tradingEnabled || false,
    isVerified: user?.isVerified || false,
    isAdmin: user?.id === "admin" || false, // Simplified admin check
    canUseAutoTrading: user?.autoTrading || false,
    riskLevel: user?.riskTolerance || "LOW",
    maxPositionSize: user?.maxPositionSize || 1000,
  };
}
