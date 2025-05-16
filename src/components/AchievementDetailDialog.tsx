import React from 'react';
import { Portal, Dialog, Text, Button, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import type { Achievement } from '../features/achievements/achievements';

interface AchievementDetailDialogProps {
  achievement: Achievement | null;
  visible: boolean;
  onDismiss: () => void;
}

const AchievementDetailDialog: React.FC<AchievementDetailDialogProps> = ({ achievement, visible, onDismiss }) => {
  const { colors } = useTheme() as ExtendedTheme;

  if (!achievement) return null;

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={onDismiss}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          borderWidth: 1,
          borderRadius: 8, // Consistent with other dialogs
          maxWidth: 500, // Max width for readability
          width: '90%',    // Responsive width
          alignSelf: 'center',
        }}
      >
        <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold' }}>
          {achievement.name}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {achievement.description}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.primary}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default AchievementDetailDialog; 