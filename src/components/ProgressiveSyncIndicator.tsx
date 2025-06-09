import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { ProgressiveSyncService } from '../services/ProgressiveSyncService';
import type { SyncProgress } from '../services/ProgressiveSyncService';
import type { ExtendedTheme } from '../theme/SynapseTheme';

interface ProgressiveSyncIndicatorProps {
  visible: boolean;
  onComplete?: (success: boolean) => void;
}

export const ProgressiveSyncIndicator: React.FC<ProgressiveSyncIndicatorProps> = ({
  visible,
  onComplete,
}) => {
  const { theme: appTheme } = useAppTheme();
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSyncProgress(null);
      setIsComplete(false);
      return;
    }

    const progressiveSyncService = ProgressiveSyncService.getInstance();
    
    // Subscribe to sync progress updates
    const unsubscribe = progressiveSyncService.onSyncProgress((progress) => {
      setSyncProgress(progress);
      
      if (progress.completed && progress.stepNumber === progress.totalSteps) {
        setIsComplete(true);
        setTimeout(() => {
          onComplete?.(true);
        }, 1000); // Show completion state briefly before calling onComplete
      }
    });

    return unsubscribe;
  }, [visible, onComplete]);

  if (!visible || !syncProgress) {
    return null;
  }

  const getStepIcon = (stepType: SyncProgress['step']) => {
    switch (stepType) {
      case 'profile':
        return '👤';
      case 'challenges':
        return '🎯';
      case 'achievements':
        return '🏆';
      case 'history':
        return '📊';
      default:
        return '🔄';
    }
  };

  const progressPercentage = (syncProgress.stepNumber / syncProgress.totalSteps) * 100;
  const styles = createStyles(appTheme);

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>Syncing Your Data</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
        
        {/* Current Step */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepIcon}>
            {getStepIcon(syncProgress.step)}
          </Text>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepMessage}>
              {syncProgress.message}
            </Text>
            <Text style={styles.stepCount}>
              Step {syncProgress.stepNumber} of {syncProgress.totalSteps}
            </Text>
          </View>
          
          {!isComplete && (
            <ActivityIndicator 
              size="small" 
              color={appTheme.colors.primary} 
              style={styles.spinner}
            />
          )}
          
          {isComplete && (
            <Text style={styles.checkmark}>✅</Text>
          )}
        </View>
        
        {/* Steps Preview */}
        <View style={styles.stepsPreview}>
          {['profile', 'challenges', 'achievements', 'history'].map((step, index) => (
            <View 
              key={step}
              style={[
                styles.stepDot,
                index < syncProgress.stepNumber ? styles.stepDotCompleted : {},
                index === syncProgress.stepNumber - 1 ? styles.stepDotActive : {}
              ]}
            >
              <Text style={styles.stepDotText}>
                {getStepIcon(step as SyncProgress['step'])}
              </Text>
            </View>
          ))}
        </View>

        {isComplete && (
          <Text style={styles.completedText}>
            Sync completed successfully! 🎉
          </Text>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: ExtendedTheme) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.colors.onSurface,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.customColors.currentNode,
    borderRadius: 2,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  stepIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepMessage: {
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  stepCount: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  spinner: {
    marginLeft: 12,
  },
  checkmark: {
    fontSize: 20,
    marginLeft: 12,
  },
  stepsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotCompleted: {
    backgroundColor: theme.customColors.startNode,
  },
  stepDotActive: {
    backgroundColor: theme.customColors.currentNode,
  },
  stepDotText: {
    fontSize: 16,
  },
  completedText: {
    fontSize: 16,
    color: theme.customColors.startNode,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProgressiveSyncIndicator; 