import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Icon, useTheme, ActivityIndicator } from 'react-native-paper';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import { dailyChallengesService } from '../services/DailyChallengesService';
import type { DailyChallenge, DailyChallengeProgress } from '../types/dailyChallenges';
import { allWordCollections } from '../features/wordCollections';
import type { WordCollection } from '../features/wordCollections/collection.types';
import { useGameStore } from '../stores/useGameStore';

interface DailyChallengesCalendarProps {
  onChallengeSelect?: (challenge: DailyChallenge) => void;
}

const DailyChallengesCalendar: React.FC<DailyChallengesCalendarProps> = ({ 
  onChallengeSelect 
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [progress, setProgress] = useState<Record<string, DailyChallengeProgress>>({});
  const [loading, setLoading] = useState(true);

  // Access upgrade prompt function from game store
  const showUpgradePrompt = useGameStore((state) => state.showUpgradePrompt);

  useEffect(() => {
    loadChallengesForMonth();
  }, [currentMonth]);

  const loadChallengesForMonth = async () => {
    setLoading(true);
    try {
      // Get first and last day of the month
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      const monthChallenges = dailyChallengesService.getChallengesInRange(startDate, endDate);
      const challengeProgress = await dailyChallengesService.getDailyChallengeProgress();
      
      setChallenges(monthChallenges);
      setProgress(challengeProgress);
    } catch (error) {
      console.error('Error loading challenges for month:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (): (number | null)[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getChallengeForDay = (day: number): DailyChallenge | null => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateString = date.toISOString().split('T')[0];
    
    // DEBUG: Add dummy challenge for June 2nd to test upgrade prompt
    if (currentMonth.getMonth() === 5 && day === 2) { // June is month 5 (0-indexed)
      return {
        id: "2024-06-02",
        date: "2024-06-02", 
        startWord: "test",
        targetWord: "upgrade",
        optimalPathLength: 4
      };
    }
    
    return challenges.find(challenge => challenge.date === dateString) || null;
  };

  const getChallengeStatus = (challenge: DailyChallenge | null) => {
    if (!challenge) return 'unavailable';
    
    const today = new Date().toISOString().split('T')[0];
    const isToday = challenge.date === today;
    const isAvailable = dailyChallengesService.isChallengeAvailable(challenge.date);
    const isCompleted = progress[challenge.date]?.completed;
    
    // If it's completed, always show as completed
    if (isCompleted) return 'completed';
    
    // If it's today's challenge, show as today (free)
    if (isToday) return 'today';
    
    // If it's in the future, show as future
    if (!isAvailable) return 'future';
    
    // For past challenges (incomplete), they're locked - need upgrade
    const isPastChallenge = challenge.date < today;
    if (isPastChallenge) {
      return 'locked';
    }
    
    // This shouldn't happen, but fallback
    return 'unavailable';
  };

  // Helper function to check if a date is an equinox or solstice
  const getCelestialEvent = (day: number): string | null => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const month = date.getMonth() + 1; // 1-12
    const dayOfMonth = date.getDate();
    
    // Equinoxes and Solstices (approximate dates)
    if (month === 3 && dayOfMonth === 20) return "Spring Equinox";
    if (month === 6 && (dayOfMonth === 20 || dayOfMonth === 21)) return "Summer Solstice";
    if (month === 9 && dayOfMonth === 22) return "Autumn Equinox";
    if (month === 12 && dayOfMonth === 21) return "Winter Solstice";
    
    return null;
  };

  // Helper function to get active collections for a given date
  const getActiveCollectionsForDate = (date: Date): WordCollection[] => {
    return allWordCollections.filter(collection => {
      if (!collection.startDate || !collection.endDate) return false;
      
      // Create dates for the same year as the given date to handle year transitions
      const startDate = new Date(date.getFullYear(), collection.startDate.getMonth(), collection.startDate.getDate());
      const endDate = new Date(date.getFullYear(), collection.endDate.getMonth(), collection.endDate.getDate());
      
      // Handle events that cross year boundaries (like New Year events)
      if (startDate > endDate) {
        // Event crosses year boundary
        return date >= startDate || date <= endDate;
      } else {
        // Normal date range
        return date >= startDate && date <= endDate;
      }
    });
  };

  // Helper function to get event indicators for a day
  const getEventIndicators = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const activeCollections = getActiveCollectionsForDate(date);
    
    return activeCollections.map(collection => ({
      id: collection.id,
      title: collection.title,
      icon: collection.icon,
      color: getEventColor(collection.id)
    }));
  };

  // Helper function to get event colors
  const getEventColor = (collectionId: string): string => {
    switch (collectionId) {
      case 'renewal':
        return '#4FC3F7'; // Light blue for Renewal & Reflection
      case 'affection':
        return '#FF69B4'; // Pink for Affection & Kinship (includes Valentine's)
      case 'greening':
        return '#66BB6A'; // Green for Greening Earth
      case 'bloom':
        return '#FFB74D'; // Orange/gold for Bloom & Buzz
      case 'high-sun':
        return '#FF5722'; // Red-orange for High Sun & Wildfire
      case 'ripening':
        return '#FFC107'; // Amber for Ripening & Radiance
      case 'amber-harvest':
        return '#FF8F00'; // Deep amber for Amber Harvest
      case 'cider-ember':
        return '#FF6B35'; // Orange for Cider & Ember (includes Halloween)
      case 'fog-frost':
        return '#9E9E9E'; // Gray for Fog & First Frost
      case 'long-night':
        return '#3F51B5'; // Deep blue for Long Night & Spark
      case 'gratitude-gathering':
        return '#8BC34A'; // Light green for Gratitude & Gathering
      case 'equinox-solstice':
        return '#673AB7'; // Purple for Equinox & Solstice
      case 'seasons':
        return '#4CAF50'; // Green for general seasons
      default:
        return colors.secondary; // Default color for other events
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return customColors.startNode;
      case 'today':
        return colors.primary;
      case 'available':
        return colors.onSurfaceVariant;
      case 'locked':
        return colors.onSurfaceDisabled;
      case 'future':
        return colors.onSurfaceDisabled;
      default:
        return 'transparent';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'today':
        return 'star';
      case 'available':
        return 'circle-outline';
      case 'locked':
        return 'lock';
      case 'future':
        return 'lock';
      default:
        return null;
    }
  };

  const handleDayPress = (day: number) => {
    const challenge = getChallengeForDay(day);
    if (challenge && onChallengeSelect) {
      const status = getChallengeStatus(challenge);
      if (status === 'locked') {
        // Show upgrade prompt for locked past challenges
        showUpgradePrompt("Access past daily challenges with Premium! Upgrade to unlock your challenge history and play any missed challenges.");
      } else if (status !== 'future' && status !== 'unavailable') {
        onChallengeSelect(challenge);
      }
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurface }]}>
          Loading challenges...
        </Text>
      </View>
    );
  }

  return (
    <Card style={[styles.calendarCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        {/* Header with month navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigateMonth('prev')}>
            <Icon source="chevron-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.monthTitle, { color: colors.primary }]}>
            {formatMonthYear(currentMonth)}
          </Text>
          
          <TouchableOpacity onPress={() => navigateMonth('next')}>
            <Icon source="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Week day headers */}
        <View style={styles.weekDaysRow}>
          {weekDays.map(day => (
            <Text key={day} style={[styles.weekDayText, { color: colors.onSurfaceVariant }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {getDaysInMonth().map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const challenge = getChallengeForDay(day);
            const status = getChallengeStatus(challenge);
            const statusColor = getStatusColor(status);
            const statusIcon = getStatusIcon(status);
            const eventIndicators = getEventIndicators(day);
            const celestialEvent = getCelestialEvent(day);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  status !== 'unavailable' && styles.availableDayCell,
                  { borderColor: colors.outline }
                ]}
                onPress={() => handleDayPress(day)}
                disabled={status === 'future' || status === 'unavailable'}
              >
                <Text style={[
                  styles.dayNumber, 
                  { color: statusColor },
                  !!celestialEvent && styles.celestialDayNumber
                ]}>
                  {day}
                </Text>
                {statusIcon && (
                  <View style={styles.statusIcon}>
                    <Icon 
                      source={statusIcon} 
                      size={12} 
                      color={statusColor}
                    />
                  </View>
                )}
                {/* Celestial event indicator */}
                {celestialEvent && (
                  <View style={styles.celestialIndicator}>
                    <Icon 
                      source="star-four-points" 
                      size={8} 
                      color="#FFD700"
                    />
                  </View>
                )}
                {/* Event indicators - bottom border bars */}
                {eventIndicators.length > 0 && (
                  <View style={styles.eventBorderBars}>
                    {eventIndicators.slice(0, 3).map((event, idx) => (
                      <View
                        key={event.id}
                        style={[
                          styles.eventBar,
                          { 
                            backgroundColor: event.color,
                            height: eventIndicators.length > 1 ? 2 : 3, // Thinner bars when multiple
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Icon source="check-circle" size={16} color={customColors.startNode} />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Completed
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Icon source="star" size={16} color={colors.primary} />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Today (Free)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Icon source="lock" size={16} color={colors.onSurfaceDisabled} />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Missed (Upgrade)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Icon source="lock" size={16} color={colors.onSurfaceDisabled} />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Future
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Icon source="star-four-points" size={16} color="#FFD700" />
            <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
              Equinox/Solstice
            </Text>
          </View>
        </View>

        {/* Event Legend */}
        <View style={styles.eventLegend}>
          <Text style={[styles.eventLegendTitle, { color: colors.onSurfaceVariant }]}>
            Seasonal Collections:
          </Text>
          <View style={styles.eventLegendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#4FC3F7' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Renewal (Jan)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#FF69B4' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Affection (Feb)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#66BB6A' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Greening (Mar-Apr)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#FFB74D' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Bloom (Apr-May)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#FF5722' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                High Sun (Jun-Jul)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#FFC107' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Ripening (Jul-Aug)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#FF8F00' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Amber Harvest (Sep)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#FF6B35' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Cider & Ember (Oct)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Fog & Frost (Nov)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#3F51B5' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Long Night (Dec)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#8BC34A' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Gratitude (Nov-Dec)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.eventDot, { backgroundColor: '#673AB7' }]} />
              <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
                Equinox (Year-round)
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  calendarCard: {
    margin: 16,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  availableDayCell: {
    borderRadius: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 12,
  },
  eventBorderBars: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  eventBar: {
    flex: 1,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventLegend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  eventLegendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  celestialDayCell: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  celestialDayNumber: {
    fontWeight: 'bold',
  },
  celestialIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
  },
});

export default DailyChallengesCalendar; 