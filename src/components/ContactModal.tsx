import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";

import {
  Dialog,
  Text,
  Portal,
  useTheme,
  Modal,
  TextInput,
  Button,
  Menu,
  Snackbar,
} from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useAuth } from "../context/AuthContext";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import CustomIcon from "./CustomIcon";
import AnimatedPaperButton from "./AnimatedButton";

interface ContactModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type ContactType = "bug" | "feature" | "feedback" | "other";

const ContactModal: React.FC<ContactModalProps> = ({ visible, onDismiss }) => {
  const { colors, roundness } = useTheme() as ExtendedTheme;
  const auth = useAuth();

  // Form state
  const [contactType, setContactType] = useState<ContactType>("feedback");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Scale animation value
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  // Update animation values when visibility changes
  React.useEffect(() => {
    if (visible) {
      // Animate in
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });
      opacity.value = withTiming(1, { duration: 300 });

      // Pre-fill user email if logged in
      if (auth.user?.email) {
        setUserEmail(auth.user.email);
      }
    } else {
      // Reset for next time
      scale.value = 0.9;
      opacity.value = 0;
      // Reset form when modal closes
      resetForm();
    }
  }, [visible, scale, opacity, auth.user?.email]);

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const resetForm = () => {
    setContactType("feedback");
    setSubject("");
    setDescription("");
    setUserEmail(auth.user?.email || "");
    setIsSubmitting(false);
    setShowSuccess(false);
    setShowError(false);
  };

  const contactTypeOptions = [
    { value: "bug", label: "Bug Report", icon: "bug" },
    { value: "feature", label: "Feature Request", icon: "lightbulb-outline" },
    { value: "feedback", label: "Feedback", icon: "comment-outline" },
    { value: "other", label: "Other", icon: "help-circle-outline" },
  ];

  const getContactTypeDetails = (type: ContactType) => {
    switch (type) {
      case "bug":
        return {
          title: "Bug Report",
          placeholder:
            "Please describe the bug you encountered, including steps to reproduce it...",
          subjectPlaceholder: "Brief description of the bug",
        };
      case "feature":
        return {
          title: "Feature Request",
          placeholder: "Please describe the feature you'd like to see added...",
          subjectPlaceholder: "Brief description of the feature",
        };
      case "feedback":
        return {
          title: "Feedback",
          placeholder:
            "Please share your thoughts, suggestions, or general feedback...",
          subjectPlaceholder: "What's this feedback about?",
        };
      case "other":
        return {
          title: "Contact",
          placeholder: "Please describe your inquiry...",
          subjectPlaceholder: "What can we help you with?",
        };
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setShowError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Import SupabaseService to call the contact form edge function
      const { SupabaseService } = await import("../services/SupabaseService");
      const supabaseService = SupabaseService.getInstance();
      const supabase = supabaseService.getSupabaseClient();

      const response = await supabase.functions.invoke("submit-contact-form", {
        body: {
          type: contactType,
          subject: subject.trim(),
          description: description.trim(),
          userEmail: userEmail.trim() || undefined,
          userId: auth.user?.id || undefined,
        },
      });

      if (response.error) {
        throw new Error(
          `Failed to submit contact form: ${response.error.message}`,
        );
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(
          result.error || "Unknown error submitting contact form",
        );
      }

      console.log("Contact form submitted successfully:", result.id);
      setShowSuccess(true);

      // Close modal after showing success
      setTimeout(() => {
        onDismiss();
      }, 2000);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeDetails = getContactTypeDetails(contactType);
  const isFormValid = subject.trim() && description.trim();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer]}
      >
        <Animated.View style={[animatedStyle, styles.animatedContainer]}>
          <Dialog
            visible={true}
            onDismiss={onDismiss}
            style={[
              styles.dialogBase,
              { backgroundColor: colors.surface, borderColor: colors.outline },
            ]}
          >
            <Dialog.Title style={[styles.title, { color: colors.primary }]}>
              Contact Us
            </Dialog.Title>
            <Dialog.Content style={{ maxHeight: 600, paddingBottom: 0 }}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text
                  style={[styles.sectionLabel, { color: colors.onSurface }]}
                >
                  What can we help you with?
                </Text>
                <Menu
                  visible={dropdownVisible}
                  onDismiss={() => setDropdownVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setDropdownVisible(true)}
                      style={[
                        styles.dropdownButton,
                        { backgroundColor: colors.surface },
                      ]}
                      contentStyle={styles.dropdownButtonContent}
                      icon={() => (
                        <CustomIcon
                          source="chevron-down"
                          size={20}
                          color={colors.onSurface}
                        />
                      )}
                    >
                      {contactTypeOptions.find(
                        (option) => option.value === contactType,
                      )?.label || "Select contact type"}
                    </Button>
                  }
                  contentStyle={{ backgroundColor: colors.surface }}
                >
                  {contactTypeOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      title={option.label}
                      leadingIcon={() => (
                        <CustomIcon
                          source={option.icon}
                          size={24}
                          color={colors.onSurface}
                        />
                      )}
                      onPress={() => {
                        setContactType(option.value as ContactType);
                        setDropdownVisible(false);
                      }}
                      titleStyle={{ color: colors.onSurface }}
                    />
                  ))}
                </Menu>

                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurface, marginTop: 20 },
                  ]}
                >
                  Subject
                </Text>
                <TextInput
                  mode="outlined"
                  value={subject}
                  onChangeText={setSubject}
                  placeholder={typeDetails.subjectPlaceholder}
                  style={styles.textInput}
                  maxLength={100}
                />

                {!auth.user && (
                  <>
                    <Text
                      style={[
                        styles.sectionLabel,
                        { color: colors.onSurface, marginTop: 16 },
                      ]}
                    >
                      Your Email (optional)
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={userEmail}
                      onChangeText={setUserEmail}
                      placeholder="your.email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                  </>
                )}

                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurface, marginTop: 16 },
                  ]}
                >
                  Description
                </Text>
                <TextInput
                  mode="outlined"
                  value={description}
                  onChangeText={setDescription}
                  placeholder={typeDetails.placeholder}
                  multiline
                  numberOfLines={6}
                  style={[styles.textInput, styles.multilineInput]}
                  maxLength={1000}
                />

                <Text
                  style={[styles.charCount, { color: colors.onSurfaceVariant }]}
                >
                  {description.length}/1000 characters
                </Text>

                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    loading={isSubmitting}
                    style={styles.submitButton}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </View>
              </ScrollView>
            </Dialog.Content>
            <View style={styles.closeButtonContainer}>
              <AnimatedPaperButton
                mode="text"
                onPress={onDismiss}
                style={styles.closeButton}
              >
                <CustomIcon
                  source="close"
                  size={24}
                  color={colors.onSurfaceVariant}
                />
              </AnimatedPaperButton>
            </View>
          </Dialog>
        </Animated.View>

        <Snackbar
          visible={showSuccess}
          onDismiss={() => setShowSuccess(false)}
          duration={3000}
          style={{ backgroundColor: colors.primary }}
        >
          Message sent successfully! We'll get back to you soon.
        </Snackbar>

        <Snackbar
          visible={showError}
          onDismiss={() => setShowError(false)}
          duration={3000}
          style={{ backgroundColor: colors.error }}
        >
          Please fill in all required fields.
        </Snackbar>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  animatedContainer: {
    width: "100%",
  },
  dialogBase: {
    borderWidth: 1,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    marginBottom: 4,
  },
  multilineInput: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  submitButton: {
    minWidth: 150,
  },
  dropdownButton: {
    marginBottom: 16,
  },
  dropdownButtonContent: {
    justifyContent: "flex-start",
  },
  closeButtonContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  closeButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ContactModal;
