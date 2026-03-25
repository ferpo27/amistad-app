// @ts-nocheck

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface Props {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

const ThemedText: React.FC<Props> = ({
  children,
  style,
  numberOfLines,
  ellipsizeMode,
}) => {
  return (
    <Text
      style={[
        styles.text,
        style,
        numberOfLines && { numberOfLines },
        ellipsizeMode && { ellipsizeMode },
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: colors.accent + '33',
  },
});

export default ThemedText;