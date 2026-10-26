"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/api/auth";
import type { OtpDestinationType } from "@/lib/api/auth";
import type { User } from "@/lib/api/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOtp: (
    destination: string,
    destinationType: OtpDestinationType,
    otpCode: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getAuthenticatedUser = useCallback(async () => {
    const currentUser = await authApi.getCurrentUser();
    if (!currentUser) {
      throw new Error("Sign in did not establish an authenticated session.");
    }
    return currentUser;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    const onExpired = () => setUser(null);
    window.addEventListener("fieldnotes:session-expired", onExpired);
    return () =>
      window.removeEventListener("fieldnotes:session-expired", onExpired);
  }, [refreshUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      const currentUser = await getAuthenticatedUser();
      setUser(currentUser);
      setLoading(false);
    },
    [getAuthenticatedUser],
  );

  const signInWithOtp = useCallback(
    async (
      destination: string,
      destinationType: OtpDestinationType,
      otpCode: string,
    ) => {
      await authApi.verifyLoginOtp(destination, destinationType, otpCode);
      const currentUser = await getAuthenticatedUser();
      setUser(currentUser);
      setLoading(false);
    },
    [getAuthenticatedUser],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, refreshUser, signIn, signInWithOtp, signOut, setUser }),
    [user, loading, refreshUser, signIn, signInWithOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
