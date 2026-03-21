import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLOR_PRIMARY = '#3498db';
const COLOR_SECONDARY = '#f1c40f';
const COLOR_TYPING_INDICATOR = '#95a5a6';

const TypingIndicator = () => {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>Escribiendo...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
  },
  bubble: {
    backgroundColor: COLOR_TYPING_INDICATOR,
    padding: 10,
    borderRadius: 10,
  },
  text: {
    fontSize: 14,
    color: COLOR_PRIMARY,
  },
});

export default TypingIndicator;