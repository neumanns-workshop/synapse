import React from 'react';
import { View, Text, Platform, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface FooterProps {
  onLegalPageRequest?: (page: 'terms' | 'privacy' | 'dmca' | 'about' | 'contact') => void;
}

export const Footer: React.FC<FooterProps> = ({ onLegalPageRequest }) => {
  const { theme } = useTheme();

  const handleLegalLinkPress = (page: 'terms' | 'privacy' | 'dmca' | 'about' | 'contact') => {
    if (Platform.OS === 'web') {
      // For web, open in new tab
      const urls = {
        terms: '/terms',
        privacy: '/privacy',
        dmca: '/dmca',
        about: '/about',
        contact: '/contact'
      };
      window.open(urls[page], '_blank');
    } else {
      // For native, use the callback
      onLegalPageRequest?.(page);
    }
  };

  return (
    <View style={{
      paddingHorizontal: 12,
      paddingVertical: 12,
      paddingTop: 20, // Extra spacing from game content above
      backgroundColor: 'transparent',
      opacity: 0.6,
    }}>
      {/* Compact copyright and legal links in one line */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <Text style={{
          fontSize: 9,
          color: theme.colors.onSurfaceVariant,
          opacity: 0.5,
        }}>
          © 2025 Galaxy Brain Entertainment
        </Text>
        
        <Text style={{ fontSize: 9, color: theme.colors.onSurfaceVariant, opacity: 0.4 }}>•</Text>
        
        <Pressable 
          onPress={() => handleLegalLinkPress('terms')}
          style={{ padding: 2 }} // Minimal touch target
        >
          <Text style={{
            fontSize: 9,
            color: theme.colors.primary,
            opacity: 0.5,
          }}>
            Terms
          </Text>
        </Pressable>
        
        <Text style={{ fontSize: 9, color: theme.colors.onSurfaceVariant, opacity: 0.4 }}>•</Text>
        
        <Pressable 
          onPress={() => handleLegalLinkPress('privacy')}
          style={{ padding: 2 }} // Minimal touch target
        >
          <Text style={{
            fontSize: 9,
            color: theme.colors.primary,
            opacity: 0.5,
          }}>
            Privacy
          </Text>
        </Pressable>
        
        <Text style={{ fontSize: 9, color: theme.colors.onSurfaceVariant, opacity: 0.4 }}>•</Text>
        
        <Pressable 
          onPress={() => handleLegalLinkPress('about')}
          style={{ padding: 2 }} // Minimal touch target
        >
          <Text style={{
            fontSize: 9,
            color: theme.colors.primary,
            opacity: 0.5,
          }}>
            About
          </Text>
        </Pressable>
      </View>
    </View>
  );
}; 