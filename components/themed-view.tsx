import { View, type ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  borderWidth?: number;
  borderColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, borderWidth = 0, borderColor = 'black', ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  if (!backgroundColor) {
    throw new Error('useThemeColor devolvió null o undefined');
  }

  return (
    <View
      style={[{
        backgroundColor,
        borderWidth,
        borderColor,
      }, style]}
      {...otherProps}
    />
  );
}