import React from 'react';
import { StyleSheet, View, Dimensions, Image, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, IconButton, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import { useTutorial } from '../context/TutorialContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 40, 500); // Max width of 500, or screen width - 40px padding
const MODAL_HEIGHT = Math.min(SCREEN_HEIGHT - 80, 540); // Dynamic height based on screen size

const TutorialModal: React.FC = () => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const {
    showTutorial,
    currentStep,
    steps,
    skipTutorial,
    nextStep,
    previousStep,
  } = useTutorial();

  const currentTutorialStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Portal>
      <Modal
        visible={showTutorial}
        onDismiss={skipTutorial}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: colors.surface },
        ]}
        style={{ backgroundColor: 'rgba(20,20,20,0.95)' }}
      >
        <View style={styles.contentContainer}>
          <IconButton
            icon="close"
            size={24}
            onPress={skipTutorial}
            style={styles.closeButton}
          />
          
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: colors.primary }]}
          >
            {currentTutorialStep.title}
          </Text>

          <ScrollView style={styles.scrollArea} contentContainerStyle={{ alignItems: 'center', paddingBottom: 8 }}>
            {currentTutorialStep.iconComponent ? (
              <currentTutorialStep.iconComponent width={120} height={120} style={{ alignSelf: 'center', marginBottom: 16 }} />
            ) : currentTutorialStep.image && (
              <View style={styles.imageWrapper}>
                <Image
                  source={currentTutorialStep.image}
                  style={[
                    styles.tutorialImage,
                    { borderColor: colors.outline },
                  ]}
                  resizeMode="contain"
                />
              </View>
            )}
            <Text
              variant="bodyLarge"
              style={[styles.contentText, { color: colors.onSurface }]}
            >
              {currentTutorialStep.content}
            </Text>
          </ScrollView>

          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index === currentStep
                      ? colors.primary
                      : colors.onSurfaceDisabled,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <Button
                mode="outlined"
                onPress={previousStep}
                style={styles.navButton}
              >
                Previous
              </Button>
            )}
            
            <Button
              mode="contained"
              onPress={nextStep}
              style={styles.navButton}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    margin: 20,
    padding: 20,
    borderRadius: 8,
    elevation: 5,
    alignSelf: 'center',
  },
  contentContainer: {
    flex: 1,
    height: '100%',
    padding: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
    margin: 0,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
  contentText: {
    marginBottom: 24,
    lineHeight: 24,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
  },
  tutorialImage: {
    width: 320,
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#232323', // fallback background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    alignSelf: 'center',
  },
  imageWrapper: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  textScroll: {
    flex: 1,
    marginBottom: 8,
  },
});

export default TutorialModal; 