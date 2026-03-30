import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const COLORS = {
  PRIMARY: '#3498db',
  SECONDARY: '#f1c40f',
  WHITE: '#ffffff',
  BLACK: '#000000',
};

type LoadingSpinnerProps = {
  size?: number | 'small' | 'large';
  color?: 'primary' | 'secondary' | 'white' | 'black';
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = 'primary',
}) => {
  const validSizes: (number | 'small' | 'large')[] = ['small', 'large'];
  const spinnerSize: number | 'small' | 'large' =
    validSizes.includes(size as any)
      ? size
      : typeof size === 'number' && size > 0
      ? size
      : 'large';

  const colorMap: { [key: string]: string } = {
    primary: COLORS.PRIMARY,
    secondary: COLORS.SECONDARY,
    white: COLORS.WHITE,
    black: COLORS.BLACK,
  };

  const spinnerColor = colorMap[color] || COLORS.PRIMARY;

  return (
    <View style={styles.container}>
      <ActivityIndicator size={(size as any)} color={spinnerColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingSpinner;