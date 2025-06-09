import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { User } from "@supabase/supabase-js";

import SupabaseService, {
  AuthState,
  UserProfile,
} from "../services/SupabaseService";

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    emailUpdatesOptIn?: boolean,
  ) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateEmailPreferences: (
    emailUpdatesOptIn: boolean,
  ) => Promise<{ error: any }>;
  updatePrivacySettings: (
    privacyUpdates: Partial<UserProfile["privacy_settings"]>,
  ) => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
  syncDataToCloud: () => Promise<{ error: any }>;
  syncDataFromCloud: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
  });

  const supabaseService = SupabaseService.getInstance();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = supabaseService.onAuthStateChange((newState) => {
      setAuthState(newState);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await supabaseService.signIn(email, password);
    return { error: result.error };
  };

  const signUp = async (
    email: string,
    password: string,
    emailUpdatesOptIn = false,
  ) => {
    const result = await supabaseService.signUp(
      email,
      password,
      emailUpdatesOptIn,
    );
    return { error: result.error };
  };

  const signOut = async () => {
    const result = await supabaseService.signOut();
    return { error: result.error };
  };

  const resetPassword = async (email: string) => {
    const result = await supabaseService.resetPassword(email);
    return { error: result.error };
  };

  const updateEmailPreferences = async (emailUpdatesOptIn: boolean) => {
    const result =
      await supabaseService.updateEmailPreferences(emailUpdatesOptIn);
    return { error: result?.error || null };
  };

  const updatePrivacySettings = async (
    privacyUpdates: Partial<UserProfile["privacy_settings"]>,
  ) => {
    const result = await supabaseService.updatePrivacySettings(privacyUpdates);
    return { error: result?.error || null };
  };

  const deleteAccount = async () => {
    const result = await supabaseService.deleteAccount();
    return { error: result?.error || null };
  };

  const syncDataToCloud = async () => {
    const { ProgressiveSyncService } = await import('../services/ProgressiveSyncService');
    const progressiveSync = ProgressiveSyncService.getInstance();
    const result = await progressiveSync.syncToCloud();
    return { error: result.success ? null : result.error };
  };

  const syncDataFromCloud = async () => {
    const { ProgressiveSyncService } = await import('../services/ProgressiveSyncService');
    const progressiveSync = ProgressiveSyncService.getInstance();
    const result = await progressiveSync.syncFromCloud();
    return { error: result.success ? null : result.error };
  };

  const refreshProfile = async () => {
    const result = await supabaseService.refreshUserProfile();
    return { error: result?.error || null };
  };

  const contextValue: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateEmailPreferences,
    updatePrivacySettings,
    deleteAccount,
    syncDataToCloud,
    syncDataFromCloud,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
