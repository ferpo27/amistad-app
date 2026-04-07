import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { default as chatStorage } from '../../src/storage/chatStorage';
import { useRouter } from 'expo-router';
import { useThemeMode } from '../../src/theme';

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { colors } = useThemeMode();
  const router = useRouter();

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await chatStorage.getMessages('chatId');
        setMessages(msgs ?? []);
      } catch (e) {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await chatStorage.saveMessage('chatId', newMessage);
    setNewMessage('');
    const msgs = await chatStorage.getMessages('chatId');
    setMessages(msgs ?? []);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={{ padding: 12, marginHorizontal: 16, marginVertical: 4, backgroundColor: colors.card, borderRadius: 8 }}>
            <Text style={{ color: colors.text }}>{item}</Text>
          </View>
        )}
        keyExtractor={(_, index) => index.toString()}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: colors.secondary }}>No hay mensajes aún</Text>
          </View>
        }
      />
      <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        <TextInput
          style={{ flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: colors.text, marginRight: 8 }}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Escribí un mensaje..."
          placeholderTextColor={colors.secondary}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={{ backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Chat;