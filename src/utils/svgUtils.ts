/**
 * Utility function to check if an object has any touchable properties
 * @param props The props object to check
 * @returns boolean indicating if the object has any touchable properties
 */
export function hasTouchableProperty(props: any): boolean {
  if (!props) return false;
  // This is a simplified check based on common touchable props.
  // The actual list of all touchable props in react-native-svg is more extensive,
  // but these are the most common ones related to basic touch interaction.
  const relevantProps = ['onPress', 'onPressIn', 'onPressOut', 'onLongPress', 'disabled'];
  for (const p of relevantProps) {
    // Check if the prop exists on the props object
    if (typeof props[p] !== 'undefined') {
      return true;
    }
  }
  return false;
} 