import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import {
  ProgressiveSyncService,
  SyncProgress,
} from "../services/ProgressiveSyncService";
import ProgressiveSyncIndicator from "./ProgressiveSyncIndicator";

interface SyncProgressContextType {
  isSyncing: boolean;
  currentProgress: SyncProgress | null;
  showSyncProgress: boolean;
  setShowSyncProgress: (show: boolean) => void;
}

const SyncProgressContext = createContext<SyncProgressContextType | undefined>(
  undefined,
);

interface SyncProgressProviderProps {
  children: ReactNode;
}

/**
 * Provider that automatically displays sync progress indicators
 * when progressive sync operations are running.
 *
 * Usage:
 * ```tsx
 * <SyncProgressProvider>
 *   <YourApp />
 * </SyncProgressProvider>
 * ```
 */
export const SyncProgressProvider: React.FC<SyncProgressProviderProps> = ({
  children,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<SyncProgress | null>(
    null,
  );
  const [showSyncProgress, setShowSyncProgress] = useState(true); // Can be controlled by user preferences

  useEffect(() => {
    const progressiveSyncService = ProgressiveSyncService.getInstance();

    // Subscribe to sync progress updates
    const unsubscribe = progressiveSyncService.onSyncProgress((progress) => {
      setCurrentProgress(progress);
      setIsSyncing(true);

      // Auto-hide after completion
      if (progress.completed && progress.stepNumber === progress.totalSteps) {
        setTimeout(() => {
          setIsSyncing(false);
          setCurrentProgress(null);
        }, 1500); // Show completion state briefly
      }
    });

    return unsubscribe;
  }, []);

  const contextValue: SyncProgressContextType = {
    isSyncing,
    currentProgress,
    showSyncProgress,
    setShowSyncProgress,
  };

  return (
    <SyncProgressContext.Provider value={contextValue}>
      {children}

      {/* Global sync progress indicator */}
      <ProgressiveSyncIndicator
        visible={showSyncProgress && isSyncing && currentProgress !== null}
        onComplete={() => {
          setIsSyncing(false);
          setCurrentProgress(null);
        }}
      />
    </SyncProgressContext.Provider>
  );
};

export const useSyncProgress = (): SyncProgressContextType => {
  const context = useContext(SyncProgressContext);
  if (context === undefined) {
    throw new Error(
      "useSyncProgress must be used within a SyncProgressProvider",
    );
  }
  return context;
};

export default SyncProgressProvider;
