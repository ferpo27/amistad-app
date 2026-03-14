import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Props for LoadingSpinner component.
 * @param size - Size of the spinner. Accepts 'small', 'large' or a numeric value.
 * @param color - Color of the spinner.
 */
 type LoadingSpinnerProps = {
   size?: number | 'small' | 'large';
   color?: string;
 };

/**
 * Reusable loading spinner component.
 * Shows a centered ActivityIndicator.
 */
 const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
   size = 'large',
   color = '#000',
 }) => {
   // Runtime validation: ensure size is one of the accepted values.
   const validSizes: (number | 'small' | 'large')[] = ['small', 'large'];
   const spinnerSize: number | 'small' | 'large' =
     validSizes.includes(size as any)
       ? size
       : typeof size === 'number' && size > 0
       ? size
       : 'large';

   const spinnerColor = typeof color === 'string' ? color : '#000';

   return (
     <View style={styles.container}>
       <ActivityIndicator size={spinnerSize} color={spinnerColor} />
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