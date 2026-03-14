// app/tabs/settings.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useUser } from '../hooks/useUser';

const BlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const { user } = useUser();

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      const response = await fetch('/api/blocked-users');
      const data = await response.json();
      setBlockedUsers(data);
    };
    fetchBlockedUsers();
  }, []);

  const handleBlockUser = (id: string) => {
    // Implementar lógica para bloquear usuario
  };

  const handleUnblockUser = (id: string) => {
    // Implementar lógica para desbloquear usuario
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Usuarios bloqueados</Text>
      <FlatList
        data={blockedUsers}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.actions}>
              <Text style={styles.action} onPress={() => handleBlockUser(item.id)}>
                Bloquear
              </Text>
              <Text style={styles.action} onPress={() => handleUnblockUser(item.id)}>
                Desbloquear
              </Text>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  name: {
    fontSize: 18,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  action: {
    padding: 10,
    backgroundColor: '#4CAF50',
    color: '#fff',
    borderRadius: 5,
  },
});

export default BlockedUsers;