import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { auth } from '../firebase';

interface Props {
  // Agregar props si es necesario
}

const ComponenteQueUtilizaAuthListener: React.FC<Props> = () => {
  const authListener = auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('Usuario autenticado:', user);
    } else {
      console.log('Usuario no autenticado');
    }
  });

  useEffect(() => {
    return () => {
      if (authListener) {
        authListener();
      }
    };
  }, [authListener]);

  return (
    <View>
      <Text>Componente que utiliza auth listener</Text>
    </View>
  );
};

export default ComponenteQueUtilizaAuthListener;