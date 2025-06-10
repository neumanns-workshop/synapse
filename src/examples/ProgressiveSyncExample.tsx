import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ProgressiveSyncService } from '../services/ProgressiveSyncService';
import ProgressiveSyncIndicator from '../components/ProgressiveSyncIndicator';

/**
 * Example component showing how to use the Progressive Data Sync system
 * 
 * This demonstrates:
 * 1. Manual sync triggers (useful for settings screens, manual refresh)
 * 2. Progress indication during sync
 * 3. Error handling
 * 4. Success/failure feedback
 */
export const ProgressiveSyncExample: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const progressiveSyncService = ProgressiveSyncService.getInstance();

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    
    try {
      const result = await progressiveSyncService.syncToCloud();
      
      if (result.success) {
        setLastSyncTime(new Date());
        Alert.alert(
          'Sync Successful',
          `Your data has been synced to the cloud in ${result.totalTime}ms!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Failed',
          `Failed to sync data: ${result.error?.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromCloud = async () => {
    setIsSyncing(true);
    
    try {
      const result = await progressiveSyncService.syncFromCloud();
      
      if (result.success) {
        setLastSyncTime(new Date());
        Alert.alert(
          'Sync Successful',
          `Your data has been loaded from the cloud in ${result.totalTime}ms!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Failed',
          `Failed to load data: ${result.error?.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncComplete = (success: boolean) => {
    setIsSyncing(false);
    if (success) {
      setLastSyncTime(new Date());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progressive Data Sync Demo</Text>
      
      <Text style={styles.description}>
        This demonstrates the progressive sync system that breaks data synchronization 
        into logical steps with progress indicators.
      </Text>

      <View style={styles.syncSteps}>
        <Text style={styles.sectionTitle}>Sync Priority Order:</Text>
        <View style={styles.stepItem}>
          <Text style={styles.stepIcon}>👤</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepName}>1. User Profile</Text>
            <Text style={styles.stepDesc}>Critical auth data, premium status</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <Text style={styles.stepIcon}>🎯</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepName}>2. Daily Challenges</Text>
            <Text style={styles.stepDesc}>Time-sensitive game data</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <Text style={styles.stepIcon}>🏆</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepName}>3. Achievements & Stats</Text>
            <Text style={styles.stepDesc}>User progress and unlocks</Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <Text style={styles.stepIcon}>📊</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepName}>4. Game History</Text>
            <Text style={styles.stepDesc}>Bulk historical data</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={[styles.button, styles.uploadButton]}
          onPress={handleSyncToCloud}
          disabled={isSyncing}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? 'Syncing...' : 'Sync to Cloud ☁️'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.downloadButton]}
          onPress={handleSyncFromCloud}
          disabled={isSyncing}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? 'Syncing...' : 'Sync from Cloud 📱'}
          </Text>
        </TouchableOpacity>
      </View>

      {lastSyncTime && (
        <Text style={styles.lastSync}>
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </Text>
      )}

      <Text style={styles.note}>
        💡 Note: Progressive sync maintains existing compression and all current 
        storage optimizations while providing better user feedback and logical 
        data prioritization.
      </Text>

      {/* Progress Indicator Overlay */}
      <ProgressiveSyncIndicator 
        visible={isSyncing}
        onComplete={handleSyncComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  syncSteps: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  stepText: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 14,
    color: '#666',
  },
  buttons: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  downloadButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSync: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProgressiveSyncExample; 