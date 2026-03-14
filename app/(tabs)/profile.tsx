import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { updateProfile } from '../../src/storage';

const Profile = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getProfile();
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone);
      setBio(profile.bio);
    };
    loadProfile();
  }, []);

  const getProfile = async () => {
    return {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      bio: 'Este es un ejemplo de bio',
    };
  };

  const updateProfileHandler = async () => {
    try {
      await updateProfile({ name, email, phone, bio });
      Alert.alert('Perfil actualizado con éxito');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error al actualizar perfil');
    }
  };

  return (
    <View>
      <Text>Perfil</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nombre"
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Correo electrónico"
      />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Teléfono"
      />
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Bio"
      />
      <Button title="Actualizar perfil" onPress={updateProfileHandler} />
    </View>
  );
};

export default Profile;