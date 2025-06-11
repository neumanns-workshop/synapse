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

interface AuthResult {
  error: Error | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    emailUpdatesOptIn?: boolean,
  ) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updateEmailPreferences: (emailUpdatesOptIn: boolean) => Promise<AuthResult>;
  updatePrivacySettings: (
    privacyUpdates: Partial<UserProfile["privacy_settings"]>,
  ) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
  syncDataToCloud: () => Promise<AuthResult>;
  syncDataFromCloud: () => Promise<AuthResult>;
  refreshProfile: () => Promise<AuthResult>;
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

  // Helper to convert unknown errors to Error | null
  const toAuthResult = (error: unknown): AuthResult => ({
    error:
      error instanceof Error ? error : error ? new Error(String(error)) : null,
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = supabaseService.onAuthStateChange((newState) => {
      setAuthState(newState);
    });

    return unsubscribe;
  }, []);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const result = await supabaseService.signIn(email, password);
    return toAuthResult(result.error);
  };

  const signUp = async (
    email: string,
    password: string,
    emailUpdatesOptIn = false,
  ): Promise<AuthResult> => {
    const result = await supabaseService.signUp(
      email,
      password,
      emailUpdatesOptIn,
    );
    return toAuthResult(result.error);
  };

  const signOut = async (): Promise<AuthResult> => {
    const result = await supabaseService.signOut();
    return toAuthResult(result.error);
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    const result = await supabaseService.resetPassword(email);
    return toAuthResult(result.error);
  };

  const updateEmailPreferences = async (
    emailUpdatesOptIn: boolean,
  ): Promise<AuthResult> => {
    const result =
      await supabaseService.updateEmailPreferences(emailUpdatesOptIn);
    return toAuthResult(result?.error);
  };

  const updatePrivacySettings = async (
    privacyUpdates: Partial<UserProfile["privacy_settings"]>,
  ): Promise<AuthResult> => {
    const result = await supabaseService.updatePrivacySettings(privacyUpdates);
    return toAuthResult(result?.error);
  };

  const deleteAccount = async (): Promise<AuthResult> => {
    const result = await supabaseService.deleteAccount();
    return toAuthResult(result?.error);
  };

  const syncDataToCloud = async (): Promise<AuthResult> => {
    const { ProgressiveSyncService } = await import(
      "../services/ProgressiveSyncService"
    );
    const progressiveSync = ProgressiveSyncService.getInstance();
    const result = await progressiveSync.syncToCloud();
    return toAuthResult(result.success ? null : result.error);
  };

  const syncDataFromCloud = async (): Promise<AuthResult> => {
    const { ProgressiveSyncService } = await import(
      "../services/ProgressiveSyncService"
    );
    const progressiveSync = ProgressiveSyncService.getInstance();
    const result = await progressiveSync.syncFromCloud();
    return toAuthResult(result.success ? null : result.error);
  };

  const refreshProfile = async (): Promise<AuthResult> => {
    const result = await supabaseService.refreshUserProfile();
    return toAuthResult(result?.error);
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
