import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getMessages, saveMessage } from '../../src/storage';
import { PRIMARY_COLOR, SECONDARY_COLOR } from '../../src/theme';

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await getMessages('chatId');
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
    await saveMessage('chatId', newMessage);
    setNewMessage('');
    const msgs = await getMessages('chatId');
    setMessages(msgs ?? []);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PRIMARY_COLOR }}>
        <ActivityIndicator color={SECONDARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PRIMARY_COLOR }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={{ padding: 12, marginHorizontal: 16, marginVertical: 4, backgroundColor: SECONDARY_COLOR, borderRadius: 8 }}>
            <Text style={{ color: PRIMARY_COLOR }}>{item}</Text>
          </View>
        )}
        keyExtractor={(_, index) => index.toString()}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: SECONDARY_COLOR }}>No hay mensajes aún</Text>
          </View>
        }
      />
      <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: PRIMARY_COLOR, backgroundColor: PRIMARY_COLOR }}>
        <TextInput
          style={{ flex: 1, backgroundColor: SECONDARY_COLOR, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: PRIMARY_COLOR, marginRight: 8 }}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Escribí un mensaje..."
          placeholderTextColor={SECONDARY_COLOR}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={{ backgroundColor: PRIMARY_COLOR, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Chat;