import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  // Agregar props si es necesario
}

const ComponenteQueUtilizaAccentSoft: React.FC<Props> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Componente que utiliza accentSoft</Text>
      <View style={[styles.box, { backgroundColor: colors.accentSoft + '33' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
  box: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
});

export default ComponenteQueUtilizaAccentSoft;