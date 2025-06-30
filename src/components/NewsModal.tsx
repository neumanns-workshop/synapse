import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";

import {
  Dialog,
  Text,
  Portal,
  useTheme,
  Modal,
  Card,
  Button,
} from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import {
  newsArticles,
  getSortedArticles,
  formatNewsDate,
  getUnreadArticles,
} from "../data/news";
import type { NewsArticle } from "../data/news";
import { unifiedDataStore } from "../services/UnifiedDataStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface NewsModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ visible, onDismiss }) => {
  const { customColors, colors, roundness } = useTheme() as ExtendedTheme;

  // News-related state
  const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
  const [, setNewsLoading] = useState(true);

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
      loadReadArticles();
    } else {
      // Reset for next time
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const loadReadArticles = async () => {
    try {
      const readIds = await unifiedDataStore.getReadArticleIds();
      setReadArticleIds(readIds);
    } catch (error) {
      console.error("Error loading read articles:", error);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleArticlePress = async (article: NewsArticle) => {
    // Mark article as read
    if (!readArticleIds.includes(article.id)) {
      await unifiedDataStore.markArticleAsRead(article.id);
      setReadArticleIds((prev) => [...prev, article.id]);
    }
  };

  const handleMarkAllRead = async () => {
    const allArticleIds = newsArticles.map((article) => article.id);
    await unifiedDataStore.markAllArticlesAsRead(allArticleIds);
    setReadArticleIds(allArticleIds);
  };

  const handleClose = async () => {
    // Update last checked timestamp when closing
    await unifiedDataStore.updateLastNewsCheck();
    onDismiss();
  };

  const getPriorityColor = (priority: NewsArticle["priority"]) => {
    switch (priority) {
      case "high":
        return customColors.endNode; // Target color (coral)
      case "medium":
        return customColors.currentNode; // Current color (blue)
      case "low":
        return customColors.startNode; // Start color (green)
      default:
        return colors.onSurfaceVariant;
    }
  };

  const sortedArticles = getSortedArticles();
  const unreadArticles = getUnreadArticles(readArticleIds);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={[styles.modalContainer]}
      >
        <Animated.View style={[animatedStyle, styles.animatedContainer]}>
          <Dialog
            visible={true}
            onDismiss={handleClose}
            style={[
              styles.dialogBase,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outline,
                borderRadius: roundness * 2,
              },
            ]}
          >
            <Dialog.Content style={{ maxHeight: 500, paddingBottom: 0 }}>
              <View style={styles.newsHeaderContainer}>
                <Dialog.Title
                  style={[styles.tabTitle, { color: colors.primary, flex: 1 }]}
                >
                  News & Updates
                </Dialog.Title>
                {unreadArticles.length > 0 && (
                  <Button
                    mode="outlined"
                    onPress={handleMarkAllRead}
                    style={styles.markAllReadButtonSmall}
                    labelStyle={styles.markAllReadButtonLabel}
                    compact
                  >
                    Mark All Read
                  </Button>
                )}
              </View>

              <ScrollView
                style={styles.newsScrollContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {sortedArticles.length === 0 ? (
                  <View style={styles.newsEmptyState}>
                    <Text
                      style={{
                        color: colors.onSurfaceVariant,
                        textAlign: "center",
                      }}
                    >
                      No news articles available.
                    </Text>
                  </View>
                ) : (
                  sortedArticles.map((article, index) => {
                    const isUnread = !readArticleIds.includes(article.id);
                    const priorityColor = getPriorityColor(article.priority);

                    return (
                      <React.Fragment key={article.id}>
                        <Card
                          style={[
                            styles.newsArticleCard,
                            {
                              backgroundColor: isUnread
                                ? colors.surfaceVariant
                                : colors.surface,
                              borderColor: isUnread
                                ? priorityColor
                                : colors.outline,
                              borderWidth: isUnread ? 2 : 0.5,
                            },
                          ]}
                          onPress={() => handleArticlePress(article)}
                        >
                          <Card.Content style={styles.newsArticleContent}>
                            <View style={styles.newsArticleHeader}>
                              <Text
                                style={[
                                  styles.newsDateText,
                                  { color: colors.onSurfaceVariant },
                                ]}
                              >
                                {formatNewsDate(article.date)}
                              </Text>
                              {isUnread && (
                                <View
                                  style={[
                                    styles.newsUnreadDot,
                                    { backgroundColor: priorityColor },
                                  ]}
                                />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.newsArticleTitle,
                                {
                                  color: colors.onSurface,
                                  fontWeight: isUnread ? "600" : "500",
                                },
                              ]}
                              variant="titleMedium"
                            >
                              {article.title}
                            </Text>
                            <Text
                              style={[
                                styles.newsArticleText,
                                {
                                  color: colors.onSurfaceVariant,
                                  opacity: isUnread ? 1 : 0.8,
                                },
                              ]}
                              variant="bodyMedium"
                            >
                              {article.content}
                            </Text>
                          </Card.Content>
                        </Card>
                        {index < sortedArticles.length - 1 && (
                          <View
                            style={[
                              styles.newsDivider,
                              { backgroundColor: colors.outline },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </ScrollView>
            </Dialog.Content>
          </Dialog>
        </Animated.View>
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
  tabTitle: {
    fontWeight: "bold",
    fontSize: 22,
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  newsHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  markAllReadButtonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllReadButtonLabel: {
    fontSize: 14,
  },
  newsScrollContainer: {
    flex: 1,
  },
  newsArticleCard: {
    borderRadius: 8,
    marginBottom: 8,
  },
  newsArticleContent: {
    padding: 16,
  },
  newsArticleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newsDateText: {
    flex: 1,
  },
  newsUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  newsArticleTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  newsArticleText: {
    marginTop: 4,
  },
  newsEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  newsDivider: {
    height: 1,
  },
});

export default NewsModal;
