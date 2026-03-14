import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Onboarding = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [nativeLang, setNativeLang] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [interests, setInterests] = useState('');
  const [learning, setLearning] = useState('');
  const navigation = useNavigation();

  const handleSignUp = async () => {
    try {
      // Simulación de éxito
      Alert.alert('Éxito', 'Usuario creado con éxito');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      Alert.alert('Error', 'Error al crear usuario');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registro</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="País"
        value={country}
        onChangeText={setCountry}
      />
      <TextInput
        style={styles.input}
        placeholder="Ciudad"
        value={city}
        onChangeText={setCity}
      />
      <TextInput
        style={styles.input}
        placeholder="Idioma nativo"
        value={nativeLang}
        onChangeText={setNativeLang}
      />
      <TextInput
        style={styles.input}
        placeholder="Biografía"
        value={bio}
        onChangeText={setBio}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="URL de foto"
        value={photoUrl}
        onChangeText={setPhotoUrl}
      />
      <TextInput
        style={styles.input}
        placeholder="Intereses"
        value={interests}
        onChangeText={setInterests}
      />
      <TextInput
        style={styles.input}
        placeholder="Aprendiendo"
        value={learning}
        onChangeText={setLearning}
      />
      <Button title="Registrarse" onPress={handleSignUp} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
});

export default Onboarding;