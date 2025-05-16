// Icon mapping for the app
// This will be expanded with actual icons later

export const ICONS = {
  HOME: 'home',
  PLAY: 'play',
  STATS: 'bar-chart',
  SETTINGS: 'settings',
  SHARE: 'share',
  BACK: 'arrow-back',
  REFRESH: 'refresh',
  HINT: 'lightbulb',
  INFO: 'info',
  CLOSE: 'close',
};

export type IconName = keyof typeof ICONS;

// This will be replaced with actual implementation
export const getIconForPlatform = (name: IconName): string => {
  return ICONS[name];
}; 